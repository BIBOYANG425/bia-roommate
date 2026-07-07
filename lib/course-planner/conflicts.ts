// Re-exports the framework-free time-slot / conflict helpers, now owned by
// shared/schedule-conflicts.ts so the schedule solver and the Chrome extension
// can consume them without importing from lib/. Kept as a stable import path for
// existing site consumers (ResultsView, ResultCalendar, SectionRow, …).
export {
  parseSectionTimes,
  slotsConflict,
  findConflicts,
  formatTime,
  formatDays,
} from "@/shared/schedule-conflicts";
