import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

const getUser = vi.fn();
const createServerClient = vi.fn(async () => ({
  auth: { getUser: () => getUser() },
}));

const checkRateLimit = vi.fn();
const requireAdmin = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => createServerClient(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (key: string, cfg: unknown) => checkRateLimit(key, cfg),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: () => requireAdmin(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ __isServiceRole: true }),
}));

import { authedHandler, adminHandler } from "../authed-handler";

const fakeUser = { id: "user-123", email: "u@example.com" };
const okAdmin = {
  user: fakeUser,
  supabase: {} as never,
  isAdmin: true,
};

function makeRequest(method: string, body?: unknown): Request {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  return new Request("http://localhost/api/test", init);
}

// Next.js 16 always passes a routeCtx, even on non-dynamic routes (with
// empty params). Tests mirror that.
const emptyCtx = { params: Promise.resolve({} as Record<string, never>) };

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: fakeUser } });
  checkRateLimit.mockReturnValue({
    allowed: true,
    remaining: 9,
    resetAt: Date.now() + 60_000,
  });
});

describe("authedHandler", () => {
  it("401 when no user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const handler = authedHandler({
      handler: async () => new Response("never"),
    });
    const res = await handler(makeRequest("POST", { a: 1 }), emptyCtx);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("429 when rate limit blocks", async () => {
    const resetAt = Date.now() + 30_000;
    checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt });
    const handler = authedHandler({
      rateLimit: { key: "test", limit: 5, windowMs: 60_000 },
      handler: async () => new Response("never"),
    });
    const res = await handler(makeRequest("POST", { a: 1 }), emptyCtx);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
    expect(checkRateLimit).toHaveBeenCalledWith(
      `test:${fakeUser.id}`,
      expect.objectContaining({ limit: 5, windowMs: 60_000 }),
    );
  });

  it("400 on invalid JSON for schema-requiring handler", async () => {
    const handler = authedHandler({
      schema: z.object({ name: z.string() }),
      handler: async () => new Response("never"),
    });
    const res = await handler(makeRequest("POST", "{not-json"), emptyCtx);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON" });
  });

  it("400 on schema validation failure — hoists first zod message into error", async () => {
    const handler = authedHandler({
      schema: z.object({
        name: z.string({ message: "Name must be a string" }),
      }),
      handler: async () => new Response("never"),
    });
    const res = await handler(makeRequest("POST", { name: 42 }), emptyCtx);
    expect(res.status).toBe(400);
    const json = await res.json();
    // First zod issue message hoisted into `error` so frontends showing
    // `data.error` see something actionable (not "Invalid request body").
    expect(json.error).toBe("Name must be a string");
    expect(json.issues).toBeDefined();
  });

  it("400 with regex refine message — hoisted verbatim", async () => {
    const handler = authedHandler({
      schema: z.object({
        term: z
          .string()
          .regex(/^(Fall|Spring) \d{4}$/, "Must be like 'Fall 2025'"),
      }),
      handler: async () => new Response("never"),
    });
    const res = await handler(makeRequest("POST", { term: "junk" }), emptyCtx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Must be like 'Fall 2025'");
  });

  it("empty body on DELETE with schema → schema validates null (no 'Invalid JSON')", async () => {
    const handler = authedHandler({
      schema: z.object({ id: z.string() }),
      handler: async () => new Response("never"),
    });
    const res = await handler(makeRequest("DELETE"), emptyCtx);
    expect(res.status).toBe(400);
    const json = await res.json();
    // Should produce a field-specific schema error, NOT generic "Invalid JSON".
    expect(json.error).not.toBe("Invalid JSON");
    expect(json.issues).toBeDefined();
  });

  it("passes parsed body to handler on happy path", async () => {
    const handler = authedHandler({
      schema: z.object({ name: z.string() }),
      handler: async ({ body, user }) => {
        return Response.json({ name: body.name, uid: user.id });
      },
    });
    const res = await handler(makeRequest("POST", { name: "alice" }), emptyCtx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "alice", uid: "user-123" });
  });

  it("skips body parsing for GET", async () => {
    const handler = authedHandler({
      schema: z.object({ name: z.string() }), // schema present but GET ignores
      handler: async ({ body }) => Response.json({ got: body }),
    });
    const res = await handler(makeRequest("GET"), emptyCtx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ got: null });
  });

  it("returns 500 on uncaught throw in handler", async () => {
    const handler = authedHandler({
      handler: async () => {
        throw new Error("boom");
      },
    });
    const res = await handler(makeRequest("POST", { a: 1 }), emptyCtx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("passes route params through (dynamic routes)", async () => {
    const handler = authedHandler<undefined, { id: string }>({
      handler: async ({ params }) => Response.json({ id: params.id }),
    });
    const res = await handler(makeRequest("POST", { a: 1 }), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(await res.json()).toEqual({ id: "abc" });
  });
});

describe("adminHandler", () => {
  it("forwards the requireAdmin error (401 / 403)", async () => {
    requireAdmin.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    });
    const handler = adminHandler({
      handler: async () => new Response("never"),
    });
    const res = await handler(makeRequest("POST", { a: 1 }), emptyCtx);
    expect(res.status).toBe(403);
  });

  it("dispatches when admin gate passes; exposes adminSupabase", async () => {
    requireAdmin.mockResolvedValue({ ctx: okAdmin });
    const handler = adminHandler({
      schema: z.object({ x: z.number() }),
      handler: async ({ user, body, adminSupabase }) => {
        return Response.json({
          uid: user.id,
          x: body.x,
          hasAdmin: typeof adminSupabase !== "undefined",
        });
      },
    });
    const res = await handler(makeRequest("POST", { x: 7 }), emptyCtx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      uid: "user-123",
      x: 7,
      hasAdmin: true,
    });
  });

  it("admin rate limit still applies", async () => {
    requireAdmin.mockResolvedValue({ ctx: okAdmin });
    checkRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1000,
    });
    const handler = adminHandler({
      rateLimit: { key: "admin-test", limit: 1, windowMs: 1000 },
      handler: async () => new Response("never"),
    });
    const res = await handler(makeRequest("POST", { a: 1 }), emptyCtx);
    expect(res.status).toBe(429);
  });
});
