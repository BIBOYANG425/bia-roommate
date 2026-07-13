// Framework-free schedule solver hoisted verbatim from the web app's ResultsView
// (production behavior). Builds lecture+lab/discussion combos, backtracks across
// course groups honoring time-window / blocked-day / conflict constraints, shuffles
// rating-tied combos for diversity, and returns the top de-duplicated schedules.
// Consumed by components/course-planner/ResultsView.tsx (site) and the Chrome
// extension's ScheduleOptimizer. Imports only shared types + shared primitives —
// never lib/ — so both the Next build and the extension's tsc can compile it.
//
// Header last reviewed: 2026-07-07

import type { Course, Section, RmpRating, TimeSlot } from "./course-types";
import { parseSectionTimes, slotsConflict } from "./schedule-conflicts";
import { isSectionUsable, rmpScore, comboIsUsable } from "./section-rules";

export interface SolverPrefs {
  earliestClass?: string; // "HH:MM" or "" — no lower bound
  doneBy?: string; // "HH:MM" or "" — no upper bound
  excludeFull: boolean;
  blockedDays: readonly string[]; // DayOfWeek tokens ("Mon", "Tue", …)
  hideDClearance: boolean;
  hideGraduate: boolean;
  hideThematicOption: boolean;
}

export interface ScheduleSection {
  course: Course;
  section: Section;
  colorIndex: number;
  geTag?: string; // e.g. "GE-A" if this course fulfills a GE
}

export interface GeneratedSchedule {
  sections: ScheduleSection[];
  avgRating: number;
}

// A combo = a lecture plus its linked lab/discussion/quiz sections that must be
// taken together, with the union of their time slots and the lecture's rating.
export interface SectionCombo {
  course: Course;
  sections: Section[];
  allSlots: TimeSlot[];
  rating: number;
}

export interface CourseGroup {
  label: string;
  isGE: boolean;
  geTag?: string;
  combos: SectionCombo[];
}

export interface BuildSchedulesOptions {
  /** The original course selections, in display order. */
  selections: { id: string; label: string }[];
  /** Resolved USC courses per selection id. */
  selectionMap: Record<string, Course[]>;
  /** RMP ratings keyed by "LastName, FirstName" (empty → neutral scoring). */
  rmpCache: Record<string, RmpRating | null>;
  prefs: SolverPrefs;
  /** Number of course colors to cycle through (site + extension both use 8). */
  colorCount?: number;
  maxResults?: number;
  comboTimeoutMs?: number;
  /** Injectable clock (defaults to Date.now) — lets tests bypass the timeout. */
  now?: () => number;
  /** Injectable tie-shuffle (defaults to the seeded Fisher–Yates below). */
  shuffleTied?: <T extends { rating: number }>(arr: T[]) => T[];
  /** RNG for the default shuffle (defaults to Math.random). */
  random?: () => number;
}

export interface BuildSchedulesResult {
  schedules: GeneratedSchedule[];
  courseGroups: CourseGroup[];
}

// Shuffle combos with similar ratings (within 0.15) for diversity. Kept identical
// to the original inline implementation so the production ordering is preserved.
export function shuffleTiedWith<T extends { rating: number }>(
  arr: T[],
  random: () => number,
): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    // Only shuffle among items with similar ratings (within 0.15)
    let j = i;
    while (j > 0 && Math.abs(copy[j - 1].rating - copy[i].rating) < 0.15) j--;
    const swapIdx = j + Math.floor(random() * (i - j + 1));
    [copy[i], copy[swapIdx]] = [copy[swapIdx], copy[i]];
  }
  return copy;
}

export function buildSchedules(opts: BuildSchedulesOptions): BuildSchedulesResult {
  const { selections, selectionMap, rmpCache, prefs } = opts;
  const colorCount = opts.colorCount ?? 8;
  const maxResults = opts.maxResults ?? 5;
  const comboTimeoutMs = opts.comboTimeoutMs ?? 25000;
  const now = opts.now ?? (() => Date.now());
  const random = opts.random ?? Math.random;
  const shuffleTied =
    opts.shuffleTied ?? ((arr: SectionCombo[]) => shuffleTiedWith(arr, random));

  const getRating = (sec: Section): number => rmpScore(sec, rmpCache);

  // Parse time preference filters
  const earliestMin = prefs.earliestClass
    ? parseInt(prefs.earliestClass.split(":")[0]) * 60
    : 0;
  const doneByMin = prefs.doneBy
    ? parseInt(prefs.doneBy.split(":")[0]) * 60
    : 24 * 60;

  // Helper: check if a course number is graduate-level (500+)
  const isGraduateLevel = (num: string): boolean => {
    const n = parseInt(num.replace(/[^0-9]/g, ""), 10);
    return !isNaN(n) && n >= 500;
  };

  function buildCombos(course: Course): SectionCombo[] {
    // Keep full sections here so lecture/discussion type detection is correct
    // (a full lecture must still count as the "primary" type). excludeFull is
    // applied per-combo below via comboIsUsable, so a full lecture drops the
    // whole course instead of orphaning its discussion. Only drop cancelled +
    // (optionally) D-clearance at this stage.
    const allActive = (course.sections || []).filter((s) =>
      isSectionUsable(s, {
        excludeFull: false,
        hideDClearance: prefs.hideDClearance,
      }),
    );

    // Group by type
    const byType: Record<string, Section[]> = {};
    for (const s of allActive) {
      const type = (s.type || "Lecture").toLowerCase();
      if (!byType[type]) byType[type] = [];
      byType[type].push(s);
    }

    const types = Object.keys(byType);
    if (types.length === 0) return [];

    // Identify primary type (lecture) and secondary types (lab, discussion, quiz)
    const primaryKey = types.find((t) => t.includes("lecture")) || types[0];
    const secondaryKeys = types.filter((t) => t !== primaryKey);

    const primaries = byType[primaryKey] || [];
    if (primaries.length === 0) return [];

    // If no secondary types, each primary is its own combo
    if (secondaryKeys.length === 0) {
      return primaries
        .map((sec) => {
          const slots = parseSectionTimes(sec.times);
          return {
            course,
            sections: [sec],
            allSlots: slots,
            rating: getRating(sec),
          };
        })
        .filter(
          (c) =>
            c.allSlots.length > 0 &&
            comboIsUsable(c.sections, prefs.excludeFull),
        );
    }

    // Build combos: for each primary, find compatible secondaries
    const combos: SectionCombo[] = [];

    for (const primary of primaries) {
      const primarySlots = parseSectionTimes(primary.times);
      if (primarySlots.length === 0) continue;

      // Find matching secondaries for each type
      const secondaryOptions: Section[][] = secondaryKeys.map((key) => {
        const candidates = byType[key];
        // Filter by linkCode: match if same linkCode, or if either is null/empty
        return candidates.filter((s) => {
          if (!primary.linkCode && !s.linkCode) return true;
          if (!primary.linkCode || !s.linkCode) return true;
          return primary.linkCode === s.linkCode;
        });
      });

      // Check if any required secondary type has no compatible sections
      const hasRequired = secondaryKeys.every((key, i) => {
        // A secondary type is "required" if any section has time slots or is linked
        const hasTimed = byType[key].some(
          (s) => parseSectionTimes(s.times).length > 0 || !!s.linkCode,
        );
        return !hasTimed || secondaryOptions[i].length > 0;
      });
      if (!hasRequired) continue;

      // Generate combos: primary + one from each secondary type
      // For efficiency, limit secondary exploration
      function generateCombos(
        secIdx: number,
        current: Section[],
        currentSlots: TimeSlot[],
      ) {
        if (combos.length >= 30) return;
        if (secIdx >= secondaryKeys.length) {
          combos.push({
            course,
            sections: [primary, ...current],
            allSlots: [...currentSlots],
            rating: getRating(primary),
          });
          return;
        }

        const options = secondaryOptions[secIdx];
        // If no timed or linked sections for this type, skip it
        const timedOptions = options.filter(
          (s) => parseSectionTimes(s.times).length > 0 || !!s.linkCode,
        );
        if (timedOptions.length === 0) {
          generateCombos(secIdx + 1, current, currentSlots);
          return;
        }

        for (const sec of timedOptions.slice(0, 8)) {
          const slots = parseSectionTimes(sec.times);
          // Check internal conflicts
          const hasConflict = slots.some((a) =>
            currentSlots.some((b) => slotsConflict(a, b)),
          );
          if (hasConflict) continue;

          current.push(sec);
          currentSlots.push(...slots);
          generateCombos(secIdx + 1, current, currentSlots);
          current.pop();
          currentSlots.splice(
            currentSlots.length - slots.length,
            slots.length,
          );
        }
      }

      generateCombos(0, [], primarySlots);
    }

    // excludeFull is applied per-combo: a lecture+discussion combo is dropped
    // if any of its sections is full, so a full lecture removes the whole
    // course rather than leaving an orphan discussion.
    return combos.filter((c) => comboIsUsable(c.sections, prefs.excludeFull));
  }

  // Group courses by the original selection and build combos
  const courseGroups: CourseGroup[] = [];

  for (const sel of selections) {
    let matching = selectionMap[sel.id] || [];

    // Filter out graduate-level courses if preference is set
    if (prefs.hideGraduate) {
      matching = matching.filter((c) => !isGraduateLevel(c.number));
    }

    // Filter out Thematic Option (CORE) courses if preference is set
    if (prefs.hideThematicOption) {
      matching = matching.filter(
        (c) =>
          c.department.toUpperCase() !== "CORE" &&
          !c.title.toLowerCase().includes("thematic option"),
      );
    }

    if (matching.length > 0) {
      const isGE = sel.id.startsWith("GE-");
      const geTag = isGE ? sel.id : undefined;
      const allCombos: SectionCombo[] = [];

      for (const c of matching) {
        allCombos.push(...buildCombos(c));
      }

      // Sort by rating descending
      allCombos.sort((a, b) => b.rating - a.rating);

      if (allCombos.length > 0) {
        courseGroups.push({
          label: sel.label,
          isGE,
          geTag,
          combos: isGE ? allCombos.slice(0, 40) : allCombos,
        });
      }
    }
  }

  // Generate top schedules via backtracking with diversity
  const results: GeneratedSchedule[] = [];
  const timeout = now() + comboTimeoutMs;

  function backtrack(
    groupIdx: number,
    selected: ScheduleSection[],
    totalRating: number,
    usedSlots: TimeSlot[],
  ) {
    if (now() > timeout) return;
    if (results.length >= maxResults * 10) return;

    if (groupIdx >= courseGroups.length) {
      const ratingCount =
        selected.filter(
          (s) =>
            s.section.type.toLowerCase().includes("lecture") ||
            !s.section.type,
        ).length || selected.length;
      const avg = ratingCount > 0 ? totalRating / ratingCount : 0;
      results.push({
        sections: [...selected],
        avgRating: Math.round(avg * 100) / 100,
      });
      return;
    }

    const group = courseGroups[groupIdx];
    const baseSlice = group.isGE
      ? group.combos.slice(0, 20)
      : group.combos.slice(0, 15);
    const combosToTry = shuffleTied(baseSlice);

    for (const combo of combosToTry) {
      // Check time preferences for all slots
      const meetsPrefs = combo.allSlots.every(
        (s) => s.startMin >= earliestMin && s.endMin <= doneByMin,
      );
      if (!meetsPrefs && (prefs.earliestClass || prefs.doneBy)) continue;

      // Blocked-days: skip any combo meeting on a day the user blocked.
      if (
        prefs.blockedDays.length > 0 &&
        combo.allSlots.some((s) => prefs.blockedDays.includes(s.day))
      ) {
        continue;
      }

      // Check conflicts with already-selected sections
      const hasConflict = combo.allSlots.some((newSlot) =>
        usedSlots.some((existing) => slotsConflict(existing, newSlot)),
      );
      if (hasConflict) continue;

      // Add all sections in the combo
      const newEntries: ScheduleSection[] = combo.sections.map((sec) => ({
        course: combo.course,
        section: sec,
        colorIndex: groupIdx % colorCount,
        geTag: group.geTag,
      }));

      selected.push(...newEntries);
      const newSlots = [...usedSlots, ...combo.allSlots];

      backtrack(groupIdx + 1, selected, totalRating + combo.rating, newSlots);

      selected.splice(selected.length - newEntries.length, newEntries.length);

      // If we already have enough results, stop exploring this group
      if (results.length >= maxResults * 10) return;
    }
  }

  backtrack(0, [], 0, []);

  // Sort by average rating and deduplicate, then take top maxResults
  results.sort((a, b) => b.avgRating - a.avgRating);
  const seen = new Set<string>();
  const top: GeneratedSchedule[] = [];
  for (const r of results) {
    const key = r.sections
      .map((s) => s.section.id)
      .sort()
      .join(",");
    if (!seen.has(key)) {
      seen.add(key);
      top.push(r);
    }
    if (top.length >= maxResults) break;
  }

  return { schedules: top, courseGroups };
}
