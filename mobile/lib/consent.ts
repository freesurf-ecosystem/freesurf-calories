import { WORKER_URL } from "./config";
import { getDeviceId } from "./device";

export const CONSENT_VERSION = "2026-09-09";

/**
 * Fire-and-forget consent record. The worker keys it by account id (if signed in) or
 * 'anon:<deviceId>'. Never blocks the UI and never throws.
 */
export async function recordConsent(type = "terms", version = CONSENT_VERSION): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await fetch(`${WORKER_URL}/api/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
      body: JSON.stringify({ type, version }),
    });
  } catch {}
}
