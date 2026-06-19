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

import type {
  Course,
  RmpRating,
  SelectedSection,
} from "../../../shared/course-types";

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

export interface SavedScheduleSummary {
  id: string;
  name: string;
  semester: string;
  created_at: string;
}

/** Full saved schedule, as returned by GET /api/schedules?id=<id>. */
export interface SavedScheduleDetail extends SavedScheduleSummary {
  courses: string[];
  preferences: Record<string, unknown> | null;
  schedule_data: { sections: SelectedSection[] };
}

// ─── Message types between content script / popup and background worker ───

export type BackgroundMessage =
  | { type: "RMP_BATCH"; names: string[] }
  | { type: "COURSEBIN_DETAILS"; courses: string[]; semester: string }
  | { type: "GE_COURSES"; category: string; semester: string }
  | { type: "RECOMMEND"; interests: string; semester: string; units?: string }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: ExtensionSettings }
  | { type: "AUTH_SIGN_IN" }
  | { type: "AUTH_SIGN_OUT" }
  | { type: "AUTH_GET_EMAIL" }
  | {
      type: "SAVE_SCHEDULE";
      name?: string;
      semester: string;
      courses: string[];
      schedule_data: Record<string, unknown>;
    }
  | { type: "LIST_SCHEDULES" }
  | { type: "GET_SCHEDULE"; id: string };

export type BackgroundResponse =
  | { type: "RMP_BATCH_RESULT"; ratings: Record<string, RmpRating | null> }
  | { type: "COURSEBIN_RESULT"; courses: Course[] }
  | { type: "GE_RESULT"; courses: Course[] }
  | { type: "RECOMMEND_RESULT"; recommendations: RecommendedCourse[] }
  | { type: "SETTINGS_RESULT"; settings: ExtensionSettings }
  | { type: "ERROR"; error: string }
  | { type: "AUTH_RESULT"; email: string | null }
  | { type: "SAVE_SCHEDULE_RESULT"; id: string }
  | { type: "LIST_SCHEDULES_RESULT"; schedules: SavedScheduleSummary[] }
  | { type: "GET_SCHEDULE_RESULT"; schedule: SavedScheduleDetail }
  | { type: "AUTH_REQUIRED" };

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
