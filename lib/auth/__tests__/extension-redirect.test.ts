import { describe, it, expect } from "vitest";
import {
  isValidExtensionRedirect,
  buildExtensionRedirectUrl,
} from "../extension-redirect";

describe("isValidExtensionRedirect", () => {
  const extId = "abcdefghijklmnop";
  it("accepts the allowed extension's chromiumapp.org redirect", () => {
    expect(isValidExtensionRedirect(`https://${extId}.chromiumapp.org/`, extId)).toBe(true);
  });
  it("rejects a different extension id", () => {
    expect(isValidExtensionRedirect("https://other.chromiumapp.org/", extId)).toBe(false);
  });
  it("rejects a non-chromiumapp host", () => {
    expect(isValidExtensionRedirect(`https://${extId}.evil.com/`, extId)).toBe(false);
  });
  it("rejects http (non-https)", () => {
    expect(isValidExtensionRedirect(`http://${extId}.chromiumapp.org/`, extId)).toBe(false);
  });
  it("rejects null uri or missing extension id", () => {
    expect(isValidExtensionRedirect(null, extId)).toBe(false);
    expect(isValidExtensionRedirect(`https://${extId}.chromiumapp.org/`, undefined)).toBe(false);
  });
});

describe("buildExtensionRedirectUrl", () => {
  it("puts the session tokens in the URL fragment", () => {
    const url = buildExtensionRedirectUrl("https://ext.chromiumapp.org/", {
      access_token: "at",
      refresh_token: "rt",
      expires_at: 1234,
    });
    expect(url.startsWith("https://ext.chromiumapp.org/#")).toBe(true);
    const frag = new URLSearchParams(url.split("#")[1]);
    expect(frag.get("access_token")).toBe("at");
    expect(frag.get("refresh_token")).toBe("rt");
    expect(frag.get("expires_at")).toBe("1234");
  });
});
