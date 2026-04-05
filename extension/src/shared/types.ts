// ─── Re-export shared types ───
export type {
  SectionTime,
  TimeSlot,
  DayOfWeek,
  Section,
  Course,
  RmpRating,
  SelectedSection,
} from "../../../shared/course-types";

import type { Course, RmpRating } from "../../../shared/course-types";

// ─── Extension-only types ───

export interface RecommendedCourse {
  department: string;
  number: string;
  title: string;
  units: string;
  description: string;
  relevanceScore: number;
  matchReasons: string[];
  geTag?: string;
}

// ─── Message types between content script / popup and background worker ───

export type BackgroundMessage =
  | { type: "RMP_BATCH"; names: string[] }
  | { type: "COURSEBIN_DETAILS"; courses: string[]; semester: string }
  | { type: "GE_COURSES"; category: string; semester: string }
  | { type: "RECOMMEND"; interests: string; semester: string; units?: string }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: ExtensionSettings };

export type BackgroundResponse =
  | { type: "RMP_BATCH_RESULT"; ratings: Record<string, RmpRating | null> }
  | { type: "COURSEBIN_RESULT"; courses: Course[] }
  | { type: "GE_RESULT"; courses: Course[] }
  | { type: "RECOMMEND_RESULT"; recommendations: RecommendedCourse[] }
  | { type: "SETTINGS_RESULT"; settings: ExtensionSettings }
  | { type: "ERROR"; error: string };

export interface ExtensionSettings {
  showRmpRatings: boolean;
  highlightConflicts: boolean;
  showSeatCounts: boolean;
  semester: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  showRmpRatings: true,
  highlightConflicts: true,
  showSeatCounts: true,
  semester: "20263",
};
