// Tests for the public-route per-IP rate limiter: IP derivation order,
// multi-window enforcement, 429 shape (Retry-After + merged headers), and
// the shared course-agent budget. Uses unique bucket names per test since
// lib/rate-limit.ts keeps a module-level store.
// Header last reviewed: 2026-06-11

import { describe, it, expect } from "vitest";
import {
  getClientIp,
  enforceIpRateLimit,
  enforceCourseAgentRateLimit,
} from "../ip-rate-limit";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers,
  });
}

describe("getClientIp", () => {
  it("uses the first hop of x-forwarded-for", () => {
    const req = makeRequest({
      "x-forwarded-for": "203.0.113.7, 198.51.100.1",
    });
    expect(getClientIp(req)).toBe("203.0.113.7");
  });

  it("falls back to cf-connecting-ip then x-real-ip", () => {
    expect(getClientIp(makeRequest({ "cf-connecting-ip": "203.0.113.8" }))).toBe(
      "203.0.113.8",
    );
    expect(getClientIp(makeRequest({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to a constant key when no headers exist", () => {
    expect(getClientIp(makeRequest())).toBe("unknown");
  });
});

describe("enforceIpRateLimit", () => {
  it("allows requests under the limit and blocks above it", async () => {
    const name = `test-basic-${Date.now()}`;
    const opts = {
      name,
      windows: [{ id: "minute", limit: 2, windowMs: 60_000 }],
      message: "slow down",
    };
    const req = makeRequest({ "x-forwarded-for": "203.0.113.10" });

    expect(enforceIpRateLimit(req, opts)).toBeNull();
    expect(enforceIpRateLimit(req, opts)).toBeNull();

    const blocked = enforceIpRateLimit(req, opts);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(Number(blocked!.headers.get("Retry-After"))).toBeGreaterThan(0);
    const body = await blocked!.json();
    expect(body).toEqual({ error: "slow down" });
  });

  it("keeps separate buckets per IP", () => {
    const name = `test-per-ip-${Date.now()}`;
    const opts = {
      name,
      windows: [{ id: "minute", limit: 1, windowMs: 60_000 }],
      message: "slow down",
    };
    const reqA = makeRequest({ "x-forwarded-for": "203.0.113.11" });
    const reqB = makeRequest({ "x-forwarded-for": "203.0.113.12" });

    expect(enforceIpRateLimit(reqA, opts)).toBeNull();
    expect(enforceIpRateLimit(reqA, opts)).not.toBeNull();
    expect(enforceIpRateLimit(reqB, opts)).toBeNull();
  });

  it("blocks when any window is exhausted (long window catches bursts)", () => {
    const name = `test-multi-${Date.now()}`;
    const opts = {
      name,
      windows: [
        { id: "minute", limit: 100, windowMs: 60_000 },
        { id: "day", limit: 2, windowMs: 86_400_000 },
      ],
      message: "daily cap",
    };
    const req = makeRequest({ "x-forwarded-for": "203.0.113.13" });

    expect(enforceIpRateLimit(req, opts)).toBeNull();
    expect(enforceIpRateLimit(req, opts)).toBeNull();
    const blocked = enforceIpRateLimit(req, opts);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("merges extra headers (CORS) into the 429", () => {
    const name = `test-headers-${Date.now()}`;
    const opts = {
      name,
      windows: [{ id: "minute", limit: 1, windowMs: 60_000 }],
      message: "slow down",
      headers: { "Access-Control-Allow-Origin": "https://example.com" },
    };
    const req = makeRequest({ "x-forwarded-for": "203.0.113.14" });

    enforceIpRateLimit(req, opts);
    const blocked = enforceIpRateLimit(req, opts);
    expect(blocked!.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://example.com",
    );
  });
});

describe("enforceCourseAgentRateLimit", () => {
  it("shares one budget across callers using the same IP", async () => {
    // 5/min budget: exhaust it, then the 6th call must be a 429 carrying
    // the CORS headers passed by the route.
    const ip = `203.0.113.${100 + (Date.now() % 100)}`;
    const req = makeRequest({ "x-forwarded-for": ip });
    const cors = { "Access-Control-Allow-Origin": "https://bia-roommate.vercel.app" };

    for (let i = 0; i < 5; i++) {
      expect(enforceCourseAgentRateLimit(req, cors)).toBeNull();
    }
    const blocked = enforceCourseAgentRateLimit(req, cors);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://bia-roommate.vercel.app",
    );
    const body = await blocked!.json();
    expect(typeof body.error).toBe("string");
  });
});
