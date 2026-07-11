/* eslint-disable @typescript-eslint/no-explicit-any -- fluent Supabase route test double */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed-handler", () => ({
  authedHandler: (config: { handler: (ctx: any) => Promise<Response> }) =>
    config.handler,
}));

import { GET, POST } from "../route";

const user = { id: "user-1" };
const body = {
  parcel_ids: ["00000000-0000-4000-8000-000000000001"],
  preferred_method: "air",
};

describe("pack request workflow", () => {
  it("surfaces a secondary join query error", async () => {
    const requestResult = Promise.resolve({ data: [{ id: "r1" }], error: null });
    const requestChain: any = {
      select: vi.fn(() => requestChain),
      eq: vi.fn(() => requestChain),
      order: vi.fn(() => requestResult),
    };
    const linkResult = Promise.resolve({ data: null, error: { message: "links failed" } });
    const linkChain: any = {
      select: vi.fn(() => linkChain),
      in: vi.fn(() => linkResult),
    };
    const from = vi
      .fn()
      .mockReturnValueOnce(requestChain)
      .mockReturnValueOnce(linkChain);

    const response = await (GET as any)({ user, supabase: { from } });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "links failed" });
  });

  it("creates and links a request through one atomic RPC", async () => {
    const created = { id: "request-1" };
    const rpc = vi.fn().mockResolvedValue({ data: created, error: null });
    const from = vi.fn();

    const response = await (POST as any)({ user, supabase: { rpc, from }, body });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);
    expect(rpc).toHaveBeenCalledWith("create_pack_request", {
      p_parcel_ids: body.parcel_ids,
      p_preferred_method: "air",
      p_urgency_note: null,
      p_contact: null,
      p_user_note: null,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("maps the atomic duplicate-open-request rejection to 409", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "pack_request_already_open" },
    });
    const response = await (POST as any)({
      user,
      supabase: { rpc, from: vi.fn() },
      body,
    });
    expect(response.status).toBe(409);
  });
});
