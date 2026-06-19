import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerMock, mintMock, findMock, rateMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  mintMock: vi.fn(),
  findMock: vi.fn(),
  rateMock: vi.fn(),
}));

vi.mock("@/lib/george/spectrum", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/george/spectrum")>();
  return { normalizePhone: actual.normalizePhone, registerSharedUser: registerMock };
});
vi.mock("@/lib/george/mint-code", () => ({
  mintPendingCode: mintMock,
  findPendingByHandle: findMock,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({}) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: rateMock }));

import { POST } from "../route";

const req = (body: unknown, ip = "1.2.3.4") =>
  new Request("http://localhost/george/api/signup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  registerMock.mockReset();
  mintMock.mockReset();
  findMock.mockReset();
  rateMock.mockReset();
  rateMock.mockReturnValue({ allowed: true, remaining: 4, resetAt: 0 });
  process.env.SPECTRUM_PROJECT_ID = "pid";
  process.env.SPECTRUM_PROJECT_SECRET = "psecret";
});

describe("POST /george/api/signup", () => {
  it("registers, mints a pre-linked code, returns the assigned number", async () => {
    registerMock.mockResolvedValue({ ok: true, assignedPhoneNumber: "+16285550000", alreadyRegistered: false });
    findMock.mockResolvedValue(null);
    mintMock.mockResolvedValue("g7k2m4");
    const res = await POST(req({ phone: "(213) 555-0123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      assignedPhoneNumber: "+16285550000",
      code: "g7k2m4",
      alreadyRegistered: false,
      alreadyOnboarded: false,
    });
    expect(registerMock).toHaveBeenCalledWith("+12135550123", { projectId: "pid", projectSecret: "psecret" });
    expect(mintMock).toHaveBeenCalledWith({}, { imessageHandle: "+12135550123" });
  });

  it("reuses an existing pending row instead of minting a duplicate", async () => {
    registerMock.mockResolvedValue({ ok: true, assignedPhoneNumber: "+16285550000", alreadyRegistered: true });
    findMock.mockResolvedValue({ code: "oldcod", status: "pending" });
    const res = await POST(req({ phone: "2135550123" }));
    expect((await res.json()).code).toBe("oldcod");
    expect(mintMock).not.toHaveBeenCalled();
  });

  it("flags already-onboarded users", async () => {
    registerMock.mockResolvedValue({ ok: true, assignedPhoneNumber: "+16285550000", alreadyRegistered: true });
    findMock.mockResolvedValue({ code: "donedn", status: "completed" });
    const body = await (await POST(req({ phone: "2135550123" }))).json();
    expect(body.alreadyOnboarded).toBe(true);
  });

  it("400s invalid phones without touching Spectrum", async () => {
    const res = await POST(req({ phone: "12345" }));
    expect(res.status).toBe(400);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("429s when rate limited", async () => {
    rateMock.mockReturnValue({ allowed: false, remaining: 0, resetAt: 0 });
    expect((await POST(req({ phone: "2135550123" }))).status).toBe(429);
  });

  it("503s on pool_unavailable, 502 on spectrum_error", async () => {
    registerMock.mockResolvedValue({ ok: false, error: "pool_unavailable" });
    expect((await POST(req({ phone: "2135550123" }))).status).toBe(503);
    registerMock.mockResolvedValue({ ok: false, error: "spectrum_error" });
    expect((await POST(req({ phone: "2135550123" }))).status).toBe(502);
  });
});
