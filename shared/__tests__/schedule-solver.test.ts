import { describe, it, expect } from "vitest";
import {
  buildSchedules,
  shuffleTiedWith,
  type SolverPrefs,
} from "../schedule-solver";
import type { Course, Section, RmpRating } from "../course-types";

function sec(
  id: string,
  day: string,
  start: string,
  end: string,
  over: Partial<Section> = {},
): Section {
  return {
    id,
    type: "Lecture",
    number: id,
    times: start ? [{ day, start_time: start, end_time: end, location: "" }] : [],
    instructor: { firstName: "A", lastName: id },
    registered: 0,
    capacity: 30,
    isClosed: false,
    isCancelled: false,
    ...over,
  };
}

function course(
  department: string,
  number: string,
  sections: Section[],
): Course {
  return {
    department,
    number,
    title: `${department} ${number}`,
    units: "4",
    description: "",
    sections,
  };
}

const BASE_PREFS: SolverPrefs = {
  earliestClass: "",
  doneBy: "",
  excludeFull: true,
  blockedDays: [],
  hideDClearance: false,
  hideGraduate: false,
  hideThematicOption: false,
};

function run(
  courses: Course[],
  opts: Partial<Parameters<typeof buildSchedules>[0]> = {},
) {
  const selections = courses.map((c) => ({
    id: `${c.department}-${c.number}`,
    label: `${c.department} ${c.number}`,
  }));
  const selectionMap: Record<string, Course[]> = {};
  for (const c of courses) selectionMap[`${c.department}-${c.number}`] = [c];
  return buildSchedules({
    selections,
    selectionMap,
    rmpCache: {},
    prefs: BASE_PREFS,
    // Deterministic: identity shuffle keeps the rating-sorted order.
    shuffleTied: (arr) => arr,
    ...opts,
  });
}

describe("buildSchedules — conflict handling", () => {
  it("returns no schedule when the only sections of two courses overlap", () => {
    const a = course("AAA", "100", [sec("a1", "Mon", "10:00", "10:50")]);
    const b = course("BBB", "100", [sec("b1", "Mon", "10:00", "10:50")]);
    const { schedules } = run([a, b]);
    expect(schedules.length).toBe(0);
  });

  it("places both courses when a non-conflicting section exists", () => {
    const a = course("AAA", "100", [sec("a1", "Mon", "10:00", "10:50")]);
    const b = course("BBB", "100", [
      sec("b1", "Mon", "10:00", "10:50"), // conflicts with a1
      sec("b2", "Tue", "10:00", "10:50"), // free
    ]);
    const { schedules } = run([a, b]);
    expect(schedules.length).toBeGreaterThanOrEqual(1);
    const top = schedules[0];
    expect(top.sections.map((s) => s.section.id).sort()).toEqual(["a1", "b2"]);
  });

  it("allows back-to-back sections that touch at the boundary", () => {
    const a = course("AAA", "100", [sec("a1", "Mon", "10:00", "11:00")]);
    const b = course("BBB", "100", [sec("b1", "Mon", "11:00", "12:00")]);
    const { schedules } = run([a, b]);
    expect(schedules.length).toBeGreaterThanOrEqual(1);
    expect(schedules[0].sections).toHaveLength(2);
  });

  it("honors blocked days", () => {
    const a = course("AAA", "100", [sec("a1", "Mon", "10:00", "10:50")]);
    const blocked = run([a], { prefs: { ...BASE_PREFS, blockedDays: ["Mon"] } });
    expect(blocked.schedules.length).toBe(0);
    const open = run([a]);
    expect(open.schedules.length).toBeGreaterThanOrEqual(1);
  });
});

describe("buildSchedules — scoring & determinism", () => {
  it("ranks by RMP rating and exposes courseGroups for swapping", () => {
    const rmpCache: Record<string, RmpRating | null> = {
      "hi, A": { avgRating: 4.8, avgDifficulty: 2, numRatings: 10, wouldTakeAgainPercent: 90, legacyId: 1 },
      "lo, A": { avgRating: 1.2, avgDifficulty: 4, numRatings: 10, wouldTakeAgainPercent: 20, legacyId: 2 },
    };
    const a = course("AAA", "100", [
      sec("lo", "Tue", "10:00", "10:50", { instructor: { firstName: "A", lastName: "lo" } }),
      sec("hi", "Mon", "10:00", "10:50", { instructor: { firstName: "A", lastName: "hi" } }),
    ]);
    const selections = [{ id: "AAA-100", label: "AAA 100" }];
    const { schedules, courseGroups } = buildSchedules({
      selections,
      selectionMap: { "AAA-100": [a] },
      rmpCache,
      prefs: BASE_PREFS,
      shuffleTied: (arr) => arr,
    });
    // Highest-rated section wins the top schedule.
    expect(schedules[0].sections[0].section.id).toBe("hi");
    expect(schedules[0].avgRating).toBeCloseTo(4.8, 5);
    // courseGroups is returned (used by the swap UI) with combos rating-sorted.
    expect(courseGroups).toHaveLength(1);
    expect(courseGroups[0].combos[0].rating).toBeGreaterThanOrEqual(
      courseGroups[0].combos[1].rating,
    );
  });

  it("is deterministic when the shuffle is injected", () => {
    const a = course("AAA", "100", [
      sec("a1", "Mon", "9:00", "9:50"),
      sec("a2", "Tue", "9:00", "9:50"),
    ]);
    const first = run([a]);
    const second = run([a]);
    expect(first.schedules.map((s) => s.sections[0].section.id)).toEqual(
      second.schedules.map((s) => s.sections[0].section.id),
    );
    // Identity shuffle preserves the rating-sorted order → a1 (defined first) first.
    expect(first.schedules[0].sections[0].section.id).toBe("a1");
  });

  it("tags GE selections with their geTag", () => {
    const geCourse = course("PHIL", "140", [sec("p1", "Wed", "13:00", "13:50")]);
    const { schedules } = buildSchedules({
      selections: [{ id: "GE-B", label: "GE-B" }],
      selectionMap: { "GE-B": [geCourse] },
      rmpCache: {},
      prefs: BASE_PREFS,
      shuffleTied: (arr) => arr,
    });
    expect(schedules[0].sections[0].geTag).toBe("GE-B");
  });
});

describe("shuffleTiedWith", () => {
  it("is a deterministic permutation for a fixed RNG", () => {
    const items = [
      { rating: 1, id: "a" },
      { rating: 1, id: "b" },
      { rating: 1, id: "c" },
      { rating: 1, id: "d" },
    ];
    const rng = () => 0; // fixed RNG → same output every call
    const out1 = shuffleTiedWith(items, rng);
    const out2 = shuffleTiedWith(items, rng);
    expect(out1.map((x) => x.id)).toEqual(out2.map((x) => x.id));
    expect([...out1].map((x) => x.id).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("does not reorder items whose ratings differ by more than 0.15", () => {
    const items = [
      { rating: 5, id: "top" },
      { rating: 1, id: "bot" },
    ];
    // Even with a max RNG, the 0.15 tie-window prevents swapping across the gap.
    const out = shuffleTiedWith(items, () => 0.999999);
    expect(out.map((x) => x.id)).toEqual(["top", "bot"]);
  });
});
