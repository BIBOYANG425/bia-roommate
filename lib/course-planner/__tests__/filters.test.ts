/**
 * Unit tests for the shared course-planner filters (RG3). These replaced the
 * duplicated level-literal blocks (recommend + agent-stream routes) and the
 * per-file units filter (agent + recommender), so lock the level bands and the
 * "4.0" vs "4" units normalization here.
 */

import { describe, it, expect } from "vitest";
import { filterByLevel, filterByUnits } from "../filters";

const courses = [
  { number: "101", units: "4" },
  { number: "250", units: "2.0" },
  { number: "310", units: "4.0" },
  { number: "499", units: "2" },
  { number: "520", units: "3" },
  { number: "TOPICS", units: "4" }, // non-numeric number → always kept by level
];

describe("filterByLevel", () => {
  it("returns everything when level is undefined", () => {
    expect(filterByLevel(courses, undefined)).toBe(courses);
  });

  it("lower = 100–299", () => {
    expect(filterByLevel(courses, "lower").map((c) => c.number)).toEqual([
      "101",
      "250",
      "TOPICS",
    ]);
  });

  it("upper = 300–499", () => {
    expect(filterByLevel(courses, "upper").map((c) => c.number)).toEqual([
      "310",
      "499",
      "TOPICS",
    ]);
  });

  it("graduate = 500+", () => {
    expect(filterByLevel(courses, "graduate").map((c) => c.number)).toEqual([
      "520",
      "TOPICS",
    ]);
  });

  it("keeps everything for an unrecognized level value", () => {
    expect(filterByLevel(courses, "bogus")).toHaveLength(courses.length);
  });
});

describe("filterByUnits", () => {
  it("returns everything when units is undefined", () => {
    expect(filterByUnits(courses, undefined)).toBe(courses);
  });

  it("normalizes '4.0' vs '4' via unitsMatch", () => {
    const four = filterByUnits(courses, "4").map((c) => c.number);
    expect(four).toEqual(["101", "310", "TOPICS"]);
  });

  it("matches 2-unit courses written as '2' and '2.0'", () => {
    const two = filterByUnits(courses, "2").map((c) => c.number);
    expect(two).toEqual(["250", "499"]);
  });

  it("drops null/empty units", () => {
    const items = [
      { number: "1", units: null },
      { number: "2", units: "" },
      { number: "3", units: "4" },
    ];
    expect(filterByUnits(items, "4").map((c) => c.number)).toEqual(["3"]);
  });
});
