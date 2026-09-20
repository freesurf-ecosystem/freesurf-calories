/**
 * FreeSurf Calorie Tracker — Cloudflare Worker
 * Proxies food photos → consolidated AI pod (vision) for identification + macro estimation.
 */
export interface Env {
  POD_URL: string;
  TOGETHER_API_KEY?: string;
  TOGETHER_MODEL?: string;
  // Multilingual text model used to translate English food names into the user's language.
  TOGETHER_TRANSLATE_MODEL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  USAGE_METERING?: string;
  CALORIE_MONTHLY_LIMIT?: string;
  // RevenueCat secret API key (Cloudflare secret). When set, the worker verifies the
  // user's Pro entitlement server-side by device id and lets Pro bypass the allowance.
  REVENUECAT_SECRET_KEY?: string;
}

const CALORIE_METRIC = "calorie_requests";
const CALORIE_ENTITLEMENT = "pro_calories";
const CONSENT_VERSION = "2026-09-09";
const DEFAULT_MONTHLY_LIMIT = 30;

function srHeaders(env: Env): Record<string, string> {
  return { apikey: env.SUPABASE_SECRET_KEY || "", Authorization: `Bearer ${env.SUPABASE_SECRET_KEY || ""}` };
}
function monthStartIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
async function authedUserId(env: Env, authHeader: string): Promise<string | null> {
  if (!authHeader.startsWith("Bearer ") || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authHeader } });
    if (!res.ok) return null;
    return ((await res.json()) as { id?: string })?.id || null;
  } catch { return null; }
}
async function resolveUserId(env: Env, request: Request): Promise<string | null> {
  const authed = await authedUserId(env, request.headers.get("Authorization") || "");
  if (authed) return authed;
  const deviceId = request.headers.get("X-Device-Id")?.trim();
  return deviceId ? `anon:${deviceId}` : null;
}
async function readUsage(env: Env, userId: string, metric: string, period: string): Promise<number> {
  try {
    const q = new URLSearchParams({ user_id: `eq.${userId}`, metric: `eq.${metric}`, period_start: `eq.${period}`, select: "count" });
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/usage?${q.toString()}`, { headers: srHeaders(env) });
    if (!res.ok) return 0;
    return Number(((await res.json()) as any[])?.[0]?.count) || 0;
  } catch { return 0; }
}
async function incrementUsage(env: Env, userId: string, metric: string, period: string, delta: number): Promise<number> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/meter_usage`, {
    method: "POST", headers: { ...srHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({ p_user_id: userId, p_metric: metric, p_period: period, p_delta: delta }),
  });
  if (!res.ok) return 0;
  const n = Number(await res.text());
  return Number.isFinite(n) ? n : 0;
}

// Server-side RevenueCat entitlement check by app_user_id (= device id).
async function rcIsPro(env: Env, appUserId: string): Promise<boolean> {
  if (!env.REVENUECAT_SECRET_KEY) return false;
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}`, Accept: "application/json" } }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as {
      subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> };
    };
    const ent = data.subscriber?.entitlements?.[CALORIE_ENTITLEMENT];
    if (!ent) return false;
    if (!ent.expires_date) return true;
    return new Date(ent.expires_date).getTime() > Date.now();
  } catch {
    return false;
  }
}

function deviceIdOf(request: Request): string {
  return request.headers.get("X-Device-Id")?.trim() || "";
}

// Records a consent acceptance (append-only audit) keyed by the resolved user id.
async function recordConsent(env: Env, userId: string, type: string, version: string): Promise<boolean> {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/consents`, {
      method: "POST",
      headers: { ...srHeaders(env), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, type, version }),
    });
    return res.ok;
  } catch {
    return false;
  }
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

// App language codes → English language names (used only for the translation prompt).
const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", pt: "Portuguese", hi: "Hindi", id: "Indonesian",
  ms: "Malay", th: "Thai", vi: "Vietnamese", tl: "Filipino", de: "German",
  fr: "French", it: "Italian", nl: "Dutch", pl: "Polish", sv: "Swedish",
  no: "Norwegian", da: "Danish", fi: "Finnish", cs: "Czech", el: "Greek",
  ro: "Romanian", hu: "Hungarian", uk: "Ukrainian", ru: "Russian", ar: "Arabic",
  bn: "Bengali", ur: "Urdu", mr: "Marathi", te: "Telugu", ta: "Tamil",
  fa: "Persian", tr: "Turkish", ko: "Korean", ja: "Japanese", zh: "Chinese",
  ha: "Hausa",
};

function parseStringArray(text: string): string[] | null {
  const clean = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    return parsed.map((x) => String(x));
  } catch {
    return null;
  }
}

// Food detection stays in English (the vision model is only reliable in en/zh); this
// second pass localizes just the food names with a broadly multilingual text model.
async function translateNames(names: string[], lang: string, env: Env): Promise<string[]> {
  const language = LANG_NAMES[lang];
  if (!env.TOGETHER_API_KEY || !names.length || lang === "en" || !language) return names;
  try {
    const model = env.TOGETHER_TRANSLATE_MODEL || "Qwen/Qwen3.5-9B";
    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.TOGETHER_API_KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate each food name into ${language}. Use the short, natural name a native speaker would say. Respond with ONLY a JSON array of strings in the same order. No explanation, no notes.`,
          },
          { role: "user", content: JSON.stringify(names) },
        ],
      }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) return names;
    const parsed = parseStringArray(data?.choices?.[0]?.message?.content || "");
    if (!parsed || parsed.length !== names.length) return names;
    return parsed;
  } catch {
    return names;
  }
}

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
  lang: string,
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
  const calculated = calcCalories(items);
  const names = await translateNames(calculated.map((it) => String(it?.name || "")), lang, env);
  const localized = calculated.map((it, i) => ({ ...it, name: names[i] || it.name }));
  return { items: localized };
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
<title>AI Calorie Tracker · FreeSurf</title>
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
  <a class="logo" href="https://freesurf.tools">FreeSurf</a>
  <h1>AI Calorie Tracker</h1>
  <p class="lede">Snap a photo of your meal and get an instant estimate of calories, protein, carbs, and fat — no manual logging.</p>
  <div class="phone">Phone screenshots coming soon</div>
  <div class="stores">
    <a class="store play" href="https://play.google.com/store/apps/details?id=tools.freesurf.calorietracker" target="_blank" rel="noopener">Get it on Google Play</a>
    <span class="store soon">App Store · Upcoming</span>
  </div>
  <footer>
    <span>&copy; <span id="year"></span> FreeSurf · Free tools, no bullshit.</span>
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
      // Usage meter — how much of the monthly allowance is left.
      if (url.pathname === "/api/usage") {
        if (env.USAGE_METERING !== "on" || !env.SUPABASE_SECRET_KEY || !env.SUPABASE_URL) {
          return jsonResponse({ error: "Usage metering not configured" }, 500, headers);
        }
        const userId = await resolveUserId(env, request);
        if (!userId) return jsonResponse({ error: "Missing device id" }, 401, headers);
        const deviceId = deviceIdOf(request);
        const isPro = deviceId ? await rcIsPro(env, deviceId) : false;
        const period = monthStartIso(new Date());
        const limit = Math.max(0, Number(env.CALORIE_MONTHLY_LIMIT) || DEFAULT_MONTHLY_LIMIT);
        const used = await readUsage(env, userId, CALORIE_METRIC, period);
        return jsonResponse({ isPro, usage: { metric: CALORIE_METRIC, used, limit, reset: period } }, 200, headers);
      }
      return htmlResponse(LANDING_HTML, headers);
    }

    // ── Consent record (POST /api/consent) — audit trail, anonymous or account keyed ──
    if (request.method === "POST" && url.pathname === "/api/consent") {
      if (env.USAGE_METERING !== "on" || !env.SUPABASE_SECRET_KEY || !env.SUPABASE_URL) {
        return jsonResponse({ ok: true }, 200, headers);
      }
      const userId = await resolveUserId(env, request);
      if (!userId) return jsonResponse({ error: "Missing device id" }, 401, headers);
      let body: { type?: string; version?: string } = {};
      try { body = (await request.json()) as { type?: string; version?: string }; } catch {}
      const ok = await recordConsent(env, userId, body.type || "terms", body.version || CONSENT_VERSION);
      return jsonResponse({ ok }, ok ? 200 : 500, headers);
    }

    if (request.method !== "POST" || url.pathname !== "/api/analyze") {
      return jsonResponse({ error: "Not found" }, 404, headers);
    }

    if (!env.POD_URL && !env.TOGETHER_API_KEY) {
      return jsonResponse({ error: "Service not configured" }, 500, headers);
    }

    // Monthly free-allowance gate (only active when Supabase metering is configured).
    if (env.USAGE_METERING === "on" && env.SUPABASE_SECRET_KEY && env.SUPABASE_URL) {
      const userId = await resolveUserId(env, request);
      if (!userId) return jsonResponse({ error: "Missing device id" }, 401, headers);
      const deviceId = deviceIdOf(request);
      const isPro = deviceId ? await rcIsPro(env, deviceId) : false;
      if (!isPro) {
        const period = monthStartIso(new Date());
        const limit = Math.max(0, Number(env.CALORIE_MONTHLY_LIMIT) || DEFAULT_MONTHLY_LIMIT);
        const used = await readUsage(env, userId, CALORIE_METRIC, period);
        if (used >= limit) {
          return jsonResponse(
            { error: "Monthly limit reached — try again next month.", usage: { metric: CALORIE_METRIC, used, limit, reset: period } },
            429,
            headers
          );
        }
        await incrementUsage(env, userId, CALORIE_METRIC, period, 1);
      }
    }

    try {
      const body = (await request.json()) as { image_base64?: string; food_description?: string; lang?: string };
      if (!body.image_base64 && !body.food_description) {
        return jsonResponse({ error: "No image or description provided" }, 400, headers);
      }

      // Hosted Together AI path (vision LLM). Falls back to the self-hosted pod when
      // no key is set, so this is a safe per-app flag.
      if (env.TOGETHER_API_KEY) {
        const data = await analyzeWithTogether(body.image_base64 || "", body.food_description || "", body.lang || "en", env);
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
