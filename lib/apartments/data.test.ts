import { describe, it, expect } from "vitest";
import { APARTMENTS, STATIC_RANKING } from "./data";

// Pinned ranking for the CURRENT dataset. This is the byte-for-byte order the
// pre-refactor page produced (rankBoost + summed reddit-seed scores, desc, with
// a stable sort keeping array order on ties — e.g. thea-dtla before nari-koreatown
// at 1960). If a data edit legitimately reorders the marquee, update this list.
const EXPECTED_RANKING_IDS = [
  "beaudry-dtla",
  "olympic-hill",
  "aven-dtla",
  "alina-holland",
  "fig8",
  "the-grand",
  "circa-la",
  "888-grand-hope",
  "olive-dtla",
  "atelier-dtla",
  "metro-417",
  "thea-dtla",
  "nari-koreatown",
  "g12",
  "1133-hope",
  "wren-dtla",
  "30sixty",
  "be-dtla",
  "axis-dtla",
  "onyx-dtla",
  "gemma-south",
  "apex-holland",
  "south-park-windsor",
  "emerson-dtla",
  "sentral-dtla",
  "gemma-north",
  "eden-dtla",
  "atlas-house",
  "the-met",
  "trademark-dtla",
];

describe("apartments data integrity", () => {
  it("has 30 apartments with unique ids", () => {
    expect(APARTMENTS.length).toBe(30);
    const ids = APARTMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every apartment carries the folded meta fields", () => {
    for (const apt of APARTMENTS) {
      expect([1, 2, 3, 4]).toContain(apt.valueScore);
      expect([1, 2, 3, 4, 5]).toContain(apt.luxuryScore);
      expect(Array.isArray(apt.funTags)).toBe(true);
      expect(apt.funTags.length).toBeGreaterThan(0);
      for (const tag of apt.funTags) expect(typeof tag).toBe("string");
      // rankBoost is optional but, when present, must be a non-negative number.
      if (apt.rankBoost !== undefined) {
        expect(typeof apt.rankBoost).toBe("number");
        expect(apt.rankBoost).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("STATIC_RANKING references only real apartment ids and covers all of them", () => {
    const ids = new Set(APARTMENTS.map((a) => a.id));
    expect(STATIC_RANKING.length).toBe(APARTMENTS.length);
    for (const entry of STATIC_RANKING) expect(ids.has(entry.id)).toBe(true);
    expect(new Set(STATIC_RANKING.map((r) => r.id)).size).toBe(STATIC_RANKING.length);
  });

  it("STATIC_RANKING is sorted by score descending", () => {
    for (let i = 1; i < STATIC_RANKING.length; i++) {
      expect(STATIC_RANKING[i - 1].score).toBeGreaterThanOrEqual(STATIC_RANKING[i].score);
    }
  });

  it("ranking order matches the pinned pre-refactor order (marquee parity)", () => {
    expect(STATIC_RANKING.map((r) => r.id)).toEqual(EXPECTED_RANKING_IDS);
  });

  it("scores equal rankBoost + summed reddit-seed scores", () => {
    for (const entry of STATIC_RANKING) {
      const apt = APARTMENTS.find((a) => a.id === entry.id)!;
      const expected =
        (apt.rankBoost ?? 0) + apt.redditSeeds.reduce((s, r) => s + r.score, 0);
      expect(entry.score).toBe(expected);
    }
  });
});
