import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieGetUser = vi.fn();
const bearerGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: cookieGetUser } })),
}));
vi.mock("@/lib/supabase/bearer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../supabase/bearer")>()),
  createBearerSupabaseClient: vi.fn(() => ({ auth: { getUser: bearerGetUser } })),
}));

import { resolveAuth } from "../resolve-auth";

beforeEach(() => {
  cookieGetUser.mockReset();
  bearerGetUser.mockReset();
});

describe("resolveAuth", () => {
  it("resolves via the cookie session when there is no bearer token", async () => {
    cookieGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await resolveAuth(new Request("https://x/api"));
    expect(res?.user.id).toBe("u1");
    expect(bearerGetUser).not.toHaveBeenCalled();
  });
  it("resolves via the bearer token when present", async () => {
    bearerGetUser.mockResolvedValue({ data: { user: { id: "u2" } } });
    const res = await resolveAuth(
      new Request("https://x/api", { headers: { Authorization: "Bearer tok" } }),
    );
    expect(res?.user.id).toBe("u2");
    expect(bearerGetUser).toHaveBeenCalledWith("tok");
    expect(cookieGetUser).not.toHaveBeenCalled();
  });
  it("returns null when the bearer token is invalid", async () => {
    bearerGetUser.mockResolvedValue({ data: { user: null } });
    const res = await resolveAuth(
      new Request("https://x/api", { headers: { Authorization: "Bearer bad" } }),
    );
    expect(res).toBeNull();
  });
  it("returns null when the cookie session has no user", async () => {
    cookieGetUser.mockResolvedValue({ data: { user: null } });
    expect(await resolveAuth(new Request("https://x/api"))).toBeNull();
  });
});
