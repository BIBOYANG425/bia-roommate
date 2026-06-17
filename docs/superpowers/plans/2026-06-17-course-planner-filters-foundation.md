# Course Planner Filters Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared section-rules foundation and ship three user-visible course-planner improvements — an "exclude full sections" toggle (keeping closed-registration), a blocked-days preference, and 10-minute seat freshness — while fixing the day-parsing bug.

**Architecture:** Introduce one tested module, `lib/course-planner/rules.ts`, that is the single source of truth for section classification (full vs closed-registration vs cancelled vs open), usability filtering, blocked-day and time-window checks, and RMP scoring. Refactor the existing generators (`optimizer.ts`, `ResultsView.tsx`) and section UI (`SectionRow`, `CourseDetail`) to consume it. This kills the divergence between the three schedule generators for the rules that matter.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Vitest. Repo: `bia-roommate`. Branch: `feat/course-planner-slots-filters`.

**Scope note / decomposition:** This plan covers slices 1–4 of the approved spec (`docs/superpowers/specs/2026-06-17-course-planner-slots-filters-design.md`). Slice 5 — the unified **slot model** (alternates per slot + multiple-same-GE), a large rewrite of the `ResultsView` generation core — is intentionally deferred to a **second plan** to be written after this foundation lands, since its exact shape depends on `rules.ts` existing. The four selected clusters map as: exclude-full + seat freshness (here), blocked-days (here), alternates (Plan 2), multiple-same-GE (Plan 2).

**Correction vs spec:** The spec assumed `lib/course-planner/course-cache.ts` caches seat data; investigation shows it caches the **search index** (`CourseEntry[]`, no seats). The real seat-staleness offender is the GE API route (`revalidate: 3600`). Task 4 fixes that instead.

---

### Task 1: Shared rule primitives (`rules.ts`)

**Files:**
- Create: `lib/course-planner/rules.ts`
- Test: `lib/course-planner/__tests__/rules.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/course-planner/__tests__/rules.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/course-planner/__tests__/rules.test.ts`
Expected: FAIL — `Failed to resolve import "../rules"`.

- [ ] **Step 3: Write the implementation**

Create `lib/course-planner/rules.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/course-planner/__tests__/rules.test.ts`
Expected: PASS — all `rules.test.ts` cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/course-planner/rules.ts lib/course-planner/__tests__/rules.test.ts
git commit -m "feat(course-planner): shared section rule primitives (rules.ts)"
```

---

### Task 2: Fix day-parsing case sensitivity (`conflicts.ts`)

**Files:**
- Modify: `lib/course-planner/conflicts.ts:21-36` (`parseSectionTimes`) and `:69-75` (`formatDays`)
- Test: `lib/course-planner/__tests__/conflicts.test.ts` (add cases)

- [ ] **Step 1: Write the failing test**

Add these cases inside the existing `describe("parseSectionTimes", ...)` block in `lib/course-planner/__tests__/conflicts.test.ts` (after the "skips sections with missing time data" test):

```ts
  it("parses lowercase day tokens (regression: silent slot drop)", () => {
    const times: SectionTime[] = [
      { day: "mwf", start_time: "10:00", end_time: "10:50", location: "" },
    ];
    const slots = parseSectionTimes(times);
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.day)).toEqual(["Mon", "Wed", "Fri"]);
  });
```

And add this case inside the existing `describe("formatDays", ...)` block:

```ts
  it("formats lowercase tokens", () => {
    expect(formatDays("th")).toBe("Tue/Thu");
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/course-planner/__tests__/conflicts.test.ts`
Expected: FAIL — lowercase `"mwf"` yields 0 slots (DAY_MAP has only uppercase keys), and `formatDays("th")` returns `"th"`.

- [ ] **Step 3: Write the implementation**

In `lib/course-planner/conflicts.ts`, replace the `parseSectionTimes` function (lines 21-36) with:

```ts
export function parseSectionTimes(times: SectionTime[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (const t of times) {
    if (!t.start_time || !t.end_time || !t.day) continue;
    const dayToken = t.day.toUpperCase();
    if (dayToken === "TBA") continue;

    const startMin = parseTimeToMinutes(t.start_time);
    const endMin = parseTimeToMinutes(t.end_time);

    for (const dayChar of dayToken.split("")) {
      const day = DAY_MAP[dayChar];
      if (day) slots.push({ day, startMin, endMin });
    }
  }
  return slots;
}
```

And replace `formatDays` (lines 69-75) with:

```ts
export function formatDays(day: string): string {
  if (!day || day.toUpperCase() === "TBA") return "TBA";
  return day
    .toUpperCase()
    .split("")
    .map((c) => DAY_MAP[c] || c)
    .join("/");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/course-planner/__tests__/conflicts.test.ts`
Expected: PASS — all conflicts cases green, including the new lowercase ones.

- [ ] **Step 5: Commit**

```bash
git add lib/course-planner/conflicts.ts lib/course-planner/__tests__/conflicts.test.ts
git commit -m "fix(course-planner): uppercase day tokens before DAY_MAP lookup"
```

---

### Task 3: Refactor `optimizer.ts` onto `rules.ts` (behavior-preserving)

**Files:**
- Modify: `lib/course-planner/optimizer.ts:1-82`
- Test: `lib/course-planner/__tests__/optimizer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/course-planner/__tests__/optimizer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails or passes against current code**

Run: `npx vitest run lib/course-planner/__tests__/optimizer.test.ts`
Expected: PASS against the current implementation (it already excludes full). This test is the **behavior-preservation guard** for the refactor in Step 3 — keep it green.

- [ ] **Step 3: Refactor the implementation onto `rules.ts`**

In `lib/course-planner/optimizer.ts`:

1. Replace the import block / top (lines 1-9) — add the `rules` import and drop the now-unused `RmpRating` only if it becomes unused (it is still used in `OptimizeInput`, so keep it):

Change line 8 area so the file imports from `./rules`. After the existing `import { parseSectionTimes, slotsConflict } from "./conflicts";` line, add:

```ts
import { isSectionUsable, rmpScore } from "./rules";
```

2. Delete the local `getRmpScore` function (lines 24-32 in the original).

3. Replace the `courseSections` mapping (original lines 63-82) with:

```ts
  const courseSections = courses.map((course) => {
    const courseId = `${course.department}-${course.number}`;
    return {
      course,
      courseId,
      sections: [...(course.sections || [])]
        .filter((s) => isSectionUsable(s, { excludeFull: true, hideDClearance: false }))
        .map((s) => ({
          section: s,
          slots: parseSectionTimes(s.times),
          score: rmpScore(s, rmpCache),
        }))
        .sort((a, b) => b.score - a.score), // highest rated first
    };
  });
```

(Note: `rmpScore` applies the closed-registration −0.5 penalty internally, replacing the old separate `if (s.isClosed) score -= 0.5;` — behavior preserved.)

- [ ] **Step 4: Run the test + full suite to verify behavior is unchanged**

Run: `npx vitest run lib/course-planner/__tests__/optimizer.test.ts`
Expected: PASS.
Run: `npx vitest run`
Expected: PASS — whole suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/course-planner/optimizer.ts lib/course-planner/__tests__/optimizer.test.ts
git commit -m "refactor(course-planner): optimizer uses shared rules primitives"
```

---

### Task 4: Seat freshness — 10-minute revalidate on the GE route

**Files:**
- Create: `lib/course-planner/cache-config.ts`
- Modify: `app/api/courses/ge/route.ts:71` and `:115`
- Test: `lib/course-planner/__tests__/cache-config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/course-planner/__tests__/cache-config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SEAT_REVALIDATE_SECONDS } from "../cache-config";

describe("seat freshness contract", () => {
  it("refreshes seat-bearing data at most every 10 minutes", () => {
    expect(SEAT_REVALIDATE_SECONDS).toBeLessThanOrEqual(600);
    expect(SEAT_REVALIDATE_SECONDS).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/course-planner/__tests__/cache-config.test.ts`
Expected: FAIL — `Failed to resolve import "../cache-config"`.

- [ ] **Step 3: Write the constant and apply it to the GE route**

Create `lib/course-planner/cache-config.ts`:

```ts
// Seat-bearing course/section data refreshes from USC at most this often. The
// course planner shows seat counts, so this caps how stale they can be.
//
// Header last reviewed: 2026-06-17

export const SEAT_REVALIDATE_SECONDS = 600; // 10 minutes
```

In `app/api/courses/ge/route.ts`:

Add the import after the existing imports at the top (after line 2):

```ts
import { SEAT_REVALIDATE_SECONDS } from "@/lib/course-planner/cache-config";
```

Change the upstream fetch (line 71) from:

```ts
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
```

to:

```ts
    const res = await fetch(apiUrl, { next: { revalidate: SEAT_REVALIDATE_SECONDS } });
```

Change the response header (line 115) from:

```ts
      headers: { "Cache-Control": "public, s-maxage=3600" },
```

to:

```ts
      headers: { "Cache-Control": `public, s-maxage=${SEAT_REVALIDATE_SECONDS}` },
```

- [ ] **Step 4: Run the test + typecheck**

Run: `npx vitest run lib/course-planner/__tests__/cache-config.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/course-planner/cache-config.ts lib/course-planner/__tests__/cache-config.test.ts app/api/courses/ge/route.ts
git commit -m "fix(course-planner): refresh GE seat data every 10 min (was 1 hour)"
```

(Course-detail and coursebin routes are already at `s-maxage=300`, within the 10-minute window — no change needed.)

---

### Task 5: `excludeFull` preference + remove dead `preferBackToBack`

**Files:**
- Modify: `app/course-planner/page.tsx:20-27` (`SchedulePrefs` interface) and `:38-45` (default state)
- Modify: `components/course-planner/SchedulePreferences.tsx:94-106`

No unit test (the project has no component-test infra; the squad-phase3 work scoped React component tests out). Verify via typecheck + a reference grep + manual smoke.

- [ ] **Step 1: Update the `SchedulePrefs` type and default**

In `app/course-planner/page.tsx`, change the `SchedulePrefs` interface (lines 20-27) from:

```ts
export interface SchedulePrefs {
  earliestClass: string;
  doneBy: string;
  preferBackToBack: boolean;
  hideDClearance: boolean;
  hideGraduate: boolean;
  hideThematicOption: boolean;
}
```

to:

```ts
export interface SchedulePrefs {
  earliestClass: string;
  doneBy: string;
  excludeFull: boolean;
  hideDClearance: boolean;
  hideGraduate: boolean;
  hideThematicOption: boolean;
}
```

Change the default `useState` (lines 38-45) from:

```ts
  const [prefs, setPrefs] = useState<SchedulePrefs>({
    earliestClass: "",
    doneBy: "",
    preferBackToBack: false,
    hideDClearance: false,
    hideGraduate: false,
    hideThematicOption: false,
  });
```

to:

```ts
  const [prefs, setPrefs] = useState<SchedulePrefs>({
    earliestClass: "",
    doneBy: "",
    excludeFull: true,
    hideDClearance: false,
    hideGraduate: false,
    hideThematicOption: false,
  });
```

- [ ] **Step 2: Replace the dead checkbox with the `excludeFull` toggle**

In `components/course-planner/SchedulePreferences.tsx`, replace the `preferBackToBack` label block (lines 94-106) with:

```tsx
        <label className="flex items-center gap-2 cursor-pointer mt-4 sm:mt-0">
          <input
            type="checkbox"
            checked={prefs.excludeFull}
            onChange={(e) =>
              onChange({ ...prefs, excludeFull: e.target.checked })
            }
            className="w-4 h-4 accent-(--cardinal)"
          />
          <span className="text-sm" style={{ color: "var(--black)" }}>
            Only schedules with open seats
          </span>
        </label>
```

- [ ] **Step 3: Verify no dangling references + typecheck**

Run: `git grep -n preferBackToBack -- 'app/**' 'components/**' 'lib/**'`
Expected: no matches (only the spec doc may still mention it — that is fine).
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/course-planner/page.tsx components/course-planner/SchedulePreferences.tsx
git commit -m "feat(course-planner): excludeFull toggle, remove dead preferBackToBack"
```

---

### Task 6: Wire `excludeFull` + closed-reg classification into generation and section UI

**Files:**
- Modify: `components/course-planner/ResultsView.tsx:5-6` (imports), `:191-194` (`getRating`), `:218-224` (`buildCombos` filter), `:905-915` (status text)
- Modify: `components/course-planner/SectionRow.tsx:3-4` (import) and `:24-29` (status flags)
- Modify: `components/course-planner/CourseDetail.tsx:1-9` (import) and `:29-37` (hide-full loop)

The schedule-generation rule itself is already unit-tested via `isSectionUsable` (Task 1). This task wires it in. Verify via typecheck + manual smoke.

- [ ] **Step 1: Route `ResultsView` generation through the primitives**

In `components/course-planner/ResultsView.tsx`:

Add to the imports near line 5-6:

```ts
import { classifySection, isSectionUsable, rmpScore } from "@/lib/course-planner/rules";
```

Replace `getRating` (lines 191-194) from:

```ts
      const getRating = (sec: Section): number => {
        const key = `${sec.instructor?.lastName}, ${sec.instructor?.firstName}`;
        return rmpCache[key]?.avgRating ?? 2.5;
      };
```

to:

```ts
      const getRating = (sec: Section): number => rmpScore(sec, rmpCache);
```

Replace the `buildCombos` opening filter (lines 218-224) from:

```ts
      function buildCombos(course: Course, _geTag?: string): SectionCombo[] {
        let allActive = (course.sections || []).filter((s) => !s.isCancelled);

        // Filter out D-clearance sections if preference is set
        if (prefs.hideDClearance) {
          allActive = allActive.filter((s) => !s.hasDClearance);
        }
```

to:

```ts
      function buildCombos(course: Course, _geTag?: string): SectionCombo[] {
        // Apply section usability rules: always drop cancelled; drop full when the
        // excludeFull preference is on; keep closed-registration; honor hideDClearance.
        const allActive = (course.sections || []).filter((s) =>
          isSectionUsable(s, {
            excludeFull: prefs.excludeFull,
            hideDClearance: prefs.hideDClearance,
          }),
        );
```

- [ ] **Step 2: Route the section-card status text through `classifySection`**

In `components/course-planner/ResultsView.tsx`, replace the status ternary (lines 905-915) from:

```tsx
                  <p className="text-sm mb-2" style={{ color: "var(--mid)" }}>
                    {timeDisplay} |{" "}
                    {s.section.isCancelled
                      ? "CANCELLED"
                      : s.section.capacity > 0 &&
                          s.section.registered >= s.section.capacity
                        ? "FULL"
                        : s.section.isClosed
                          ? `CLOSED REG · ${s.section.registered}/${s.section.capacity} seats`
                          : `${s.section.registered}/${s.section.capacity} seats`}
                  </p>
```

to:

```tsx
                  <p className="text-sm mb-2" style={{ color: "var(--mid)" }}>
                    {timeDisplay} |{" "}
                    {(() => {
                      const st = classifySection(s.section);
                      if (st === "cancelled") return "CANCELLED";
                      if (st === "full") return "FULL";
                      if (st === "closed-reg")
                        return `CLOSED REG · ${s.section.registered}/${s.section.capacity} seats`;
                      return `${s.section.registered}/${s.section.capacity} seats`;
                    })()}
                  </p>
```

- [ ] **Step 3: Route `SectionRow` status flags through `classifySection`**

In `components/course-planner/SectionRow.tsx`, add to the imports (after line 4):

```ts
import { classifySection } from "@/lib/course-planner/rules";
```

Replace the status flag computation (lines 24-29) from:

```ts
  const isFull =
    section.capacity > 0 && section.registered >= section.capacity;
  // "Closed registration" — admin-closed but seats may remain (d-clearance,
  // waitlist, etc.). When a section is both closed and full, show FULL.
  const isClosedReg = section.isClosed && !isFull && !section.isCancelled;
  const dim = section.isCancelled || isFull || isClosedReg;
```

to:

```ts
  // Single source of truth: a closed-registration section is NOT full even when
  // it looks like it (seats may remain via d-clearance / waitlist).
  const status = classifySection(section);
  const isFull = status === "full";
  const isClosedReg = status === "closed-reg";
  const dim = section.isCancelled || isFull || isClosedReg;
```

- [ ] **Step 4: Route `CourseDetail` hide-full through `classifySection`**

In `components/course-planner/CourseDetail.tsx`, add to the imports (after line 9):

```ts
import { classifySection } from "@/lib/course-planner/rules";
```

Replace the section-grouping loop guard (lines 30-33) from:

```ts
  for (const sec of course.sections || []) {
    if (sec.capacity > 0 && sec.registered >= sec.capacity && !sec.isCancelled) {
      continue;
    }
```

to:

```ts
  for (const sec of course.sections || []) {
    // Hide truly-full sections; keep closed-registration and cancelled visible.
    if (classifySection(sec) === "full") {
      continue;
    }
```

- [ ] **Step 5: Typecheck, full test suite, manual smoke**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx vitest run`
Expected: PASS.
Manual: `pnpm dev`, open `/course-planner`, add a course known to have a full section, toggle "Only schedules with open seats" off then on, and confirm a closed-registration section shows the **CLOSED REG** badge (never "FULL").

- [ ] **Step 6: Commit**

```bash
git add components/course-planner/ResultsView.tsx components/course-planner/SectionRow.tsx components/course-planner/CourseDetail.tsx
git commit -m "feat(course-planner): apply excludeFull + closed-reg classification across generation and UI"
```

---

### Task 7: Blocked-days preference

**Files:**
- Modify: `app/course-planner/page.tsx` (`SchedulePrefs` interface + default + `DayOfWeek` import)
- Modify: `components/course-planner/SchedulePreferences.tsx` (chip row + `DayOfWeek` import)
- Modify: `components/course-planner/ResultsView.tsx` (`backtrack` blocked-day guard)

Generation logic is `DayOfWeek`-typed and the membership check is simple; verify via typecheck + manual smoke (no component-test infra).

- [ ] **Step 1: Add `blockedDays` to the type and default**

In `app/course-planner/page.tsx`, add the import near the top type imports:

```ts
import type { DayOfWeek } from "@/lib/course-planner/types";
```

Add `blockedDays` to the `SchedulePrefs` interface (it should now read):

```ts
export interface SchedulePrefs {
  earliestClass: string;
  doneBy: string;
  excludeFull: boolean;
  blockedDays: DayOfWeek[];
  hideDClearance: boolean;
  hideGraduate: boolean;
  hideThematicOption: boolean;
}
```

Add `blockedDays: []` to the default `useState` object so it reads:

```ts
  const [prefs, setPrefs] = useState<SchedulePrefs>({
    earliestClass: "",
    doneBy: "",
    excludeFull: true,
    blockedDays: [],
    hideDClearance: false,
    hideGraduate: false,
    hideThematicOption: false,
  });
```

- [ ] **Step 2: Add the blocked-days chip row to `SchedulePreferences`**

In `components/course-planner/SchedulePreferences.tsx`, add the import after line 3:

```ts
import type { DayOfWeek } from "@/lib/course-planner/types";
```

Add this block immediately before the closing `</div>` of the outer preferences container (after the hide-* row that ends at line 154, before line 155's `</div>`):

```tsx
      <div
        className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t"
        style={{ borderColor: "var(--beige)" }}
      >
        <span
          className="font-display text-[11px] tracking-wider"
          style={{ color: "var(--black)" }}
        >
          BLOCK DAYS
        </span>
        {(["Mon", "Tue", "Wed", "Thu", "Fri"] as DayOfWeek[]).map((day) => {
          const active = prefs.blockedDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() =>
                onChange({
                  ...prefs,
                  blockedDays: active
                    ? prefs.blockedDays.filter((d) => d !== day)
                    : [...prefs.blockedDays, day],
                })
              }
              className="px-3 py-1 text-xs font-display tracking-wider border-[2px]"
              style={{
                borderColor: "var(--black)",
                background: active ? "var(--cardinal)" : "white",
                color: active ? "white" : "var(--black)",
                borderRadius: "16px",
              }}
            >
              {day.toUpperCase()}
            </button>
          );
        })}
      </div>
```

- [ ] **Step 3: Enforce blocked days in `ResultsView` generation**

In `components/course-planner/ResultsView.tsx`, inside `backtrack`, add a blocked-day guard at the top of the `for (const combo of combosToTry)` loop — immediately after the `meetsPrefs` check (after line 448, before the conflict check at line 451):

```ts
          // Blocked-days: skip any combo meeting on a day the user blocked.
          if (
            prefs.blockedDays.length > 0 &&
            combo.allSlots.some((s) =>
              (prefs.blockedDays as string[]).includes(s.day),
            )
          ) {
            continue;
          }
```

(`combo.allSlots[].day` is a `DayOfWeek` string produced by `parseSectionTimes`, so the membership check lines up with `prefs.blockedDays`.)

- [ ] **Step 4: Typecheck, full suite, manual smoke**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx vitest run`
Expected: PASS.
Manual: `pnpm dev`, open `/course-planner`, add a few courses, block e.g. **FRI**, build, and confirm no generated schedule contains a Friday meeting.

- [ ] **Step 5: Commit**

```bash
git add app/course-planner/page.tsx components/course-planner/SchedulePreferences.tsx components/course-planner/ResultsView.tsx
git commit -m "feat(course-planner): blocked-days preference excludes classes on chosen days"
```

---

## Self-Review

**Spec coverage (slices 1–4):**
- Shared `rules.ts` primitives → Task 1. ✓
- Day-parsing fix → Task 2. ✓
- `optimizer.ts` onto primitives → Task 3. ✓ (`ResultsView` onto primitives → Tasks 6–7.)
- Seat freshness 10-min → Task 4. ✓
- `excludeFull` toggle (default on, keep closed-reg) → Tasks 5–6. ✓
- Closed-reg never shown as FULL → Task 6 (`SectionRow`, `CourseDetail`, `ResultsView` status). ✓
- Remove dead `preferBackToBack` → Task 5. ✓
- Blocked-days preference → Task 7. ✓
- Slice 5 (slot model: alternates + multiple-same-GE) → **deferred to Plan 2** (noted in header). ✓

**Type consistency:** `classifySection`, `isSectionUsable`, `sectionHitsBlockedDay`, `withinTimeWindow`, `rmpScore` names match across Tasks 1, 3, 6, 7. `UsabilityPrefs` (`{ excludeFull, hideDClearance }`) is the exact shape passed in Tasks 3 and 6. `SchedulePrefs` gains `excludeFull` (Task 5) then `blockedDays` (Task 7); both consumed in Tasks 6–7. `SEAT_REVALIDATE_SECONDS` defined and used in Task 4.

**Placeholder scan:** none — every code step shows complete code and exact commands.

**Note on `sectionHitsBlockedDay` / `withinTimeWindow`:** these primitives are unit-tested in Task 1 and available for reuse; `ResultsView` currently enforces blocked-days inline over `combo.allSlots` (Task 7 Step 3) and time-window via its existing `meetsPrefs` check. Plan 2's slot-model rewrite will consolidate generation fully onto the primitives.
