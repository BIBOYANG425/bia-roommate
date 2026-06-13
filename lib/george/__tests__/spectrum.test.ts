import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeUsPhone, registerSharedUser } from "../spectrum";

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

describe("normalizeUsPhone", () => {
  it("normalizes 10-digit and formatted inputs to E.164", () => {
    expect(normalizeUsPhone("2135550123")).toBe("+12135550123");
    expect(normalizeUsPhone("(213) 555-0123")).toBe("+12135550123");
    expect(normalizeUsPhone("1-213-555-0123")).toBe("+12135550123");
    expect(normalizeUsPhone("+1 213 555 0123")).toBe("+12135550123");
  });
  it("rejects non-US shapes", () => {
    expect(normalizeUsPhone("12345")).toBeNull();
    expect(normalizeUsPhone("+86 138 0000 0000")).toBeNull();
    expect(normalizeUsPhone("")).toBeNull();
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
