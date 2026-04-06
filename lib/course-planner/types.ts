// ─── Re-export shared types ───
export type {
  SectionTime,
  TimeSlot,
  DayOfWeek,
  Section,
  Course,
  RmpRating,
  SelectedSection,
} from "@/shared/course-types";

import type { Course, RmpRating, SelectedSection } from "@/shared/course-types";

// ─── USC Schedule of Classes API response shapes ───

export interface AutocompleteSuggestion {
  text: string;
  type: "department" | "course";
}

export interface SearchResult {
  department: string;
  number: string;
  title: string;
  units: string;
}

// ─── Schedule State ───

export interface Schedule {
  id: string;
  name: string;
  selectedSections: SelectedSection[];
  totalUnits: number;
}

export interface PlannerState {
  semester: string;
  schedules: Schedule[];
  activeScheduleId: string;
  searchQuery: string;
  searchResults: SearchResult[];
  expandedCourse: Course | null;
  rmpCache: Record<string, RmpRating | null>;
  isSearching: boolean;
  isLoadingCourse: boolean;
  isOptimizing: boolean;
  optimizeProgress: number; // 0-100
  error: string | null;
}

export type PlannerAction =
  | { type: "SET_SEMESTER"; semester: string }
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SET_SEARCH_RESULTS"; results: SearchResult[] }
  | { type: "SET_SEARCHING"; isSearching: boolean }
  | { type: "SET_EXPANDED_COURSE"; course: Course | null }
  | { type: "SET_LOADING_COURSE"; isLoading: boolean }
  | { type: "ADD_SECTION"; section: SelectedSection }
  | { type: "REMOVE_SECTION"; courseId: string; sectionId: string }
  | { type: "REMOVE_COURSE"; courseId: string }
  | { type: "REPLACE_ALL_SECTIONS"; sections: SelectedSection[] }
  | { type: "ADD_SCHEDULE"; name: string }
  | { type: "REMOVE_SCHEDULE"; scheduleId: string }
  | { type: "RENAME_SCHEDULE"; scheduleId: string; name: string }
  | { type: "SET_ACTIVE_SCHEDULE"; scheduleId: string }
  | { type: "CACHE_RMP"; key: string; rating: RmpRating | null }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_OPTIMIZING"; isOptimizing: boolean; progress?: number };
