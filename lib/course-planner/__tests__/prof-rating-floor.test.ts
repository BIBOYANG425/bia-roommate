/**
 * Hard prof-rating floor (RG2 item 2). When the user sets a PROF BAR chip, a
 * course must have a rated professor at or above the floor to survive. Unrated
 * courses DROP — they can't prove they meet the bar. When no floor is set, the
 * list passes through untouched (soft RMP bonus applies elsewhere).
 */
import { describe, it, expect } from "vitest";
import { __test } from "../agent";
import { buildCourse } from "./fixtures";

const { applyProfRatingFloor } = __test;

describe("applyProfRatingFloor", () => {
  it("returns the list unchanged when floor is null", () => {
    const courses = [
      buildCourse({ department: "CSCI", number: "104", instructors: [] }),
      buildCourse({
        department: "CSCI",
        number: "270",
        instructors: [{ name: "A", rating: 2.0 }],
      }),
    ];
    expect(applyProfRatingFloor(courses, null)).toHaveLength(2);
  });

  it("keeps courses whose best prof meets the floor", () => {
    const courses = [
      buildCourse({
        department: "CSCI",
        number: "104",
        instructors: [{ name: "A", rating: 4.2 }],
      }),
      buildCourse({
        department: "CSCI",
        number: "270",
        instructors: [{ name: "B", rating: 3.1 }],
      }),
    ];
    const kept = applyProfRatingFloor(courses, 4.0);
    expect(kept.map((c) => c.number)).toEqual(["104"]);
  });

  it("keeps a course if ANY instructor meets the floor", () => {
    const courses = [
      buildCourse({
        department: "CSCI",
        number: "104",
        instructors: [
          { name: "Low", rating: 2.0 },
          { name: "High", rating: 4.5 },
        ],
      }),
    ];
    expect(applyProfRatingFloor(courses, 4.0)).toHaveLength(1);
  });

  it("DROPS courses with no rated professor when a floor is set", () => {
    const courses = [
      buildCourse({ department: "CSCI", number: "104", instructors: [] }),
      buildCourse({
        department: "CSCI",
        number: "270",
        instructors: [{ name: "Unrated" }], // no rating field
      }),
    ];
    expect(applyProfRatingFloor(courses, 3.5)).toEqual([]);
  });
});
