/**
 * Sliding-window limiter for the AI course agent stream. Time is injected so
 * the window behavior is deterministic without real clocks.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  checkAgentRateLimit,
  clientIpFromHeaders,
  __resetAgentRateLimit,
} from "@/app/api/courses/agent-stream/rate-limit";

const opts = { limit: 10, windowMs: 10 * 60 * 1000 }; // 10 req / 10 min

describe("checkAgentRateLimit — sliding window", () => {
  beforeEach(() => __resetAgentRateLimit());

  it("allows the first `limit` requests then blocks the next", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) {
      const r = checkAgentRateLimit("1.2.3.4", t0 + i, opts);
      expect(r.allowed).toBe(true);
    }
    const blocked = checkAgentRateLimit("1.2.3.4", t0 + 11, opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("lets requests through again once the oldest hit slides out of the window", () => {
    const t0 = 5_000_000;
    for (let i = 0; i < 10; i++) checkAgentRateLimit("9.9.9.9", t0 + i, opts);
    // Still blocked just before the first hit expires.
    expect(checkAgentRateLimit("9.9.9.9", t0 + opts.windowMs - 1, opts).allowed).toBe(
      false,
    );
    // Once the first hit is older than the window, a slot frees up.
    expect(
      checkAgentRateLimit("9.9.9.9", t0 + opts.windowMs + 1, opts).allowed,
    ).toBe(true);
  });

  it("does not count blocked attempts against the window (no perpetual lockout)", () => {
    const t0 = 7_000_000;
    for (let i = 0; i < 10; i++) checkAgentRateLimit("2.2.2.2", t0 + i, opts);
    // Hammer while blocked — these must not push the window forward.
    for (let i = 0; i < 5; i++)
      checkAgentRateLimit("2.2.2.2", t0 + 100 + i, opts);
    // The 10 original hits still expire on their original schedule.
    expect(
      checkAgentRateLimit("2.2.2.2", t0 + opts.windowMs + 2, opts).allowed,
    ).toBe(true);
  });

  it("keeps separate buckets per IP", () => {
    const t0 = 8_000_000;
    for (let i = 0; i < 10; i++) checkAgentRateLimit("a", t0 + i, opts);
    expect(checkAgentRateLimit("a", t0 + 11, opts).allowed).toBe(false);
    // Different IP is unaffected.
    expect(checkAgentRateLimit("b", t0 + 11, opts).allowed).toBe(true);
  });
});

describe("clientIpFromHeaders", () => {
  it("takes the first entry of x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" });
    expect(clientIpFromHeaders(h)).toBe("5.6.7.8");
  });

  it("falls back to x-real-ip then 'unknown'", () => {
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "4.4.4.4" }))).toBe(
      "4.4.4.4",
    );
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});
