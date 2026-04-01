// ─── Shared types between extension and BIA web app ───

export interface SectionTime {
  day: string
  start_time: string
  end_time: string
  location: string
}

export interface TimeSlot {
  day: DayOfWeek
  startMin: number
  endMin: number
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'

export interface Section {
  id: string
  type: 'Lecture' | 'Discussion' | 'Lab' | 'Quiz' | string
  number: string
  times: SectionTime[]
  instructor: {
    firstName: string
    lastName: string
  }
  registered: number
  capacity: number
  isClosed: boolean
  isCancelled: boolean
  topic?: string
  hasDClearance?: boolean
  notes?: string
  linkCode?: string
}

export interface Course {
  department: string
  number: string
  title: string
  units: string
  description: string
  sections: Section[]
  prereqs?: string
  restrictions?: string[]
}

export interface RmpRating {
  avgRating: number
  avgDifficulty: number
  numRatings: number
  wouldTakeAgainPercent: number
  legacyId: number
}

export interface SelectedSection {
  courseId: string
  courseTitle: string
  units: string
  section: Section
  colorIndex: number
  timeSlots: TimeSlot[]
}

export interface RecommendedCourse {
  department: string
  number: string
  title: string
  units: string
  description: string
  relevanceScore: number
  matchReasons: string[]
  geTag?: string
}

// ─── Message types between content script / popup and background worker ───

export type BackgroundMessage =
  | { type: 'RMP_BATCH'; names: string[] }
  | { type: 'COURSEBIN_DETAILS'; courses: string[]; semester: string }
  | { type: 'GE_COURSES'; category: string; semester: string }
  | { type: 'RECOMMEND'; interests: string; semester: string; units?: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: ExtensionSettings }

export type BackgroundResponse =
  | { type: 'RMP_BATCH_RESULT'; ratings: Record<string, RmpRating | null> }
  | { type: 'COURSEBIN_RESULT'; courses: Course[] }
  | { type: 'GE_RESULT'; courses: Course[] }
  | { type: 'RECOMMEND_RESULT'; recommendations: RecommendedCourse[] }
  | { type: 'SETTINGS_RESULT'; settings: ExtensionSettings }
  | { type: 'ERROR'; error: string }

export interface ExtensionSettings {
  showRmpRatings: boolean
  highlightConflicts: boolean
  showSeatCounts: boolean
  semester: string
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  showRmpRatings: true,
  highlightConflicts: true,
  showSeatCounts: true,
  semester: '20263',
}
