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
   * Bucket prefix. Routes that share a backend cost share a name —
   * agent-stream and recommend both use "course-agent" so one IP can't
   * double its LLM budget by alternating endpoints.
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
 * Shared per-IP budget for the two public LLM course-planner endpoints
 * (/api/courses/agent-stream and /api/courses/recommend). Each request
 * fans out to 2+ LLM calls plus catalog/RMP scraping, so the budget is
 * deliberately tight: 5/min absorbs a real user iterating on interests,
 * 30/day caps sustained key-burning from a single IP.
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
