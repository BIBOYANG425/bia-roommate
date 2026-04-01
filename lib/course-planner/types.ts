// ─── USC Schedule of Classes API response shapes ───

export interface AutocompleteSuggestion {
  text: string;
  type: "department" | "course";
}

export interface SectionTime {
  day: string; // "M", "T", "W", "H" (Thu), "F" — or combined like "MWF"
  start_time: string; // "10:00" (24hr) or empty for TBA
  end_time: string; // "11:50"
  location: string; // "THH 101"
}

export interface TimeSlot {
  day: DayOfWeek;
  startMin: number; // minutes from midnight
  endMin: number;
}

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export interface Section {
  id: string;
  type: "Lecture" | "Discussion" | "Lab" | "Quiz" | string;
  number: string; // e.g. "30001"
  times: SectionTime[];
  instructor: {
    firstName: string;
    lastName: string;
  };
  registered: number;
  capacity: number;
  isClosed: boolean;
  isCancelled: boolean;
  topic?: string; // Section-specific topic (e.g. "Advanced Writing for Engineers")
  hasDClearance?: boolean; // Requires department clearance
  notes?: string; // Additional notes (d-clearance instructions, etc.)
  linkCode?: string; // Links lecture with its lab/discussion/quiz (e.g. "A", "B")
}

export interface Course {
  department: string; // "CSCI"
  number: string; // "201"
  title: string; // "Principles of Software Development"
  units: string; // "4.0"
  description: string;
  sections: Section[];
  prereqs?: string; // e.g. "1 from (WRIT 130 or WRIT 150)"
  restrictions?: string[]; // Course/major/school restrictions
}

export interface SearchResult {
  department: string;
  number: string;
  title: string;
  units: string;
}

// ─── RateMyProfessors ───

export interface RmpRating {
  avgRating: number;
  avgDifficulty: number;
  numRatings: number;
  wouldTakeAgainPercent: number; // -1 if not enough data
  legacyId: number;
}

// ─── Schedule State ───

export interface SelectedSection {
  courseId: string; // "CSCI-201"
  courseTitle: string;
  units: string;
  section: Section;
  colorIndex: number;
  timeSlots: TimeSlot[];
}

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
