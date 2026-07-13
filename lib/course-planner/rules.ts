// Re-exports the section-classification / filtering / scoring primitives, now
// owned by shared/section-rules.ts so the framework-free schedule solver (and the
// Chrome extension) can consume them without importing from lib/. Kept as a stable
// import path for existing site consumers (SectionRow, ResultsView, tests).
//
// Header last reviewed: 2026-07-07
export type { SectionStatus, UsabilityPrefs } from "@/shared/section-rules";
export {
  classifySection,
  isSectionUsable,
  sectionHitsBlockedDay,
  withinTimeWindow,
  rmpScore,
  comboIsUsable,
} from "@/shared/section-rules";
