import type { ExtensionSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export const BIA_API_BASE = "https://bia-roommate.vercel.app";

/** Keep in sync with manifest.json and vite built manifest */
export const EXTENSION_VERSION = "1.0.2";

/** USC term codes: YYYY + 1/2/3 = Spring / Summer / Fall */
export const SEMESTER_OPTIONS = [
  { value: "20261", label: "Spring 2026" },
  { value: "20262", label: "Summer 2026" },
  { value: "20263", label: "Fall 2026" },
  { value: "20271", label: "Spring 2027" },
  { value: "20272", label: "Summer 2027" },
  { value: "20273", label: "Fall 2027" },
] as const;

/** Maps stored semester to a known term code (migrates old or invalid values). */
export function normalizeSemesterCode(value: string): string {
  return SEMESTER_OPTIONS.some((o) => o.value === value)
    ? value
    : DEFAULT_SETTINGS.semester;
}

export function normalizeSettingsSemester(
  settings: ExtensionSettings,
): ExtensionSettings {
  const semester = normalizeSemesterCode(settings.semester);
  return semester === settings.semester ? settings : { ...settings, semester };
}

export const USC_SCHOOL_ID = "U2Nob29sLTEzODE="; // RMP school ID for USC (School-1381)

export const RMP_BADGE_COLORS = {
  great: "#4CAF50", // 4.0 – 5.0
  average: "#FFC107", // 3.0 – 3.9
  below: "#FF9800", // 2.0 – 2.9
  poor: "#F44336", // 0.0 – 1.9
  none: "#9E9E9E", // No data
} as const;

export function getRmpColor(rating: number | null): string {
  if (rating === null) return RMP_BADGE_COLORS.none;
  if (rating >= 4.0) return RMP_BADGE_COLORS.great;
  if (rating >= 3.0) return RMP_BADGE_COLORS.average;
  if (rating >= 2.0) return RMP_BADGE_COLORS.below;
  return RMP_BADGE_COLORS.poor;
}

export const COURSE_COLORS = [
  { bg: "#990000", text: "#FFFFFF" },
  { bg: "#014B83", text: "#FFFFFF" },
  { bg: "#2D6A4F", text: "#FFFFFF" },
  { bg: "#7B2D8E", text: "#FFFFFF" },
  { bg: "#B85C00", text: "#FFFFFF" },
  { bg: "#1A1410", text: "#FFCC00" },
  { bg: "#8C1515", text: "#FFFFFF" },
  { bg: "#005F73", text: "#FFFFFF" },
] as const;

export function getNextColorIndex(usedIndices: number[]): number {
  for (let i = 0; i < COURSE_COLORS.length; i++) {
    if (!usedIndices.includes(i)) return i;
  }
  return usedIndices.length % COURSE_COLORS.length;
}
