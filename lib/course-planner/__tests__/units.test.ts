import { describe, it, expect } from "vitest";
import { unitsMatch } from "../units";

describe("unitsMatch", () => {
  it("treats '4' and '4.0' as equal (catalog vs chip formatting)", () => {
    expect(unitsMatch("4.0", "4")).toBe(true);
    expect(unitsMatch("4", "4.0")).toBe(true);
    expect(unitsMatch("4.00", "4")).toBe(true);
  });

  it("matches identical numeric strings", () => {
    expect(unitsMatch("2", "2")).toBe(true);
    expect(unitsMatch("3", "3")).toBe(true);
  });

  it("rejects genuinely different unit counts", () => {
    expect(unitsMatch("2", "4")).toBe(false);
    expect(unitsMatch("4.0", "2")).toBe(false);
  });

  it("returns false for missing/empty course units", () => {
    expect(unitsMatch(undefined, "4")).toBe(false);
    expect(unitsMatch(null, "4")).toBe(false);
    expect(unitsMatch("", "4")).toBe(false);
  });

  it("falls back to string equality when a side isn't numeric", () => {
    // Variable-unit courses like "1-4" aren't a clean parseFloat compare.
    expect(unitsMatch("1-4", "1-4")).toBe(true);
    expect(unitsMatch("1-4", "4")).toBe(false); // parseFloat("1-4") === 1 !== 4
  });
});
