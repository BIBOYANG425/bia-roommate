import { describe, expect, it } from "vitest";
import { normalizeUsPhone } from "../spectrum";

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
