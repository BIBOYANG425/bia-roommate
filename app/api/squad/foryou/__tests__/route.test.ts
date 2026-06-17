// app/api/squad/foryou/__tests__/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: () => getUser() }, rpc }),
}));

import { GET } from "../route";
const req = () => new Request("http://localhost/api/squad/foryou");

beforeEach(() => { getUser.mockReset(); rpc.mockReset(); });

describe("GET /api/squad/foryou", () => {
  it("401s when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(req())).status).toBe(401);
  });

  it("returns ranked rows with reasons, dropping reasonless weak rows is NOT done here (UI decides)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "a1" } }, error: null });
    rpc.mockResolvedValue({ data: [
      { post_id: "p1", rrf_score: 0.03, semantic_sim: 0.7, tag_overlap: 1, matched_tags: ["hiking"], best_facet: "hiking" },
      { post_id: "p2", rrf_score: 0.01, semantic_sim: 0.2, tag_overlap: 0, matched_tags: [], best_facet: "x" },
    ], error: null });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(rpc).toHaveBeenCalledWith("squad_board_for_me", { p_match_count: 30 });
    expect(body).toEqual([
      { post_id: "p1", rank: 1, reason: "✦ 你们都喜欢 hiking" },
      { post_id: "p2", rank: 2, reason: null },
    ]);
  });

  it("502s with recommendations_unavailable on RPC error (board falls back quietly — spec §11.6)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "a1" } }, error: null });
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await GET(req());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("recommendations_unavailable");
  });
});
