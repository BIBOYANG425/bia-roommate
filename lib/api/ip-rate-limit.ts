// Per-IP rate limiting for PUBLIC (unauthenticated) API routes. Wraps
// lib/rate-limit.ts (in-memory, per-instance, resets on cold start — v1
// posture, same as authed-handler) with client-IP derivation and
// multi-window (per-minute / per-day) enforcement. Lives here, not in
// route files, because Next.js 16 route files may only export handlers.
// Header last reviewed: 2026-06-11

import { NextResponse } from "next/server";
import {
  checkRateLimit,
  type RateLimitResult,
} from "@/lib/rate-limit";

/**
 * Derives the client IP for rate-limit bucketing. On Vercel the first hop
 * of x-forwarded-for is the client as seen by the edge; fall back to
 * cf-connecting-ip / x-real-ip. When no header exists (local dev, tests)
 * everyone shares the "unknown" bucket — strict but safe: an
 * unattributable caller shouldn't get an unlimited LLM budget.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export interface IpRateLimitWindow {
  /** Bucket suffix distinguishing windows on the same route, e.g. "minute". */
  id: string;
  /** Max requests allowed inside the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface IpRateLimitOptions {
  /**
   * Bucket prefix. Paths that share a backend cost class share a name —
   * agent-stream and recommend's LLM mode both use "course-agent" so one
   * IP can't double its LLM budget by alternating endpoints, while
   * recommend's keyword-only free mode uses its own "course-free" bucket.
   */
  name: string;
  windows: IpRateLimitWindow[];
  /** Friendly message for the 429 body, matching the route's error style. */
  message: string;
  /** Extra headers merged into the 429 (e.g. CORS headers). */
  headers?: Record<string, string>;
}

/**
 * Returns a 429 JSON response if the caller exceeded ANY window, else null.
 * Every attempt counts against every window — including rejected attempts —
 * i.e. limits gate attempts, not successes (matches lib/rate-limit.ts).
 */
export function enforceIpRateLimit(
  request: Request,
  opts: IpRateLimitOptions,
): Response | null {
  const ip = getClientIp(request);

  let blocked: RateLimitResult | null = null;
  for (const w of opts.windows) {
    const result = checkRateLimit(`${opts.name}:${w.id}:${ip}`, {
      limit: w.limit,
      windowMs: w.windowMs,
    });
    if (!result.allowed && (!blocked || result.resetAt > blocked.resetAt)) {
      blocked = result;
    }
  }
  if (!blocked) return null;

  const retryAfterSec = Math.max(
    1,
    Math.ceil((blocked.resetAt - Date.now()) / 1000),
  );
  return NextResponse.json(
    { error: opts.message },
    {
      status: 429,
      headers: {
        ...opts.headers,
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(blocked.resetAt),
      },
    },
  );
}

/**
 * Shared per-IP budget for the LLM-cost paths of the public course-planner
 * endpoints: /api/courses/agent-stream (always LLM) and
 * /api/courses/recommend with mode !== "free". Each such request fans out
 * to 2+ LLM calls plus catalog/RMP scraping, so the budget is deliberately
 * tight: 5/min absorbs a real user iterating on interests, 30/day caps
 * sustained key-burning from a single IP. The zero-LLM-cost path
 * (recommend with mode:"free") deliberately does NOT share this bucket —
 * see enforceCourseFreeRateLimit.
 */
export function enforceCourseAgentRateLimit(
  request: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  return enforceIpRateLimit(request, {
    name: "course-agent",
    windows: [
      { id: "minute", limit: 5, windowMs: 60_000 },
      { id: "day", limit: 30, windowMs: 86_400_000 },
    ],
    message:
      "Too many AI searches from your network — wait a minute and try again.",
    headers: corsHeaders,
  });
}

/**
 * Loose per-IP budget for the zero-LLM-cost path: /api/courses/recommend
 * with mode:"free" (keyword matching only — burns no LLM keys). 60/min is
 * enough to stop scraping floods while staying invisible to legitimate
 * shared-egress callers: the LIVE George bot relays every bot user's
 * course search from ONE egress IP (george/src/tools/recommend-courses.ts
 * POSTs here with mode:"free"), and a campus NAT puts a whole dorm behind
 * one address. No daily cap — the 30/day window on the LLM paths exists to
 * cap key burn, which this path cannot cause.
 */
export function enforceCourseFreeRateLimit(
  request: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  return enforceIpRateLimit(request, {
    name: "course-free",
    windows: [{ id: "minute", limit: 60, windowMs: 60_000 }],
    message:
      "Too many searches from your network — wait a minute and try again.",
    headers: corsHeaders,
  });
}
