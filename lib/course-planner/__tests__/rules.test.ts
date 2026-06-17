import { describe, it, expect } from "vitest";
import {
  classifySection,
  isSectionUsable,
  sectionHitsBlockedDay,
  withinTimeWindow,
  rmpScore,
} from "../rules";
import type { Section, RmpRating, TimeSlot } from "../types";

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: "s1",
    type: "Lecture",
    number: "30001",
    times: [{ day: "MWF", start_time: "10:00", end_time: "10:50", location: "" }],
    instructor: { firstName: "Jane", lastName: "Doe" },
    registered: 10,
    capacity: 30,
    isClosed: false,
    isCancelled: false,
    ...overrides,
  };
}

describe("classifySection", () => {
  it("returns open for a section with seats and open registration", () => {
    expect(classifySection(makeSection())).toBe("open");
  });
  it("returns full when registered >= capacity", () => {
    expect(classifySection(makeSection({ registered: 30, capacity: 30 }))).toBe("full");
  });
  it("returns closed-reg when isClosed but seats remain", () => {
    expect(classifySection(makeSection({ isClosed: true, registered: 5, capacity: 30 }))).toBe("closed-reg");
  });
  it("returns cancelled regardless of seats", () => {
    expect(classifySection(makeSection({ isCancelled: true, registered: 0, capacity: 30 }))).toBe("cancelled");
  });
  it("prefers full over closed-reg when a section is both full and closed", () => {
    expect(classifySection(makeSection({ isClosed: true, registered: 30, capacity: 30 }))).toBe("full");
  });
});

describe("isSectionUsable", () => {
  const prefsKeepFull = { excludeFull: false, hideDClearance: false };
  const prefsExcludeFull = { excludeFull: true, hideDClearance: false };

  it("drops cancelled sections always", () => {
    expect(isSectionUsable(makeSection({ isCancelled: true }), prefsKeepFull)).toBe(false);
  });
  it("drops full sections only when excludeFull is on", () => {
    const full = makeSection({ registered: 30, capacity: 30 });
    expect(isSectionUsable(full, prefsKeepFull)).toBe(true);
    expect(isSectionUsable(full, prefsExcludeFull)).toBe(false);
  });
  it("always keeps closed-registration sections", () => {
    const closed = makeSection({ isClosed: true, registered: 5, capacity: 30 });
    expect(isSectionUsable(closed, prefsExcludeFull)).toBe(true);
  });
  it("drops D-clearance sections when hideDClearance is on", () => {
    const dclr = makeSection({ hasDClearance: true });
    expect(isSectionUsable(dclr, { excludeFull: false, hideDClearance: true })).toBe(false);
    expect(isSectionUsable(dclr, { excludeFull: false, hideDClearance: false })).toBe(true);
  });
});

describe("sectionHitsBlockedDay", () => {
  it("returns false when no days are blocked", () => {
    expect(sectionHitsBlockedDay(makeSection(), [])).toBe(false);
  });
  it("detects a section meeting on a blocked day", () => {
    expect(sectionHitsBlockedDay(makeSection(), ["Wed"])).toBe(true);
  });
  it("returns false when the section meets on no blocked day", () => {
    const tth = makeSection({ times: [{ day: "TH", start_time: "14:00", end_time: "15:50", location: "" }] });
    expect(sectionHitsBlockedDay(tth, ["Mon", "Wed", "Fri"])).toBe(false);
  });
});

describe("withinTimeWindow", () => {
  const slots: TimeSlot[] = [{ day: "Mon", startMin: 600, endMin: 650 }];
  it("returns true inside the window", () => {
    expect(withinTimeWindow(slots, 540, 1080)).toBe(true);
  });
  it("returns false when a slot starts before earliest", () => {
    expect(withinTimeWindow(slots, 660, 1080)).toBe(false);
  });
  it("returns false when a slot ends after doneBy", () => {
    expect(withinTimeWindow(slots, 540, 640)).toBe(false);
  });
});

describe("rmpScore", () => {
  const rating: RmpRating = { avgRating: 4.2, avgDifficulty: 3, numRatings: 50, wouldTakeAgainPercent: 80, legacyId: 1 };
  const cache: Record<string, RmpRating | null> = { "Doe, Jane": rating };

  it("returns the professor's avgRating when known", () => {
    expect(rmpScore(makeSection(), cache)).toBeCloseTo(4.2);
  });
  it("returns neutral 2.5 for an unknown professor", () => {
    expect(rmpScore(makeSection({ instructor: { firstName: "No", lastName: "Body" } }), cache)).toBe(2.5);
  });
  it("penalizes closed-registration sections by 0.5", () => {
    const closed = makeSection({ isClosed: true, registered: 5, capacity: 30 });
    expect(rmpScore(closed, cache)).toBeCloseTo(3.7);
  });
});
