'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SchedulePrefs } from '@/app/course-planner/page'
import type { Course, Section, RmpRating } from '@/lib/course-planner/types'
import { parseSectionTimes, slotsConflict } from '@/lib/course-planner/conflicts'
import { COURSE_COLORS } from '@/lib/course-planner/colors'
import ResultCalendar from './ResultCalendar'

interface GeneratedSchedule {
  sections: { course: Course; section: Section; colorIndex: number }[]
  avgRating: number
}

interface ResultsViewProps {
  courses: { id: string; label: string }[]
  semester: string
  prefs: SchedulePrefs
  onBack: () => void
}

export default function ResultsView({ courses, semester, prefs, onBack }: ResultsViewProps) {
  const [schedules, setSchedules] = useState<GeneratedSchedule[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const buildSchedules = useCallback(async () => {
    setLoading(true)
    setError(null)
    setProgress(5)

    try {
      // 1. Fetch all courses from USC API
      const courseData: Course[] = []
      for (const c of courses) {
        const isGE = c.id.startsWith('GE-')
        let url: string
        if (isGE) {
          // Search for GE courses
          url = `/api/courses/search?q=${encodeURIComponent(c.id)}&semester=${semester}`
        } else {
          const parts = c.id.split('-')
          url = `/api/courses/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}?semester=${semester}`
        }

        try {
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            if (isGE && Array.isArray(data)) {
              // For GE searches, take top courses that have sections
              for (const item of data.slice(0, 10)) {
                try {
                  const detailRes = await fetch(
                    `/api/courses/${encodeURIComponent(item.department)}/${encodeURIComponent(item.number)}?semester=${semester}`
                  )
                  if (detailRes.ok) {
                    const detail = await detailRes.json()
                    if (detail.sections?.length > 0) {
                      courseData.push(detail)
                    }
                  }
                } catch { /* skip */ }
              }
            } else if (!isGE && data.sections) {
              courseData.push(data)
            }
          }
        } catch { /* skip failed fetch */ }

        setProgress((prev) => Math.min(prev + Math.round(40 / courses.length), 45))
      }

      if (courseData.length === 0) {
        setError('NO COURSE DATA FOUND FOR THIS SEMESTER')
        setLoading(false)
        return
      }

      setProgress(50)

      // 2. Fetch RMP ratings for all instructors
      const rmpCache: Record<string, RmpRating | null> = {}
      const instructorNames = new Set<string>()
      for (const course of courseData) {
        for (const sec of course.sections || []) {
          if (sec.instructor?.lastName) {
            instructorNames.add(`${sec.instructor.firstName} ${sec.instructor.lastName}`)
          }
        }
      }

      const rmpBatch = [...instructorNames].slice(0, 50) // limit to avoid rate limiting
      await Promise.all(
        rmpBatch.map(async (name) => {
          try {
            const res = await fetch(`/api/rmp/search?name=${encodeURIComponent(name)}`)
            const data = await res.json()
            const parts = name.split(' ')
            const key = `${parts.slice(1).join(' ')}, ${parts[0]}`
            rmpCache[key] = data
          } catch { /* ignore */ }
        })
      )

      setProgress(70)

      // 3. Generate schedule combinations using backtracking
      const getRating = (sec: Section): number => {
        const key = `${sec.instructor?.lastName}, ${sec.instructor?.firstName}`
        return rmpCache[key]?.avgRating ?? 2.5
      }

      // Parse time preference filters
      const earliestMin = prefs.earliestClass
        ? parseInt(prefs.earliestClass.split(':')[0]) * 60
        : 0
      const doneByMin = prefs.doneBy
        ? parseInt(prefs.doneBy.split(':')[0]) * 60
        : 24 * 60

      // For GE searches, we need to pick ONE course per GE category
      // For specific courses, we pick one section
      const isGESearch = courses.some((c) => c.id.startsWith('GE-'))

      // Group courses by the original selection
      const courseGroups: { label: string; options: { course: Course; sections: Section[] }[] }[] = []

      if (isGESearch) {
        // For GE: each original selection maps to multiple possible courses
        for (const sel of courses) {
          const matching = courseData.filter((cd) => {
            // Simple heuristic: match if we fetched this course for this GE
            return true // We'll rely on the order of courseData matching selections
          })
          if (matching.length > 0) {
            courseGroups.push({
              label: sel.label,
              options: matching.map((c) => ({
                course: c,
                sections: (c.sections || []).filter((s) => !s.isCancelled),
              })),
            })
          }
        }
      } else {
        for (const cd of courseData) {
          courseGroups.push({
            label: `${cd.department} ${cd.number}`,
            options: [{ course: cd, sections: (cd.sections || []).filter((s) => !s.isCancelled) }],
          })
        }
      }

      // Generate top schedules via backtracking
      const results: GeneratedSchedule[] = []
      const maxResults = 5
      const timeout = Date.now() + 25000

      function backtrack(
        groupIdx: number,
        selected: { course: Course; section: Section; colorIndex: number }[],
        totalRating: number,
        usedSlots: { day: string; startMin: number; endMin: number }[]
      ) {
        if (Date.now() > timeout) return
        if (results.length >= maxResults * 10) return // enough candidates

        if (groupIdx >= courseGroups.length) {
          const avg = selected.length > 0 ? totalRating / selected.length : 0
          results.push({ sections: [...selected], avgRating: Math.round(avg * 100) / 100 })
          return
        }

        const group = courseGroups[groupIdx]
        for (const opt of group.options) {
          // Sort sections by rating
          const sorted = [...opt.sections].sort((a, b) => getRating(b) - getRating(a))

          for (const sec of sorted.slice(0, 8)) {
            const slots = parseSectionTimes(sec.times)

            // Check time preferences
            const meetsPrefs = slots.every((s) => s.startMin >= earliestMin && s.endMin <= doneByMin)
            if (!meetsPrefs && (prefs.earliestClass || prefs.doneBy)) continue

            // Check conflicts
            const hasConflict = slots.some((newSlot) =>
              usedSlots.some(
                (existing) =>
                  existing.day === newSlot.day &&
                  existing.startMin < newSlot.endMin &&
                  newSlot.startMin < existing.endMin
              )
            )
            if (hasConflict) continue

            selected.push({
              course: opt.course,
              section: sec,
              colorIndex: groupIdx % COURSE_COLORS.length,
            })
            const newSlots = [...usedSlots, ...slots]

            backtrack(groupIdx + 1, selected, totalRating + getRating(sec), newSlots)

            selected.pop()
          }

          // Only try first matching course option for GE to limit search space
          if (isGESearch) break
        }
      }

      backtrack(0, [], 0, [])

      setProgress(95)

      // Sort by average rating and take top 5
      results.sort((a, b) => b.avgRating - a.avgRating)
      const top = results.slice(0, maxResults)

      if (top.length === 0) {
        setError('NO VALID SCHEDULE FOUND — TRY ADJUSTING PREFERENCES')
      }

      setSchedules(top)
      setActiveIdx(0)
    } catch (e) {
      setError('FAILED TO BUILD SCHEDULES')
    } finally {
      setLoading(false)
      setProgress(100)
    }
  }, [courses, semester, prefs])

  useEffect(() => {
    buildSchedules()
  }, [buildSchedules])

  if (loading) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-2xl mb-4" style={{ color: 'var(--black)' }}>
          BUILDING YOUR BEST SCHEDULE...
        </h2>
        <div className="w-full max-w-md mx-auto h-3 border-[2px] border-[var(--black)]" style={{ background: 'var(--cream)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--cardinal)' }}
          />
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--mid)' }}>
          Fetching courses, ratings, and finding the optimal combination...
        </p>
      </div>
    )
  }

  if (error && schedules.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-xl mb-4" style={{ color: 'var(--cardinal)' }}>{error}</p>
        <button onClick={onBack} className="brutal-btn brutal-btn-gold">
          ← BACK TO SELECTION
        </button>
      </div>
    )
  }

  const active = schedules[activeIdx]

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="font-display text-sm tracking-wider mb-4 hover:underline"
        style={{ color: 'var(--cardinal)' }}
      >
        ← BACK TO SELECTION
      </button>

      {/* Ranking info */}
      <p className="text-xs mb-3" style={{ color: 'var(--mid)' }}>
        Ranked by average Rate My Professors rating
      </p>

      {/* Schedule tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {schedules.map((sched, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className="px-4 py-2 text-sm font-display tracking-wider border-[2px] transition-all"
            style={{
              borderColor: 'var(--black)',
              background: i === activeIdx ? 'var(--cardinal)' : 'white',
              color: i === activeIdx ? 'white' : 'var(--black)',
              borderRadius: '20px',
            }}
          >
            #{i + 1} · ★ {sched.avgRating.toFixed(2)}
          </button>
        ))}
      </div>

      {/* Active schedule */}
      {active && (
        <div
          className="p-4 border-[2px]"
          style={{ borderColor: 'var(--beige)', background: 'white', borderRadius: '4px' }}
        >
          <p className="text-sm mb-4" style={{ color: 'var(--mid)' }}>
            Avg RMP: <strong style={{ color: 'var(--black)' }}>{active.avgRating.toFixed(2)}</strong>
          </p>

          <ResultCalendar sections={active.sections} />
        </div>
      )}
    </div>
  )
}
