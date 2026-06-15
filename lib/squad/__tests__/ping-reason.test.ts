import { describe, it, expect } from "vitest";
import { buildPingReason } from "../ping-reason";

describe("buildPingReason", () => {
  it("uses the first matched tag, underscores prettified", () => {
    expect(buildPingReason(["korean_food", "kbbq"], null)).toBe("✦ 你提到 korean food");
  });
  it("falls back to best_facet when no tags", () => {
    expect(buildPingReason([], "bouldering")).toBe("✦ 你提到 bouldering");
  });
  it("returns null when there is no real signal", () => {
    expect(buildPingReason([], null)).toBeNull();
  });
});
