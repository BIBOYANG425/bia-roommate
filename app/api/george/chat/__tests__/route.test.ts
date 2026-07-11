/* eslint-disable @typescript-eslint/no-explicit-any -- Request is sufficient for the route seam */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const request = () =>
  new Request("http://localhost/api/george/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "hello", userId: "u1" }),
  }) as any;

describe("George relay HTTP semantics", () => {
  beforeEach(() => {
    process.env.GEORGE_BACKEND_URL = "https://george.test";
    process.env.GEORGE_ADMIN_TOKEN = "secret";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEORGE_BACKEND_URL;
    delete process.env.GEORGE_ADMIN_TOKEN;
  });

  it("returns 503 with friendly copy when configuration is missing", async () => {
    delete process.env.GEORGE_BACKEND_URL;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).response).toContain("fine-tuned");
  });

  it("returns 503 when the backend cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect((await POST(request())).status).toBe(503);
  });

  it("returns 502 when the upstream responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad", { status: 500 })));
    expect((await POST(request())).status).toBe(502);
  });
});
