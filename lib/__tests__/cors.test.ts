import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { corsHeaders } from "../cors";

describe("corsHeaders", () => {
  const prev = process.env.ALLOWED_EXTENSION_ID;
  beforeEach(() => {
    process.env.ALLOWED_EXTENSION_ID = "testextid";
  });
  afterEach(() => {
    process.env.ALLOWED_EXTENSION_ID = prev;
  });

  it("allows the configured extension origin and permits the Authorization header", () => {
    const req = new Request("https://x/api/schedules", {
      headers: { origin: "chrome-extension://testextid" },
    });
    const h = corsHeaders(req);
    expect(h["Access-Control-Allow-Origin"]).toBe("chrome-extension://testextid");
    expect(h["Access-Control-Allow-Headers"]).toContain("Authorization");
  });

  it("returns no headers for a disallowed origin", () => {
    const req = new Request("https://x/api/schedules", {
      headers: { origin: "https://evil.example" },
    });
    expect(corsHeaders(req)).toEqual({});
  });
});
