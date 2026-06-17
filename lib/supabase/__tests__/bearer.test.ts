import { describe, it, expect } from "vitest";
import { getBearerToken } from "../bearer";

function req(headers: Record<string, string>): Request {
  return new Request("https://x/api", { headers });
}

describe("getBearerToken", () => {
  it("extracts the token from a Bearer header", () => {
    expect(getBearerToken(req({ Authorization: "Bearer abc.def.ghi" }))).toBe("abc.def.ghi");
  });
  it("is case-insensitive on the scheme", () => {
    expect(getBearerToken(req({ authorization: "bearer xyz" }))).toBe("xyz");
  });
  it("returns null when there is no Authorization header", () => {
    expect(getBearerToken(req({}))).toBeNull();
  });
  it("returns null for a non-Bearer scheme", () => {
    expect(getBearerToken(req({ Authorization: "Basic abc" }))).toBeNull();
  });
});
