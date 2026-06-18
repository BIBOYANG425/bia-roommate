import { describe, it, expect } from "vitest";
import {
  parseSessionFromRedirectUrl,
  isSessionExpired,
  decodeJwtEmail,
} from "../session";

function jwt(payload: object): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url(payload)}.sig`;
}

describe("parseSessionFromRedirectUrl", () => {
  it("parses tokens from the redirect URL fragment", () => {
    const url = "https://ext.chromiumapp.org/#access_token=at&refresh_token=rt&expires_at=1000";
    expect(parseSessionFromRedirectUrl(url)).toEqual({
      access_token: "at",
      refresh_token: "rt",
      expires_at: 1000,
    });
  });
  it("returns null when a token is missing", () => {
    expect(parseSessionFromRedirectUrl("https://ext.chromiumapp.org/#access_token=at")).toBeNull();
  });
  it("returns null when there is no fragment", () => {
    expect(parseSessionFromRedirectUrl("https://ext.chromiumapp.org/")).toBeNull();
  });
  it("returns null for a non-URL", () => {
    expect(parseSessionFromRedirectUrl("not a url")).toBeNull();
  });
});

describe("isSessionExpired", () => {
  const s = { access_token: "a", refresh_token: "r", expires_at: 1000 };
  it("is expired at/after expires_at (with skew)", () => {
    expect(isSessionExpired(s, 1000)).toBe(true);
    expect(isSessionExpired(s, 2000)).toBe(true);
  });
  it("is not expired comfortably before expiry", () => {
    expect(isSessionExpired(s, 800)).toBe(false);
  });
  it("respects a custom skew", () => {
    expect(isSessionExpired(s, 950, 0)).toBe(false);
    expect(isSessionExpired(s, 950, 100)).toBe(true);
  });
});

describe("decodeJwtEmail", () => {
  it("reads the email claim", () => {
    expect(decodeJwtEmail(jwt({ email: "a@usc.edu" }))).toBe("a@usc.edu");
  });
  it("returns null when there is no email claim", () => {
    expect(decodeJwtEmail(jwt({ sub: "x" }))).toBeNull();
  });
  it("returns null for a malformed token", () => {
    expect(decodeJwtEmail("not.a.jwt.too.many")).toBeNull();
    expect(decodeJwtEmail("onlyonepart")).toBeNull();
  });
});
