import type { Course, Section, SelectedSection, RmpRating, TimeSlot } from './types'
import { parseSectionTimes, slotsConflict } from './conflicts'
import { getNextColorIndex } from './colors'

interface OptimizeInput {
  courses: Course[]
  rmpCache: Record<string, RmpRating | null>
  onProgress?: (pct: number) => void
  timeoutMs?: number
}

interface OptimizeResult {
  sections: SelectedSection[]
  score: number
  explored: number
}

function getRmpScore(section: Section, rmpCache: Record<string, RmpRating | null>): number {
  const key = `${section.instructor?.lastName}, ${section.instructor?.firstName}`
  const rating = rmpCache[key]
  if (!rating) return 2.5 // neutral default for unknown professors
  return rating.avgRating
}

function hasConflictWithSelected(
  slots: TimeSlot[],
  selectedSlots: TimeSlot[]
): boolean {
  for (const a of slots) {
    for (const b of selectedSlots) {
      if (slotsConflict(a, b)) return true
    }
  }
  return false
}

export function optimizeSchedule({
  courses,
  rmpCache,
  onProgress,
  timeoutMs = 30000,
}: OptimizeInput): OptimizeResult {
  const startTime = Date.now()
  let bestScore = -1
  let bestSections: SelectedSection[] = []
  let explored = 0
  let iterations = 0

  // Pre-compute: for each course, get viable sections sorted by RMP rating
  const courseSections = courses.map((course) => {
    const courseId = `${course.department}-${course.number}`
    return {
      course,
      courseId,
      sections: [...(course.sections || [])]
        .filter((s) => !s.isCancelled)
        .map((s) => ({
          section: s,
          slots: parseSectionTimes(s.times),
          score: getRmpScore(s, rmpCache),
        }))
        .sort((a, b) => b.score - a.score), // highest rated first
    }
  })

  const totalCombinations = courseSections.reduce(
    (acc, cs) => acc * Math.max(cs.sections.length, 1),
    1
  )

  // Backtracking search
  const current: SelectedSection[] = []
  const currentSlots: TimeSlot[] = []

  function backtrack(courseIdx: number, currentScore: number) {
    // Timeout check
    if (Date.now() - startTime > timeoutMs) return

    // All courses assigned — record solution
    if (courseIdx >= courseSections.length) {
      explored++
      if (currentScore > bestScore) {
        bestScore = currentScore
        bestSections = [...current]
      }
      return
    }

    const cs = courseSections[courseIdx]

    // Upper bound pruning: even if all remaining get 5.0, can we beat best?
    const remainingCourses = courseSections.length - courseIdx
    const maxPossible = currentScore + remainingCourses * 5.0
    if (maxPossible <= bestScore) return

    // Try each section for this course
    for (const candidate of cs.sections) {
      iterations++
      // Report progress based on iterations
      if (onProgress && iterations % 50 === 0) {
        onProgress(Math.min(95, Math.round((iterations / (totalCombinations * 2)) * 100)))
      }

      // Conflict check
      if (hasConflictWithSelected(candidate.slots, currentSlots)) continue

      // Select this section
      const usedColors = current.map((s) => s.colorIndex)
      const sel: SelectedSection = {
        courseId: cs.courseId,
        courseTitle: cs.course.title,
        units: cs.course.units,
        section: candidate.section,
        colorIndex: getNextColorIndex(usedColors),
        timeSlots: candidate.slots,
      }

      current.push(sel)
      currentSlots.push(...candidate.slots)

      backtrack(courseIdx + 1, currentScore + candidate.score)

      // Undo selection
      current.pop()
      currentSlots.splice(currentSlots.length - candidate.slots.length, candidate.slots.length)
    }

    // Also try skipping TBA / no-time sections (they never conflict)
    // Already handled: sections with empty timeSlots pass the conflict check

  }

  backtrack(0, 0)

  return {
    sections: bestSections,
    score: bestScore,
    explored,
  }
}
