/* eslint-disable @typescript-eslint/no-explicit-any -- fluent Supabase route test double */
import { expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed-handler", () => ({
  authedHandler: (config: { handler: (ctx: any) => Promise<Response> }) =>
    config.handler,
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

import { POST } from "../route";

it("maps the database squad capacity constraint to 400", async () => {
  const result = Promise.resolve({ data: null, error: { code: "23514", message: "check" } });
  const chain: any = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => result),
  };
  const response = await (POST as any)({
    user: { id: "u1" },
    supabase: { from: vi.fn(() => chain) },
    body: {
      poster_name: "A",
      category: "拼车",
      content: "Dinner",
      contact: "wechat",
      max_people: 2,
    },
  });
  expect(response.status).toBe(400);
});
