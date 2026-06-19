import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizePhone, registerSharedUser } from "../spectrum";

const CREDS = { projectId: "pid", projectSecret: "psecret" };
const ASSIGNED = "+16285550000";

function mockFetchSequence(responses: Array<{ ok: boolean; json: unknown }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({ ok: r.ok, json: async () => r.json });
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("normalizePhone", () => {
  it("normalizes 10-digit and formatted US inputs to E.164", () => {
    expect(normalizePhone("2135550123")).toBe("+12135550123");
    expect(normalizePhone("(213) 555-0123")).toBe("+12135550123");
    expect(normalizePhone("1-213-555-0123")).toBe("+12135550123");
    expect(normalizePhone("+1 213 555 0123")).toBe("+12135550123");
  });
  it("preserves international country codes", () => {
    expect(normalizePhone("+86 138 0000 0000")).toBe("+8613800000000");
    expect(normalizePhone("008613800000000")).toBe("+8613800000000");
    expect(normalizePhone("+44 7911 123456")).toBe("+447911123456");
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });
  it("rejects implausible inputs", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("registerSharedUser", () => {
  it("returns the assigned pool number on a fresh registration", async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: { succeed: true, data: { assignedPhoneNumber: ASSIGNED } } },
    ]);
    const out = await registerSharedUser("+12135550123", CREDS);
    expect(out).toEqual({ ok: true, assignedPhoneNumber: ASSIGNED, alreadyRegistered: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://spectrum.photon.codes/projects/pid/users/");
    expect(JSON.parse(init.body)).toEqual({ type: "shared", phoneNumber: "+12135550123" });
    expect(init.headers.authorization).toMatch(/^Basic /);
  });

  it("falls back to lookup and reuses the existing assignment when create fails", async () => {
    mockFetchSequence([
      { ok: false, json: { succeed: false, error: "already exists" } },
      { ok: true, json: { succeed: true, data: { users: [{ phoneNumber: "+12135550123", assignedPhoneNumber: ASSIGNED }] } } },
    ]);
    const out = await registerSharedUser("+12135550123", CREDS);
    expect(out).toEqual({ ok: true, assignedPhoneNumber: ASSIGNED, alreadyRegistered: true });
  });

  it("reports pool_unavailable when availability says no slot", async () => {
    mockFetchSequence([
      { ok: false, json: { succeed: false } },
      { ok: true, json: { succeed: true, data: { users: [] } } },
      { ok: true, json: { succeed: true, data: { available: false } } },
    ]);
    const out = await registerSharedUser("+12135550123", CREDS);
    expect(out).toEqual({ ok: false, error: "pool_unavailable" });
  });

  it("reports spectrum_error on total failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net down")));
    const out = await registerSharedUser("+12135550123", CREDS);
    expect(out).toEqual({ ok: false, error: "spectrum_error" });
  });
});
