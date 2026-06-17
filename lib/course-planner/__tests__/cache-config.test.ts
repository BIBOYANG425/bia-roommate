import { describe, it, expect } from "vitest";
import { SEAT_REVALIDATE_SECONDS } from "../cache-config";

describe("seat freshness contract", () => {
  it("refreshes seat-bearing data at most every 10 minutes", () => {
    expect(SEAT_REVALIDATE_SECONDS).toBeLessThanOrEqual(600);
    expect(SEAT_REVALIDATE_SECONDS).toBeGreaterThan(0);
  });
});
