import { describe, it, expect } from "vitest";
import { optimizeSchedule } from "../optimizer";
import type { Course, Section, RmpRating } from "../types";

function sec(id: string, lastName: string, day: string, start: string, end: string, over: Partial<Section> = {}): Section {
  return {
    id,
    type: "Lecture",
    number: id,
    times: [{ day, start_time: start, end_time: end, location: "" }],
    instructor: { firstName: "A", lastName },
    registered: 0,
    capacity: 30,
    isClosed: false,
    isCancelled: false,
    ...over,
  };
}

function course(department: string, sections: Section[]): Course {
  return { department, number: "100", title: "T", units: "4", description: "", sections };
}

const rating = (avgRating: number): RmpRating => ({ avgRating, avgDifficulty: 3, numRatings: 10, wouldTakeAgainPercent: 70, legacyId: 1 });

describe("optimizeSchedule", () => {
  it("excludes full sections and still places every course", () => {
    const courses: Course[] = [
      course("AAA", [sec("a1", "Good", "Mon", "10:00", "10:50")]),
      course("BBB", [
        sec("b-full", "Star", "Tue", "10:00", "10:50", { registered: 30, capacity: 30 }),
        sec("b-open", "Okay", "Tue", "12:00", "12:50"),
      ]),
    ];
    const rmpCache: Record<string, RmpRating | null> = {
      "Good, A": rating(5),
      "Star, A": rating(5), // full → must be excluded despite high rating
      "Okay, A": rating(3),
    };

    const result = optimizeSchedule({ courses, rmpCache, timeoutMs: 2000 });

    expect(result.sections).toHaveLength(2);
    const bSel = result.sections.find((s) => s.courseId === "BBB-100");
    expect(bSel?.section.id).toBe("b-open");
  });
});
