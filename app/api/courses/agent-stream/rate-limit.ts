/**
 * Per-IP sliding-window rate limiter for the AI course agent stream.
 *
 * The agent endpoint fans out several LLM calls plus catalog/RMP/Reddit
 * fetches per request, so it's the most expensive route in the app and needs
 * its own abuse guard. A sliding window (vs the app-wide fixed-window
 * `@/lib/rate-limit`) is used deliberately: it prevents the burst-across-
 * boundary hole where a client fires the fixed-window limit just before reset
 * and again just after, doubling the effective rate.
 *
 * In-memory, resets on cold start — acceptable at this scale. Lives in its own
 * module (not route.ts) because Next.js 16 rejects non-HTTP exports from route
 * files; both the route and the unit tests import from here.
 */

/** Max agent-stream requests allowed per IP within the window. */
export const AGENT_STREAM_LIMIT = 10;
/** Sliding window length: 10 minutes. */
export const AGENT_STREAM_WINDOW_MS = 10 * 60 * 1000;

// key (ip) → sorted list of request timestamps (ms) still inside the window.
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest in-window hit expires (0 when allowed). */
  retryAfterSeconds: number;
}

/**
 * Record a hit for `key` and report whether it's within the sliding window.
 * `now` is injectable so tests can advance time deterministically.
 */
export function checkAgentRateLimit(
  key: string,
  now: number = Date.now(),
  opts: { limit?: number; windowMs?: number } = {},
): RateLimitResult {
  const limit = opts.limit ?? AGENT_STREAM_LIMIT;
  const windowMs = opts.windowMs ?? AGENT_STREAM_WINDOW_MS;

  // Drop timestamps that have slid out of the window.
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    // Blocked: don't record this hit (so a hammering client can't push the
    // window forward forever). Retry once the oldest hit expires.
    hits.set(key, recent);
    const oldest = recent[0];
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test-only: clear all recorded hits so cases don't leak into each other. */
export function __resetAgentRateLimit(): void {
  hits.clear();
}

/** Best-effort client IP from proxy headers, falling back to a shared bucket. */
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
