// ─── Shared course types (web app + Chrome extension) ───

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
