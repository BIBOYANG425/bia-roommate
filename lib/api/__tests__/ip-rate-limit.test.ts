// Tests for the public-route per-IP rate limiter: IP derivation order,
// multi-window enforcement, 429 shape (Retry-After + merged headers), and
// the split course budgets (tight LLM "course-agent" vs loose keyword-only
// "course-free"). Uses unique bucket names / IPs per test since
// lib/rate-limit.ts keeps a module-level store.
// Header last reviewed: 2026-06-11

import { describe, it, expect } from "vitest";
import {
  getClientIp,
  enforceIpRateLimit,
  enforceCourseAgentRateLimit,
  enforceCourseFreeRateLimit,
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
    const ip = `agent-shared-${Date.now()}`;
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

describe("enforceCourseFreeRateLimit", () => {
  const cors = {
    "Access-Control-Allow-Origin": "https://bia-roommate.vercel.app",
  };

  it("allows 60/min on the free path without consuming the LLM budget", async () => {
    // The shared-egress scenario: the George bot relays many users'
    // mode:"free" searches from ONE IP. 60 in a minute must all pass and
    // must leave the tight course-agent bucket untouched.
    const req = makeRequest({ "x-forwarded-for": `free-a-${Date.now()}` });

    for (let i = 0; i < 60; i++) {
      expect(enforceCourseFreeRateLimit(req, cors)).toBeNull();
    }
    const blocked = enforceCourseFreeRateLimit(req, cors);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://bia-roommate.vercel.app",
    );
    const body = await blocked!.json();
    expect(typeof body.error).toBe("string");

    // 61 free-mode hits must NOT have eaten into the tight LLM budget.
    expect(enforceCourseAgentRateLimit(req, cors)).toBeNull();
  });

  it("keeps the free path open when the LLM budget is exhausted", () => {
    // An IP locked out of the LLM paths (5/min) must still be able to use
    // the zero-cost keyword path — campus NAT users behind one address
    // should never lose the basic course finder to someone else's AI use.
    const req = makeRequest({ "x-forwarded-for": `free-b-${Date.now()}` });

    for (let i = 0; i < 6; i++) {
      enforceCourseAgentRateLimit(req, cors);
    }
    expect(enforceCourseAgentRateLimit(req, cors)).not.toBeNull();
    expect(enforceCourseFreeRateLimit(req, cors)).toBeNull();
  });

  it("has no daily window — only the per-minute cap applies", () => {
    // Regression guard for the budget split: the free path must enforce
    // exactly one window ("minute"). A "day" window here would re-create
    // the silent George-bot lockout this split exists to prevent.
    const req = makeRequest({ "x-forwarded-for": `free-c-${Date.now()}` });
    const blocked = (() => {
      for (let i = 0; i < 60; i++) enforceCourseFreeRateLimit(req, cors);
      return enforceCourseFreeRateLimit(req, cors);
    })();
    expect(blocked).not.toBeNull();
    // Retry-After must point at the minute window, not a day-scale reset.
    expect(Number(blocked!.headers.get("Retry-After"))).toBeLessThanOrEqual(60);
  });
});
