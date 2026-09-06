/**
 * Free Surf Calorie Tracker — Cloudflare Worker
 * Proxies food photos → consolidated AI pod (vision) for identification + macro estimation.
 */
export interface Env {
  POD_URL: string;
  TOGETHER_API_KEY?: string;
  TOGETHER_MODEL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  USAGE_METERING?: string;
  CALORIE_WEEKLY_LIMIT?: string;
}

const CALORIE_METRIC = "calorie_requests";
const DEFAULT_WEEKLY_LIMIT = 10;

function srHeaders(env: Env): Record<string, string> {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY || "", Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || ""}` };
}
function weekStartIso(now: Date): string {
  const day = (now.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day)).toISOString().slice(0, 10);
}
async function authedUserId(env: Env, authHeader: string): Promise<string | null> {
  if (!authHeader.startsWith("Bearer ") || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authHeader } });
    if (!res.ok) return null;
    return ((await res.json()) as { id?: string })?.id || null;
  } catch { return null; }
}
async function readUsage(env: Env, userId: string, metric: string, week: string): Promise<number> {
  try {
    const q = new URLSearchParams({ user_id: `eq.${userId}`, metric: `eq.${metric}`, week_start: `eq.${week}`, select: "count" });
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/usage?${q.toString()}`, { headers: srHeaders(env) });
    if (!res.ok) return 0;
    return Number(((await res.json()) as any[])?.[0]?.count) || 0;
  } catch { return 0; }
}
async function incrementUsage(env: Env, userId: string, metric: string, week: string, delta: number): Promise<number> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/meter_usage`, {
    method: "POST", headers: { ...srHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({ p_user_id: userId, p_metric: metric, p_week: week, p_delta: delta }),
  });
  if (!res.ok) return 0;
  const n = Number(await res.text());
  return Number.isFinite(n) ? n : 0;
}

// Nutrition prompt shared with the self-hosted pod (kept identical so output matches).
const NUTRITION_SYSTEM_PROMPT = `You are a nutrition database. Respond with ONLY a JSON array. No text before or after.

Format: [{"name":"food","amount":1,"unit":"whole","protein":30,"carbs":40,"fat":30}]

RULES:
- FIRST character must be [
- LAST character must be ]
- NO markdown, NO explanation, NO "Here is...", NO notes
- Units: whole (single items), cup, oz, g, tbsp, tsp, slice, piece, bowl
- Calories are NOT needed — they are calculated from macros`;

// Detect the MIME type of a base64 image from its leading signature bytes so we can
// build a correct data: URI for vision APIs.
function sniffImageMime(base64: string): string {
  if (/^\/9j/.test(base64)) return "image/jpeg";          // JPEG
  if (/^iVBORw0KGgo/.test(base64)) return "image/png";     // PNG
  if (/^UklGR/.test(base64)) return "image/webp";          // WEBP (RIFF)
  if (/^R0lGOD/.test(base64)) return "image/gif";          // GIF
  return "image/jpeg";
}

function calcCalories(items: any[]): any[] {
  return items.map((it) => {
    const p = Number(it?.protein) || 0;
    const c = Number(it?.carbs) || 0;
    const f = Number(it?.fat) || 0;
    return { ...it, calories: Math.round(p * 4 + c * 4 + f * 9) };
  });
}

function parseItems(text: string): any[] | null {
  const clean = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    return parsed.map((it) => (typeof it === "object" && it ? it : null)).filter(Boolean);
  } catch {
    return null;
  }
}

async function analyzeWithTogether(
  imageBase64: string,
  foodDescription: string,
  env: Env
): Promise<{ items: any[] }> {
  const model = env.TOGETHER_MODEL || "zai-org/glm-5.3-flash";
  const content: any[] = [];
  if (imageBase64) {
    content.push({ type: "image_url", image_url: { url: `data:${sniffImageMime(imageBase64)};base64,${imageBase64}` } });
    content.push({ type: "text", text: "What are the nutrition facts for each food in this photo?" });
  } else {
    content.push({ type: "text", text: `Estimate nutrition for: ${foodDescription}` });
  }

  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TOGETHER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 800,
      messages: [{ role: "system", content: NUTRITION_SYSTEM_PROMPT }, { role: "user", content }],
    }),
  });
  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `Together error ${res.status}`);
  }
  const contentText = data?.choices?.[0]?.message?.content || "";
  const items = parseItems(contentText);
  if (!items) {
    throw new Error("Model did not return valid JSON");
  }
  return { items: calcCalories(items) };
}

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8081",
  "https://freesurf.tools",
];

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.some(
    (o) => origin === o || origin.startsWith("exp://") || origin.startsWith("http://localhost")
  );
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function htmlResponse(html: string, headers: Record<string, string>) {
  return new Response(html, { status: 200, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}

const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>AI Calorie Tracker · Free Surf</title>
<meta name="description" content="Photograph your meal and get an instant estimate of calories, protein, carbs, and fat."/>
<style>
  :root { color-scheme: light dark; --bg:#ffffff; --text:#1d1b18; --muted:#8a8178; --brand:#1d1b18; --border:#e6e4df; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0a0a0c; --text:#fff; --muted:#8b8b9a; --brand:#6b8cff; --border:#2c2c3a; } }
  * { box-sizing:border-box; }
  body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--text); }
  .wrap { max-width:880px; margin:0 auto; padding:64px 24px; }
  .logo { font-weight:700; text-decoration:none; color:var(--text); }
  h1 { font-size:44px; line-height:1.1; margin:40px 0 12px; }
  .lede { font-size:18px; color:var(--muted); margin:0 0 28px; }
  .phone { border:2px dashed var(--border); border-radius:20px; height:300px; display:flex; align-items:center; justify-content:center; color:var(--muted); margin:32px 0; }
  .stores { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:40px; }
  .store { text-decoration:none; padding:12px 20px; border-radius:10px; border:1.5px solid var(--border); color:var(--text); font-weight:600; }
  .store.play { background:var(--brand); color:#fff; border-color:var(--brand); }
  .store.soon { opacity:.55; cursor:default; }
  footer { margin-top:48px; padding-top:20px; border-top:1px solid var(--border); color:var(--muted); font-size:14px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  footer a { color:var(--muted); text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <a class="logo" href="https://freesurf.tools">Free Surf</a>
  <h1>AI Calorie Tracker</h1>
  <p class="lede">Snap a photo of your meal and get an instant estimate of calories, protein, carbs, and fat — no manual logging.</p>
  <div class="phone">Phone screenshots coming soon</div>
  <div class="stores">
    <a class="store play" href="https://play.google.com/store/apps/details?id=tools.Free Surf.calorietracker" target="_blank" rel="noopener">Get it on Google Play</a>
    <span class="store soon">App Store · Upcoming</span>
  </div>
  <footer>
    <span>&copy; <span id="year"></span> Free Surf · Free tools, no bullshit.</span>
    <a href="https://feedfree.tech" target="_blank" rel="noopener">Feedfree Digest</a>
  </footer>
</div>
<script>document.getElementById('year').textContent=new Date().getFullYear()</script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // Landing page for browsers; keep the API on /api/analyze.
    if (request.method === "GET") {
      if (url.pathname === "/sitemap.xml") {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://calories.freesurf.tools/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>`;
        return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml" } });
      }
      // Usage meter — how much of the weekly allowance is left.
      if (url.pathname === "/api/usage") {
        if (env.USAGE_METERING !== "on" || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_URL) {
          return jsonResponse({ error: "Usage metering not configured" }, 500, headers);
        }
        const userId = await authedUserId(env, request.headers.get("Authorization") || "");
        if (!userId) return jsonResponse({ error: "Unauthorized" }, 401, headers);
        const week = weekStartIso(new Date());
        const limit = Math.max(0, Number(env.CALORIE_WEEKLY_LIMIT) || DEFAULT_WEEKLY_LIMIT);
        const used = await readUsage(env, userId, CALORIE_METRIC, week);
        return jsonResponse({ usage: { metric: CALORIE_METRIC, used, limit, reset: week } }, 200, headers);
      }
      return htmlResponse(LANDING_HTML, headers);
    }

    if (request.method !== "POST" || url.pathname !== "/api/analyze") {
      return jsonResponse({ error: "Not found" }, 404, headers);
    }

    if (!env.POD_URL && !env.TOGETHER_API_KEY) {
      return jsonResponse({ error: "Service not configured" }, 500, headers);
    }

    // Weekly free-allowance gate (only active when Supabase metering is configured).
    if (env.USAGE_METERING === "on" && env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_URL) {
      const userId = await authedUserId(env, request.headers.get("Authorization") || "");
      if (!userId) return jsonResponse({ error: "Please sign in to use the calorie tracker." }, 401, headers);
      const week = weekStartIso(new Date());
      const limit = Math.max(0, Number(env.CALORIE_WEEKLY_LIMIT) || DEFAULT_WEEKLY_LIMIT);
      const used = await readUsage(env, userId, CALORIE_METRIC, week);
      if (used >= limit) {
        return jsonResponse(
          { error: "Weekly limit reached — upgrade or try again next week.", usage: { metric: CALORIE_METRIC, used, limit, reset: week } },
          429,
          headers
        );
      }
      await incrementUsage(env, userId, CALORIE_METRIC, week, 1);
    }

    try {
      const body = (await request.json()) as { image_base64?: string; food_description?: string };
      if (!body.image_base64 && !body.food_description) {
        return jsonResponse({ error: "No image or description provided" }, 400, headers);
      }

      // Hosted Together AI path (vision LLM). Falls back to the self-hosted pod when
      // no key is set, so this is a safe per-app flag.
      if (env.TOGETHER_API_KEY) {
        const data = await analyzeWithTogether(body.image_base64 || "", body.food_description || "", env);
        return jsonResponse(data, 200, headers);
      }

      const podRes = await fetch(env.POD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_type: "analyze", image_base64: body.image_base64 || "", food_description: body.food_description || "" }),
      });

      const podData = (await podRes.json()) as { items?: unknown[]; error?: string };

      if (!podRes.ok || podData.error) {
        return jsonResponse({ error: podData.error || "Analysis failed" }, podRes.status || 500, headers);
      }

      return jsonResponse(podData, 200, headers);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Internal server error";
      return jsonResponse({ error: msg }, 500, headers);
    }
  },
};
