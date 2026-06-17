// Shared section-classification, filtering, and scoring primitives for the course
// planner. Single source of truth used by every schedule generator so that
// "full vs closed-registration", blocked-days, time-window, and RMP scoring stay
// consistent across surfaces.
//
// Header last reviewed: 2026-06-17

import type { Section, RmpRating, TimeSlot, DayOfWeek } from "./types";
import { parseSectionTimes } from "./conflicts";

export type SectionStatus = "cancelled" | "full" | "closed-reg" | "open";

/**
 * Classify a section. "full" = 0 seats left; "closed-reg" = registration closed
 * but seats may remain (d-clearance / waitlist). A closed-reg section is NOT full.
 * Full takes precedence when a section is both full and closed.
 */
export function classifySection(s: Section): SectionStatus {
  if (s.isCancelled) return "cancelled";
  if (s.capacity > 0 && s.registered >= s.capacity) return "full";
  if (s.isClosed) return "closed-reg";
  return "open";
}

export interface UsabilityPrefs {
  excludeFull: boolean;
  hideDClearance: boolean;
}

/**
 * Whether a section may appear in a generated schedule. Cancelled is always
 * dropped; full is dropped only when excludeFull is on; closed-reg is always
 * kept (still reachable via d-clearance / waitlist).
 */
export function isSectionUsable(s: Section, prefs: UsabilityPrefs): boolean {
  const status = classifySection(s);
  if (status === "cancelled") return false;
  if (status === "full" && prefs.excludeFull) return false;
  if (prefs.hideDClearance && s.hasDClearance) return false;
  return true;
}

/** True if any meeting of this section falls on a blocked day. */
export function sectionHitsBlockedDay(s: Section, blockedDays: DayOfWeek[]): boolean {
  if (blockedDays.length === 0) return false;
  return parseSectionTimes(s.times).some((slot) => blockedDays.includes(slot.day));
}

/** True if every slot starts no earlier than earliestMin and ends no later than doneByMin. */
export function withinTimeWindow(slots: TimeSlot[], earliestMin: number, doneByMin: number): boolean {
  return slots.every((s) => s.startMin >= earliestMin && s.endMin <= doneByMin);
}

/**
 * RMP-based score for ranking. Unknown professor → neutral 2.5. Closed-registration
 * sections get a -0.5 penalty so genuinely open sections win ties.
 */
export function rmpScore(s: Section, rmpCache: Record<string, RmpRating | null>): number {
  const key = `${s.instructor?.lastName}, ${s.instructor?.firstName}`;
  const rating = rmpCache[key];
  let score = rating ? rating.avgRating : 2.5;
  if (classifySection(s) === "closed-reg") score -= 0.5;
  return score;
}
