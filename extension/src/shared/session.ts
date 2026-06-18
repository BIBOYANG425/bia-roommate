// Pure, chrome-free session helpers shared by the extension's auth module. The
// /auth/extension page hands the Supabase session back in the redirect URL
// fragment; these parse it, check expiry, and read the signed-in email from the
// access token. No chrome.* here, so they're unit-testable.
//
// Header last reviewed: 2026-06-17

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
}

/** Parse the Supabase session from a launchWebAuthFlow redirect URL fragment. */
export function parseSessionFromRedirectUrl(redirectUrl: string): StoredSession | null {
  let hash: string;
  try {
    hash = new URL(redirectUrl).hash;
  } catch {
    return null;
  }
  if (!hash.startsWith("#")) return null;
  const p = new URLSearchParams(hash.slice(1));
  const access_token = p.get("access_token");
  const refresh_token = p.get("refresh_token");
  const expires_at = Number(p.get("expires_at"));
  if (!access_token || !refresh_token || !Number.isFinite(expires_at) || expires_at <= 0) {
    return null;
  }
  return { access_token, refresh_token, expires_at };
}

/** True if the session is at/past expiry (with a clock-skew margin, seconds). */
export function isSessionExpired(
  session: StoredSession,
  nowSec: number,
  skewSec = 60,
): boolean {
  return session.expires_at <= nowSec + skewSec;
}

/** Decode the `email` claim from a Supabase access token (JWT). Null if unreadable. */
export function decodeJwtEmail(accessToken: string): string | null {
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload)) as { email?: string };
    return typeof claims.email === "string" ? claims.email : null;
  } catch {
    return null;
  }
}
