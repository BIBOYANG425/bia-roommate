# Course Planner — Slots, Alternates, Filters & Seat Freshness

**Date:** 2026-06-17
**Status:** Approved design (pre-implementation)
**Repo:** bia-roommate (uscbia.com)
**Scope:** Web course planner only. Chrome extension WebReg overlay is explicitly deferred to a follow-up.

## Problem

The course planner currently has three divergent schedule generators and several
requested features that are unbuilt or inconsistent:

- `lib/course-planner/optimizer.ts` (`optimizeSchedule`) — used by `OptimizeButton.tsx`, returns one best schedule.
- `components/course-planner/ResultsView.tsx` (`buildCombos` / `backtrack`) — the **live planner page** generator (`mode="results"`), returns many ranked options.
- `extension/src/popup/components/ScheduleOptimizer.tsx` — the Chrome extension's own copy.

Each re-implements full-section filtering, RMP scoring, and conflict detection with
subtle differences. As a result:

- "Exclude full sections" is **hardcoded always-on** with no user toggle, and the web
  generator (`ResultsView.buildCombos`) does **not** filter full sections the way
  `optimizer.ts` does.
- **Closed-registration** sections (registration closed / D-clearance, seats may remain)
  can be mislabeled as **FULL** and wrongly dropped.
- **Blocked days** is entirely unbuilt.
- **Alternates** (interchangeable courses per slot) and **multiple of the same GE
  category** are unbuilt; GE categories are actively de-duplicated today.
- **Seat availability** is stale up to 1 hour: `lib/course-planner/course-cache.ts` has a
  1-hour in-memory TTL that masks the shorter HTTP cache headers.
- A latent bug: `conflicts.ts` `DAY_MAP` lookup is case-sensitive and assumes single-char
  day tokens, so non-uppercase/multi-char tokens silently drop time slots.

## Goals

Build four feature clusters on a shared, tested foundation, applied to the web planner:

1. **Seat freshness + exclude-full toggle** (keep closed-registration).
2. **Blocked days + correct section-exclusion behavior** (try another section of the same
   course; never drop the whole course just because one section is full).
3. **Alternates per slot** (≤4 interchangeable courses, algorithm picks best by RMP).
4. **Multiple of the same GE category** (a GE category becomes a repeatable slot).

## Non-goals

- Chrome extension WebReg overlay parity (follow-up).
- Real-time seat updates / live polling (best-effort ≤10-min freshness is sufficient).
- Implementing `preferBackToBack` (currently a dead checkbox — it will be **removed**).
- Weekend blocked-days (USC classes are effectively Mon–Fri).

## Design

### 1. Unified slot model

Replace `selectedCourses: { id: string; label: string }[]` (page-local, capped at 6) with
`slots: Slot[]` (still capped at 6 slots). A slot means "one class you need; pick exactly
one course + section for it."

```ts
type SlotKind = "course" | "ge";

interface CourseRef {
  id: string;               // "DEPT-NUM"
  label: string;
  pinnedSectionId?: string; // GESM/WRIT pinned-topic case (preserves DEPT-NUM@sectionId)
}

interface Slot {
  id: string;               // stable uuid
  kind: SlotKind;
  label: string;
  candidates: CourseRef[];  // kind "course": 1 primary + up to 4 alternates (1–5, interchangeable)
  geCategory?: string;      // kind "ge": e.g. "GE-B"; candidate set = catalog courses in the category
}
```

- **Alternates** = a `course` slot with 2–5 `candidates`. The generator picks whichever
  fits with the best RMP — there is no inherent "primary" preference.
- **Multiple same-GE** = two `ge` slots with the same `geCategory`. Allowed; the generator
  must resolve them to **distinct courses**.
- **GESM/WRIT pinned topic** = a `candidate` carrying `pinnedSectionId`.
- **Course distinctness:** no course may fill two slots in the same generated schedule.
- Adding alternates does **not** consume the 6-slot budget; only slots do.

### 2. Shared rule primitives — new `lib/course-planner/rules.ts` (unit-tested)

Single source of truth, imported by `ResultsView` **and** `optimizer.ts`:

- `classifySection(s) → "cancelled" | "full" | "closed-reg" | "open"`
  - **cancelled** = `s.isCancelled`
  - **full** = `s.capacity > 0 && s.registered >= s.capacity` (and not cancelled)
  - **closed-reg** = `s.isClosed && !full` (and not cancelled)
  - **open** otherwise
  This is the fix for "closed registration looks full but isn't."
- `isSectionUsable(s, prefs) → boolean`
  - always drop **cancelled**
  - drop **full** only when `prefs.excludeFull` is on
  - **always keep closed-reg**
  - applies existing `hideDClearance` / `hideGraduate` / `hideThematicOption`
- `sectionHitsBlockedDay(s, blockedDays) → boolean`
- `withinTimeWindow(slots, earliestMin, doneByMin) → boolean`
- `rmpScore(s, rmpCache) → number` — closed-reg keeps the **−0.5** penalty so open
  sections win ties.
- `resolveSlotCandidates(slot, catalog) → Course[]` — returns the candidate course list for
  a slot (explicit list for `course`, category lookup for `ge`).

### 3. Day-parsing fix — `lib/course-planner/conflicts.ts`

`parseSectionTimes` and `formatDays` uppercase the day token before the `DAY_MAP` lookup
and tolerate multi-char tokens, fixing the silent-drop bug. Blocked-days reuse the same
`DayOfWeek` mapping so there is no second source of truth.

### 4. Schedule generation flow

Generalize the existing per-course backtracking to **per-slot**:

For each slot: resolve candidate courses → for each candidate, its **usable** sections
(filtered by the `rules.ts` primitives + blocked-days + time-window). Backtrack picking one
`(course, section)` per slot such that:

- no time conflict with already-placed sections,
- the chosen course is not already used by another slot (distinctness),

scoring each placement by `rmpScore` (closed-reg penalized) and maximizing total RMP.
Return the top-N **distinct** schedules ranked by total RMP. Same algorithm shape as today,
extended to (a) iterate candidates within a slot and (b) enforce cross-slot course
distinctness.

A schedule requires **all slots filled** — alternates and GE categories provide the
flexibility to fill them.

### 5. Preferences & UI

Extend `SchedulePrefs` (stays page-local; already passed to the generator):

- **`excludeFull: boolean` (default `true`)** — "Only schedules with open seats." Toggle in
  `SchedulePreferences.tsx`. Drops full sections, keeps closed-reg.
- **`blockedDays: DayOfWeek[]` (default `[]`)** — Mon–Fri chip row. Hard constraint.
- **Remove** the dead `preferBackToBack` control.

UI additions:

- **Alternates:** each `course` slot row in the selected-courses list gets a
  **"+ alternative"** affordance (scoped search), showing up to 4 alternate chips. GE slots
  have no alternates UI (the category is the candidate set).
- **Multiple same-GE:** `GEGrid` stops disabling an already-picked category; re-selecting
  adds another `ge` slot (shown as e.g. "GE-B ×2"), respecting the 6-slot cap.
- **Closed-reg labeling:** `SectionRow` / `CourseDetail` use `classifySection`, so a
  closed-registration section renders the **CLOSED REG** badge and never shows "FULL."

### 6. Seat freshness (10-minute refresh)

- `lib/course-planner/course-cache.ts`: drop `CACHE_TTL` from 1 hour to **10 minutes**
  (`600_000` ms) for seat-bearing course/section data.
- Section/seat endpoints (course detail, coursebin, GE): upstream
  `fetch(..., { next: { revalidate: 600 } })` and HTTP `s-maxage=600`.
- No live client polling — fresh on load + ≤10-min server cache. Document that seats are
  best-effort fresh, not real-time.

### 7. Edge cases & error handling

- **No schedule fits** (a slot has 0 usable sections after filters): generation returns a
  helpful message naming the blocking slot, e.g. "No schedule fits — try turning off
  *Exclude full sections* or removing a blocked day."
- Pinned GESM/WRIT section that is full while `excludeFull` is on → that slot can't fill →
  same message.
- Alternates / multi-GE distinctness deadlocks resolve via backtracking trying other
  candidates.
- Unknown professor RMP → neutral 2.5 (unchanged).

### 8. Testing

- **`rules.ts` unit tests:** `classifySection` (full vs closed-reg vs cancelled vs open),
  `isSectionUsable` with `excludeFull` on/off, `sectionHitsBlockedDay`, `withinTimeWindow`,
  `rmpScore` penalty.
- **`conflicts.ts` regression:** lowercase / uppercase / multi-char day tokens (the
  silent-drop bug).
- **Generation tests:** alternates pick best-RMP-that-fits; multi-GE picks distinct
  courses; blocked-days excludes; `excludeFull` drops full but keeps closed-reg; cross-slot
  distinctness; the "no fit" path.
- Keep existing `conflicts.test.ts`; add the lowercase-day case.

## Implementation order (build all four, land safely)

1. `rules.ts` + `conflicts.ts` day-fix + tests; refactor `ResultsView` and `optimizer.ts`
   to use the primitives (no behavior change).
2. Seat freshness (isolated, low risk).
3. `excludeFull` toggle + closed-reg labeling.
4. Blocked-days preference.
5. Slot model + alternates + multiple same-GE (largest; threads the new `slots` shape
   through `page.tsx` → `ManualSearch` → `ResultsView`).

## Out of scope / follow-ups

- Chrome extension WebReg overlay parity with the shared primitives.
- Real-time seat updates.
- RMP auth hardening (the public `Basic dGVzdDp0ZXN0` token is fragile) — noted during the
  audit but separate from this work.
