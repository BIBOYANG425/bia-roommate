// app/api/squad/draft/__tests__/relay.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── env setup ─────────────────────────────────────────────────────────────────

const BACKEND = "https://george.example.com";
const TOKEN = "secret-token";

function setEnv() {
  process.env.GEORGE_BACKEND_URL = BACKEND;
  process.env.GEORGE_ADMIN_TOKEN = TOKEN;
}

function clearEnv() {
  delete process.env.GEORGE_BACKEND_URL;
  delete process.env.GEORGE_ADMIN_TOKEN;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("relayDraft", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    setEnv();
  });

  it("calls the correct URL with Authorization header and returns draft on 200", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeRes(200, { draft: { category: "旅游", content: "去黄石公园" } })
    );
    vi.stubGlobal("fetch", mockFetch);

    const { relayDraft } = await import("../relay");
    const result = await relayDraft("想去黄石公园找搭子");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(`${BACKEND}/squad/draft`);
    expect(options.headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(options.method).toBe("POST");

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ draft: { category: "旅游", content: "去黄石公园" } });
  });

  it("passes through 422 (unsupported_category) from backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeRes(422, { error: "unsupported_category" }))
    );

    const { relayDraft } = await import("../relay");
    const result = await relayDraft("some weird text");

    expect(result.status).toBe(422);
    expect((result.body as { error: string }).error).toBe("unsupported_category");
  });

  it("returns 502 draft_unavailable on non-ok backend response (e.g. 500)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeRes(500, { error: "internal server error" }))
    );

    const { relayDraft } = await import("../relay");
    const result = await relayDraft("任何内容");

    expect(result.status).toBe(502);
    expect((result.body as { error: string }).error).toBe("draft_unavailable");
  });

  it("returns 502 draft_unavailable when fetch throws (network failure)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    );

    const { relayDraft } = await import("../relay");
    const result = await relayDraft("任何内容");

    expect(result.status).toBe(502);
    expect((result.body as { error: string }).error).toBe("draft_unavailable");
  });

  it("returns 502 draft_unavailable on AbortError (timeout)", async () => {
    const abortErr = new DOMException("The operation was aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortErr));

    const { relayDraft } = await import("../relay");
    const result = await relayDraft("任何内容");

    expect(result.status).toBe(502);
    expect((result.body as { error: string }).error).toBe("draft_unavailable");
  });

  it("returns 503 unavailable when env vars are missing", async () => {
    clearEnv();
    // Re-import after env change (vitest module cache — use dynamic import)
    vi.resetModules();
    const { relayDraft } = await import("../relay");
    const result = await relayDraft("任何内容");

    expect(result.status).toBe(503);
    expect((result.body as { error: string }).error).toBe("unavailable");
  });
});
