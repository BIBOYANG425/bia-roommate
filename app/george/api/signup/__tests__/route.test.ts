import { beforeEach, describe, expect, it, vi } from "vitest";

const { mintMock, findMock, rateMock } = vi.hoisted(() => ({
  mintMock: vi.fn(),
  findMock: vi.fn(),
  rateMock: vi.fn(),
}));

vi.mock("@/lib/george/mint-code", () => ({
  mintPendingCode: mintMock,
  findPendingByHandle: findMock,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({}) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: rateMock }));

import { POST } from "../route";

const GEORGE_NUMBER = "+16282647754";

const req = (body: unknown, ip = "1.2.3.4") =>
  new Request("http://localhost/george/api/signup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  mintMock.mockReset();
  findMock.mockReset();
  rateMock.mockReset();
  rateMock.mockReturnValue({ allowed: true, remaining: 4, resetAt: 0 });
  process.env.GEORGE_IMESSAGE_PHONE = GEORGE_NUMBER;
});

describe("POST /george/api/signup", () => {
  it("mints a pre-linked code and returns the one shared george number", async () => {
    findMock.mockResolvedValue(null);
    mintMock.mockResolvedValue("g7k2m4");
    const res = await POST(req({ phone: "(213) 555-0123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      georgeNumber: GEORGE_NUMBER,
      code: "g7k2m4",
      alreadyOnboarded: false,
    });
    expect(mintMock).toHaveBeenCalledWith({}, { imessageHandle: "+12135550123" });
  });

  it("reuses an existing pending row instead of minting a duplicate", async () => {
    findMock.mockResolvedValue({ code: "oldcod", status: "pending" });
    const res = await POST(req({ phone: "2135550123" }));
    expect((await res.json()).code).toBe("oldcod");
    expect(mintMock).not.toHaveBeenCalled();
  });

  it("flags already-onboarded users", async () => {
    findMock.mockResolvedValue({ code: "donedn", status: "completed" });
    const body = await (await POST(req({ phone: "2135550123" }))).json();
    expect(body.alreadyOnboarded).toBe(true);
    expect(body.code).toBe("donedn");
  });

  it("400s invalid phones without minting", async () => {
    const res = await POST(req({ phone: "12345" }));
    expect(res.status).toBe(400);
    expect(mintMock).not.toHaveBeenCalled();
    expect(findMock).not.toHaveBeenCalled();
  });

  it("429s when rate limited", async () => {
    rateMock.mockReturnValue({ allowed: false, remaining: 0, resetAt: 0 });
    expect((await POST(req({ phone: "2135550123" }))).status).toBe(429);
  });

  it("500s not_configured when GEORGE_IMESSAGE_PHONE is unset", async () => {
    delete process.env.GEORGE_IMESSAGE_PHONE;
    findMock.mockResolvedValue(null);
    const res = await POST(req({ phone: "2135550123" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("not_configured");
  });
});
