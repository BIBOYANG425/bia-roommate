/**
 * Unit tests for the 3 non-Reddit researchers:
 *   - researchUSCCatalog (catalog fetcher with dept / GE / term / level / units / year filters)
 *   - researchRMP (RateMyProfessors batch enrichment)
 *   - researchPeerRatings (BIA internal review aggregates)
 *
 * Previously these were the biggest coverage gap — Reddit had full
 * lockdown via PR #40 + PR #41 + PR #50, but the other 3 researchers
 * had ZERO unit tests. A regression in any of them (e.g. somebody
 * silently breaking the units filter, the level ceiling, or the
 * peer-rating threshold) would ship to production unnoticed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __test } from "../agent";
import type { InterpretedQuery } from "../agent/types";
import { buildCourse, jsonResponse } from "./fixtures";

const { researchUSCCatalog, researchRMP, researchPeerRatings, yearCeiling } =
  __test;

const NOOP_CATALOG: InterpretedQuery["catalogInstructions"] = {
  departments: [],
  geCategories: [],
  courseLevel: "any",
  unitsPreference: "any",
  searchTerms: [],
  filterNotes: "",
};

describe("yearCeiling", () => {
  it("freshman caps at 400, soph at 500, junior/senior at 600", () => {
    expect(yearCeiling("freshman")).toBe(400);
    expect(yearCeiling("soph")).toBe(500);
    expect(yearCeiling("junior")).toBe(600);
    expect(yearCeiling("senior")).toBe(600);
  });

  it("grad and null have no ceiling", () => {
    expect(yearCeiling("grad")).toBe(Infinity);
    expect(yearCeiling(null)).toBe(Infinity);
  });
});

describe("researchUSCCatalog", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => fetchSpy.mockRestore());

  it("fetches by department and de-duplicates across endpoints", async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("CoursesForDepartment") && url.includes("prefix=CSCI")) {
        return jsonResponse({
          courses: [
            {
              scheduledCourseCode: { prefix: "CSCI", number: "104" },
              name: "Data Structures",
              courseUnits: ["4"],
              description: "intro",
              sections: [],
            },
            {
              scheduledCourseCode: { prefix: "CSCI", number: "270" },
              name: "Algorithms",
              courseUnits: ["4"],
              description: "",
              sections: [],
            },
          ],
        });
      }
      return jsonResponse([]);
    });

    const courses = await researchUSCCatalog(
      { ...NOOP_CATALOG, departments: ["CSCI"] },
      "20263",
      "http://localhost",
    );

    expect(courses.map((c) => c.number).sort()).toEqual(["104", "270"]);
    // Re-fetching the same dept dataset shouldn't duplicate.
    const again = await researchUSCCatalog(
      { ...NOOP_CATALOG, departments: ["CSCI"] },
      "20263",
      "http://localhost",
    );
    expect(again).toHaveLength(2);
  });

  it("filters by year ceiling — freshman drops 400-level courses", async () => {
    fetchSpy.mockImplementation(async () =>
      jsonResponse({
        courses: [
          {
            scheduledCourseCode: { prefix: "CSCI", number: "104" },
            name: "Data Structures",
            courseUnits: ["4"],
          },
          {
            scheduledCourseCode: { prefix: "CSCI", number: "499" },
            name: "Advanced Topics",
            courseUnits: ["4"],
          },
          {
            scheduledCourseCode: { prefix: "CSCI", number: "560" },
            name: "Grad ML",
            courseUnits: ["4"],
          },
        ],
      }),
    );

    const courses = await researchUSCCatalog(
      { ...NOOP_CATALOG, departments: ["CSCI"] },
      "20263",
      "http://localhost",
      "freshman",
    );

    expect(courses.map((c) => c.number)).toEqual(["104"]);
  });

  it("filters by units — parseFloat handles '4' vs '4.0' equivalence", async () => {
    fetchSpy.mockImplementation(async () =>
      jsonResponse({
        courses: [
          {
            scheduledCourseCode: { prefix: "CSCI", number: "104" },
            name: "DS",
            courseUnits: ["4.0"],
          },
          {
            scheduledCourseCode: { prefix: "CSCI", number: "100" },
            name: "Intro",
            courseUnits: ["2"],
          },
        ],
      }),
    );

    const courses = await researchUSCCatalog(
      { ...NOOP_CATALOG, departments: ["CSCI"], unitsPreference: "4" },
      "20263",
      "http://localhost",
    );

    expect(courses.map((c) => c.number)).toEqual(["104"]);
  });

  it("tags courses with their GE category when fetched via GE endpoint", async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("GeCoursesByTerm")) {
        return jsonResponse({
          courses: [
            {
              scheduledCourseCode: { prefix: "HIST", number: "100" },
              name: "History 100",
              courseUnits: ["4"],
            },
          ],
        });
      }
      return jsonResponse([]);
    });

    const courses = await researchUSCCatalog(
      { ...NOOP_CATALOG, geCategories: ["GE-B"] },
      "20263",
      "http://localhost",
    );

    expect(courses[0].geTag).toBe("GE-B");
  });

  it("survives non-OK / thrown responses without crashing", async () => {
    fetchSpy.mockImplementation(async () => {
      throw new Error("ENETUNREACH");
    });

    const courses = await researchUSCCatalog(
      { ...NOOP_CATALOG, departments: ["CSCI"] },
      "20263",
      "http://localhost",
    );

    expect(courses).toEqual([]);
  });
});

describe("researchRMP", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => fetchSpy.mockRestore());

  it("injects rating/difficulty data onto instructors", async () => {
    // /api/rmp/batch wraps the keyed instructor map under `ratings` and uses
    // the avgRating / avgDifficulty / wouldTakeAgainPercent field names.
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        ratings: {
          "Jane Doe": {
            avgRating: 4.5,
            avgDifficulty: 2.5,
            numRatings: 25,
            wouldTakeAgainPercent: 90,
          },
        },
      }),
    );

    const courses = [
      buildCourse({ instructors: [{ name: "Jane Doe" }] }),
    ];

    await researchRMP(
      courses,
      {
        prioritize: "",
        difficultyTarget: "any",
        minimumRating: "any",
        lookFor: "",
      },
      "http://localhost",
    );

    expect(courses[0].instructors[0]).toMatchObject({
      rating: 4.5,
      difficulty: 2.5,
      wouldTakeAgain: 90,
    });
  });

  it("writes a best-prof entry into rmpHighlights when at least one prof has a rating", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        ratings: {
          "Jane Doe": {
            avgRating: 4.7,
            avgDifficulty: 2.1,
            wouldTakeAgainPercent: 92,
          },
        },
      }),
    );

    const courses = [
      buildCourse({ instructors: [{ name: "Jane Doe" }] }),
    ];

    await researchRMP(
      courses,
      {
        prioritize: "",
        difficultyTarget: "any",
        minimumRating: "any",
        lookFor: "",
      },
      "http://localhost",
    );

    expect(courses[0].rmpHighlights).toHaveLength(1);
    expect(courses[0].rmpHighlights[0]).toContain("Jane Doe");
    expect(courses[0].rmpHighlights[0]).toContain("4.7/5");
  });

  it("no-ops cleanly when there are no instructors to look up", async () => {
    const courses = [buildCourse({ instructors: [] })];

    await researchRMP(
      courses,
      {
        prioritize: "",
        difficultyTarget: "any",
        minimumRating: "any",
        lookFor: "",
      },
      "http://localhost",
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(courses[0].rmpHighlights).toEqual([]);
  });

  it("survives a non-OK RMP response without mutating courses", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("upstream down", { status: 503 }) as unknown as Response,
    );

    const courses = [
      buildCourse({ instructors: [{ name: "Jane Doe" }] }),
    ];

    await researchRMP(
      courses,
      {
        prioritize: "",
        difficultyTarget: "any",
        minimumRating: "any",
        lookFor: "",
      },
      "http://localhost",
    );

    expect(courses[0].instructors[0].rating).toBeUndefined();
    expect(courses[0].rmpHighlights).toEqual([]);
  });
});

describe("researchPeerRatings", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => fetchSpy.mockRestore());

  it("attaches peerRatings to courses with non-zero review counts", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        aggregates: {
          "CSCI-104": {
            avg_difficulty: 3.8,
            avg_workload: 4.2,
            avg_grading: 3.1,
            review_count: 12,
          },
        },
      }),
    );

    const courses = [
      buildCourse({ department: "CSCI", number: "104" }),
      buildCourse({ department: "CSCI", number: "270" }),
    ];

    await researchPeerRatings(courses, "http://localhost");

    expect(courses[0].peerRatings).toMatchObject({
      avgDifficulty: 3.8,
      reviewCount: 12,
    });
    expect(courses[1].peerRatings).toBeUndefined();
  });

  it("skips courses whose review_count is 0", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        aggregates: {
          "CSCI-104": {
            avg_difficulty: 0,
            avg_workload: 0,
            avg_grading: 0,
            review_count: 0,
          },
        },
      }),
    );

    const courses = [buildCourse({ department: "CSCI", number: "104" })];

    await researchPeerRatings(courses, "http://localhost");

    expect(courses[0].peerRatings).toBeUndefined();
  });

  it("silently swallows fetch errors (best-effort, not fatal)", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network down"));

    const courses = [buildCourse()];

    await expect(
      researchPeerRatings(courses, "http://localhost"),
    ).resolves.toBeUndefined();
    expect(courses[0].peerRatings).toBeUndefined();
  });

  it("no-ops when no courses are passed", async () => {
    await researchPeerRatings([], "http://localhost");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
