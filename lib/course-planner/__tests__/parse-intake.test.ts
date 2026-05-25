/**
 * Adversarial input tests for the SSE route's parseIntake helper. The
 * helper is the trust boundary between client-supplied chip state and the
 * agent's research instructions, so it has to refuse anything not in the
 * whitelist.
 */

import { describe, it, expect } from "vitest";
import { parseIntake } from "@/app/api/courses/agent-stream/intake";

describe("parseIntake — happy path", () => {
  it("accepts a fully valid intake", () => {
    const out = parseIntake({
      year: "junior",
      geNeeded: ["GE-A", "GE-C"],
      profRatingFloor: 4.0,
    });
    expect(out.year).toBe("junior");
    expect(out.geNeeded).toEqual(["GE-A", "GE-C"]);
    expect(out.profRatingFloor).toBe(4.0);
  });

  it("returns empty intake when raw is null/undefined/non-object", () => {
    for (const bad of [null, undefined, 42, "hello", true, []]) {
      const out = parseIntake(bad);
      expect(out.year).toBeNull();
      expect(out.geNeeded).toEqual([]);
      expect(out.profRatingFloor).toBeNull();
    }
  });
});

describe("parseIntake — adversarial input", () => {
  it("rejects unknown year strings", () => {
    expect(parseIntake({ year: "hacker" }).year).toBeNull();
    expect(parseIntake({ year: "FRESHMAN" }).year).toBeNull(); // case-sensitive whitelist
    expect(parseIntake({ year: 42 }).year).toBeNull();
    expect(parseIntake({ year: null }).year).toBeNull();
  });

  it("drops geNeeded entries not in the GE-A..GE-H whitelist", () => {
    const out = parseIntake({
      geNeeded: ["GE-A", "DROP TABLE", "GE-Z", "GE-C", 99, null],
    });
    expect(out.geNeeded).toEqual(["GE-A", "GE-C"]);
  });

  it("caps geNeeded to 8 entries BEFORE filtering (no OOM on huge arrays)", () => {
    const huge = new Array(10_000).fill("DROP TABLE");
    huge[0] = "GE-A";
    huge[7] = "GE-B";
    const out = parseIntake({ geNeeded: huge });
    // After cap to 8, only the slots 0 and 7 contain valid GEs.
    expect(out.geNeeded).toEqual(["GE-A", "GE-B"]);
  });

  it("clamps profRatingFloor to the [0, 5] range", () => {
    expect(parseIntake({ profRatingFloor: 999 }).profRatingFloor).toBe(5);
    expect(parseIntake({ profRatingFloor: 5.5 }).profRatingFloor).toBe(5);
    expect(parseIntake({ profRatingFloor: 0 }).profRatingFloor).toBe(0);
    expect(parseIntake({ profRatingFloor: -1 }).profRatingFloor).toBeNull();
    expect(parseIntake({ profRatingFloor: NaN }).profRatingFloor).toBeNull();
    expect(parseIntake({ profRatingFloor: Infinity }).profRatingFloor).toBeNull();
    expect(parseIntake({ profRatingFloor: "5" }).profRatingFloor).toBeNull();
  });

  it("ignores any extra keys an attacker might inject", () => {
    const out = parseIntake({
      year: "freshman",
      __proto__: { polluted: true },
      constructor: "no",
      somethingElse: "ignored",
    });
    expect(out.year).toBe("freshman");
    // No extra properties leak through
    expect(Object.keys(out).sort()).toEqual([
      "geNeeded",
      "profRatingFloor",
      "year",
    ]);
  });
});
