import { describe, it, expect } from "vitest";
import {
  parseSectionTimes,
  slotsConflict,
  findConflicts,
  formatTime,
  formatDays,
} from "../conflicts";
import type { SectionTime, TimeSlot, SelectedSection } from "../types";

describe("parseSectionTimes", () => {
  it("parses MWF section times", () => {
    const times: SectionTime[] = [
      { day: "MWF", start_time: "10:00", end_time: "10:50", location: "" },
    ];
    const slots = parseSectionTimes(times);
    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({ day: "Mon", startMin: 600, endMin: 650 });
    expect(slots[1]).toEqual({ day: "Wed", startMin: 600, endMin: 650 });
    expect(slots[2]).toEqual({ day: "Fri", startMin: 600, endMin: 650 });
  });

  it("parses TH (Tuesday/Thursday) section times", () => {
    const times: SectionTime[] = [
      { day: "TH", start_time: "14:00", end_time: "15:50", location: "" },
    ];
    const slots = parseSectionTimes(times);
    expect(slots).toHaveLength(2);
    expect(slots[0].day).toBe("Tue");
    expect(slots[1].day).toBe("Thu");
  });

  it("skips TBA sections", () => {
    const times: SectionTime[] = [
      { day: "TBA", start_time: "", end_time: "", location: "" },
    ];
    expect(parseSectionTimes(times)).toHaveLength(0);
  });

  it("skips sections with missing time data", () => {
    const times: SectionTime[] = [
      { day: "MWF", start_time: "", end_time: "", location: "" },
    ];
    expect(parseSectionTimes(times)).toHaveLength(0);
  });
});

describe("slotsConflict", () => {
  it("detects overlapping time slots on same day", () => {
    const a: TimeSlot = { day: "Mon", startMin: 600, endMin: 650 };
    const b: TimeSlot = { day: "Mon", startMin: 630, endMin: 720 };
    expect(slotsConflict(a, b)).toBe(true);
  });

  it("returns false for non-overlapping same day", () => {
    const a: TimeSlot = { day: "Mon", startMin: 600, endMin: 650 };
    const b: TimeSlot = { day: "Mon", startMin: 650, endMin: 720 };
    expect(slotsConflict(a, b)).toBe(false);
  });

  it("returns false for different days", () => {
    const a: TimeSlot = { day: "Mon", startMin: 600, endMin: 650 };
    const b: TimeSlot = { day: "Tue", startMin: 600, endMin: 650 };
    expect(slotsConflict(a, b)).toBe(false);
  });

  it("detects containment (one slot inside another)", () => {
    const a: TimeSlot = { day: "Wed", startMin: 480, endMin: 720 };
    const b: TimeSlot = { day: "Wed", startMin: 540, endMin: 600 };
    expect(slotsConflict(a, b)).toBe(true);
  });
});

describe("findConflicts", () => {
  const makeSection = (
    day: string,
    start: number,
    end: number,
  ): SelectedSection =>
    ({
      timeSlots: [{ day, startMin: start, endMin: end }],
    }) as unknown as SelectedSection;

  it("finds conflicting sections", () => {
    const existing = [
      makeSection("Mon", 600, 650),
      makeSection("Tue", 600, 650),
    ];
    const newSlots: TimeSlot[] = [{ day: "Mon", startMin: 630, endMin: 720 }];
    const conflicts = findConflicts(newSlots, existing);
    expect(conflicts).toHaveLength(1);
  });

  it("returns empty when no conflicts", () => {
    const existing = [makeSection("Mon", 600, 650)];
    const newSlots: TimeSlot[] = [{ day: "Tue", startMin: 600, endMin: 650 }];
    expect(findConflicts(newSlots, existing)).toHaveLength(0);
  });
});

describe("formatTime", () => {
  it("formats AM times", () => {
    expect(formatTime("9:00")).toBe("9:00 AM");
    expect(formatTime("11:30")).toBe("11:30 AM");
  });

  it("formats PM times", () => {
    expect(formatTime("13:00")).toBe("1:00 PM");
    expect(formatTime("15:30")).toBe("3:30 PM");
  });

  it("handles noon and midnight", () => {
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("0:00")).toBe("12:00 AM");
  });

  it("returns TBA for empty input", () => {
    expect(formatTime("")).toBe("TBA");
  });
});

describe("formatDays", () => {
  it("formats MWF", () => {
    expect(formatDays("MWF")).toBe("Mon/Wed/Fri");
  });

  it("formats TH", () => {
    expect(formatDays("TH")).toBe("Tue/Thu");
  });

  it("returns TBA for TBA input", () => {
    expect(formatDays("TBA")).toBe("TBA");
    expect(formatDays("")).toBe("TBA");
  });
});
