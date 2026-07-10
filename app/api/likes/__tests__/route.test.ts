/* eslint-disable @typescript-eslint/no-explicit-any -- fluent Supabase route test double */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed-handler", () => ({
  authedHandler: (config: { handler: (ctx: any) => Promise<Response> }) =>
    config.handler,
}));

import { DELETE, PUT } from "../route";

const user = { id: "user-1" };
const body = { profile_id: "00000000-0000-4000-8000-000000000001" };

function client(result: { data?: unknown; error?: unknown } = { error: null }) {
  const terminal = Promise.resolve(result);
  const chain: any = {
    upsert: vi.fn(() => terminal),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: terminal.then.bind(terminal),
  };
  return { from: vi.fn(() => chain), chain };
}

describe("/api/likes desired-state API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PUT is idempotent and never toggles an existing like off", async () => {
    const supabase = client();
    const response = await (PUT as any)({ user, supabase, body });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ liked: true });
    expect(supabase.chain.upsert).toHaveBeenCalledWith(
      { user_id: user.id, profile_id: body.profile_id },
      { onConflict: "user_id,profile_id", ignoreDuplicates: true },
    );
    expect(supabase.chain.delete).not.toHaveBeenCalled();
  });

  it("DELETE is idempotent and always expresses the unliked state", async () => {
    const supabase = client();
    const response = await (DELETE as any)({ user, supabase, body });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ liked: false });
    expect(supabase.chain.delete).toHaveBeenCalledOnce();
  });
});
