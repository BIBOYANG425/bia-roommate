/* eslint-disable @typescript-eslint/no-explicit-any -- fluent Supabase route test double */
import { expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed-handler", () => ({
  authedHandler: (config: { handler: (ctx: any) => Promise<Response> }) =>
    config.handler,
}));

import { DELETE } from "../route";

it("returns 404 when deleting a comment affects zero rows", async () => {
  const result = Promise.resolve({ data: [], error: null });
  const chain: any = {
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(() => result),
  };
  const response = await (DELETE as any)({
    user: { id: "user-1" },
    supabase: { from: vi.fn(() => chain) },
    body: { id: "00000000-0000-4000-8000-000000000001" },
  });

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "Comment not found" });
});
