import { useState, useEffect, useCallback } from 'react'
import type { Course, SelectedSection, TimeSlot, DayOfWeek } from '../../shared/types'
import { COURSE_COLORS, getNextColorIndex } from '../../shared/constants'

// ─── GE categories (same as web app) ───

const GE_CATEGORIES = [
  { code: 'GE-A', name: 'The Arts' },
  { code: 'GE-B', name: 'Humanistic Inquiry' },
  { code: 'GE-C', name: 'Social Analysis' },
  { code: 'GE-D', name: 'Life Sciences' },
  { code: 'GE-E', name: 'Physical Sciences' },
  { code: 'GE-F', name: 'Quantitative Reasoning' },
  { code: 'GE-G', name: 'Global Perspectives I' },
  { code: 'GE-H', name: 'Global Perspectives II' },
] as const

// ─── Optimizer algorithm (same as web app) ───

interface SectionCandidate {
  section: Course['sections'][number]
  slots: TimeSlot[]
  score: number
}

const DAY_MAP: Record<string, DayOfWeek> = { M: 'Mon', T: 'Tue', W: 'Wed', H: 'Thu', F: 'Fri' }

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

function parseSectionTimes(times: Course['sections'][number]['times']): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (const t of times) {
    if (!t.start_time || !t.end_time || !t.day) continue
    if (t.day.toUpperCase() === 'TBA') continue
    const startMin = parseTimeToMinutes(t.start_time)
    const endMin = parseTimeToMinutes(t.end_time)
    for (const dayChar of t.day.split('')) {
      const day = DAY_MAP[dayChar]
      if (day) slots.push({ day, startMin, endMin })
    }
  }
  return slots
}

function slotsConflict(a: TimeSlot, b: TimeSlot): boolean {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin
}

// For GE categories, each "course group" can have multiple course options.
// The optimizer picks the best option + section from each group.
interface CourseGroup {
  label: string
  isGE: boolean
  options: Course[]
}

function optimizeSchedule(groups: CourseGroup[]): SelectedSection[] {
  let bestScore = -1
  let bestSections: SelectedSection[] = []
  const startTime = Date.now()

  // Pre-compute candidates for each group
  const groupCandidates = groups.map((g) => {
    const candidates: { course: Course; section: SectionCandidate }[] = []
    // For GE groups, consider top 10 courses; for regular, just the one course
    const options = g.isGE ? g.options.slice(0, 10) : g.options
    for (const course of options) {
      for (const s of course.sections || []) {
        if (s.isCancelled || s.isClosed) continue
        const slots = parseSectionTimes(s.times)
        if (slots.length === 0) continue
        candidates.push({
          course,
          section: { section: s, slots, score: 2.5 },
        })
      }
    }
    // Sort by score descending
    candidates.sort((a, b) => b.section.score - a.section.score)
    // Limit to top sections for performance
    return { label: g.label, candidates: candidates.slice(0, 30) }
  })

  const current: SelectedSection[] = []
  const currentSlots: TimeSlot[] = []

  function backtrack(idx: number, score: number) {
    if (Date.now() - startTime > 10000) return
    if (idx >= groupCandidates.length) {
      if (score > bestScore) {
        bestScore = score
        bestSections = [...current]
      }
      return
    }

    const gc = groupCandidates[idx]
    const remaining = groupCandidates.length - idx
    if (score + remaining * 5.0 <= bestScore) return

    for (const cand of gc.candidates) {
      const hasConflict = cand.section.slots.some((a) =>
        currentSlots.some((b) => slotsConflict(a, b))
      )
      if (hasConflict) continue

      const usedColors = current.map((s) => s.colorIndex)
      const courseId = `${cand.course.department}-${cand.course.number}`
      const sel: SelectedSection = {
        courseId,
        courseTitle: cand.course.title,
        units: cand.course.units,
        section: cand.section.section,
        colorIndex: getNextColorIndex(usedColors),
        timeSlots: cand.section.slots,
      }

      current.push(sel)
      currentSlots.push(...cand.section.slots)
      backtrack(idx + 1, score + cand.section.score)
      current.pop()
      currentSlots.splice(currentSlots.length - cand.section.slots.length, cand.section.slots.length)
    }
  }

  backtrack(0, 0)
  return bestSections
}

// ─── Mini Calendar ───

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

function MiniCalendar({ sections }: { sections: SelectedSection[] }) {
  if (sections.length === 0) return null

  const grid: (SelectedSection | null)[][] = HOURS.map(() => DAYS.map(() => null))
  for (const sec of sections) {
    for (const slot of sec.timeSlots) {
      const colIdx = DAYS.indexOf(slot.day)
      if (colIdx === -1) continue
      const startRow = Math.max(0, Math.floor((slot.startMin - 480) / 60))
      const endRow = Math.min(HOURS.length - 1, Math.ceil((slot.endMin - 480) / 60))
      for (let r = startRow; r <= endRow; r++) {
        grid[r][colIdx] = sec
      }
    }
  }

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header" />
      {DAYS.map((d) => (
        <div key={d} className="mini-calendar-header">{d}</div>
      ))}
      {HOURS.map((h, ri) => (
        <>
          <div key={`t-${h}`} className="mini-calendar-time">
            {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
          </div>
          {DAYS.map((_, ci) => {
            const sec = grid[ri][ci]
            const color = sec ? COURSE_COLORS[sec.colorIndex % COURSE_COLORS.length] : null
            return (
              <div
                key={`${ri}-${ci}`}
                className="mini-calendar-cell"
                style={color ? { backgroundColor: color.bg } : undefined}
                title={sec ? `${sec.courseId} ${sec.courseTitle}` : undefined}
              />
            )
          })}
        </>
      ))}
    </div>
  )
}

// ─── Main Component ───

export function ScheduleOptimizer() {
  const [courseCodes, setCourseCodes] = useState<string[]>([])
  const [selectedGEs, setSelectedGEs] = useState<Set<string>>(new Set())
  const [optimizedSections, setOptimizedSections] = useState<SelectedSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  // Read course bin from chrome.storage (persists across pages)
  useEffect(() => {
    // Try session storage first (set by content script), fall back to local
    chrome.storage.session.get(['courseCodes']).then((data) => {
      if (data.courseCodes?.length > 0) {
        setCourseCodes(data.courseCodes)
        // Persist to local storage so it's available on all pages
        chrome.storage.local.set({ savedCourseCodes: data.courseCodes })
      } else {
        // Fall back to previously saved codes
        chrome.storage.local.get(['savedCourseCodes']).then((local) => {
          if (local.savedCourseCodes?.length > 0) {
            setCourseCodes(local.savedCourseCodes)
          }
        })
      }
    }).catch(() => {
      chrome.storage.local.get(['savedCourseCodes']).then((local) => {
        if (local.savedCourseCodes?.length > 0) {
          setCourseCodes(local.savedCourseCodes)
        }
      }).catch(() => {})
    })
  }, [])

  function toggleGE(code: string) {
    setSelectedGEs((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function removeCourse(code: string) {
    const updated = courseCodes.filter((c) => c !== code)
    setCourseCodes(updated)
    chrome.storage.local.set({ savedCourseCodes: updated })
    chrome.storage.session.set({ courseCodes: updated }).catch(() => {})
  }

  const handleOptimize = useCallback(async () => {
    const totalItems = courseCodes.length + selectedGEs.size
    if (totalItems === 0) return

    setLoading(true)
    setError(null)
    setOptimizedSections([])

    try {
      const settings = await chrome.storage.local.get('settings')
      const semester = settings.settings?.semester || '20263'
      const groups: CourseGroup[] = []

      // Fetch regular courses from course bin
      if (courseCodes.length > 0) {
        setStatus(`Fetching ${courseCodes.length} courses...`)
        const response = await chrome.runtime.sendMessage({
          type: 'COURSEBIN_DETAILS',
          courses: courseCodes,
          semester,
        })
        if (response?.type === 'COURSEBIN_RESULT' && response.courses) {
          for (const course of response.courses) {
            groups.push({
              label: `${course.department}-${course.number}`,
              isGE: false,
              options: [course],
            })
          }
        }
      }

      // Fetch GE courses for each selected category
      for (const geCode of selectedGEs) {
        setStatus(`Fetching ${geCode} courses...`)
        const response = await chrome.runtime.sendMessage({
          type: 'GE_COURSES',
          category: geCode,
          semester,
        })
        if (response?.type === 'GE_RESULT' && response.courses?.length > 0) {
          groups.push({
            label: geCode,
            isGE: true,
            options: response.courses,
          })
        }
      }

      if (groups.length === 0) {
        setError('No course data found. Check your course bin or GE selections.')
        return
      }

      setStatus('Finding optimal schedule...')

      // Small delay so status renders
      await new Promise((r) => setTimeout(r, 50))

      const result = optimizeSchedule(groups)
      setOptimizedSections(result)

      if (result.length === 0) {
        setError('No conflict-free schedule found. Try removing a course or GE.')
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to optimize schedule')
    } finally {
      setLoading(false)
      setStatus('')
    }
  }, [courseCodes, selectedGEs])

  const canOptimize = courseCodes.length > 0 || selectedGEs.size > 0

  return (
    <div>
      {/* Course Bin */}
      <p className="section-title">My Courses</p>
      {courseCodes.length > 0 ? (
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {courseCodes.map((code) => (
            <span
              key={code}
              className="match-tag"
              style={{ fontSize: 11, cursor: 'pointer' }}
              title="Click to remove"
              onClick={() => removeCourse(code)}
            >
              {code} ✕
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 11, color: '#8C7E6A', marginBottom: 12, fontWeight: 600 }}>
          Open myCourseBin on WebReg to load your courses.
        </p>
      )}

      {/* GE Selection */}
      <p className="section-title">GE Requirements</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 16 }}>
        {GE_CATEGORIES.map((ge) => (
          <label
            key={ge.code}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              background: selectedGEs.has(ge.code) ? '#990000' : '#FAF6EC',
              border: `2px solid ${selectedGEs.has(ge.code) ? '#1A1410' : '#F2EBD9'}`,
              color: selectedGEs.has(ge.code) ? '#fff' : '#8C7E6A',
              transition: 'all 0.1s',
            }}
          >
            <input
              type="checkbox"
              checked={selectedGEs.has(ge.code)}
              onChange={() => toggleGE(ge.code)}
              style={{ accentColor: '#990000', width: 12, height: 12 }}
            />
            <span><b>{ge.code}</b> {ge.name}</span>
          </label>
        ))}
      </div>

      {/* Build button */}
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-text">{status || 'Loading...'}</div>
      ) : (
        <button
          className="btn-primary"
          onClick={handleOptimize}
          disabled={!canOptimize}
          style={{ opacity: canOptimize ? 1 : 0.5 }}
        >
          Build Best Schedule
        </button>
      )}

      {/* Results */}
      {optimizedSections.length > 0 && (
        <>
          <p className="section-title" style={{ marginTop: 16 }}>
            Optimal Schedule ({optimizedSections.length} sections)
          </p>
          <MiniCalendar sections={optimizedSections} />
          {optimizedSections.map((sec) => {
            const color = COURSE_COLORS[sec.colorIndex % COURSE_COLORS.length]
            const instructor = sec.section.instructor
            const instrName = instructor?.firstName
              ? `${instructor.firstName} ${instructor.lastName}`
              : instructor?.lastName || 'TBA'
            return (
              <div key={`${sec.courseId}-${sec.section.id}`} className="course-card">
                <div className="course-card-header">
                  <span
                    className="course-card-id"
                    style={{ color: color.bg === '#1A1410' ? '#FFCC00' : color.bg }}
                  >
                    {sec.courseId}
                  </span>
                  <span style={{ fontSize: 11, color: '#8C7E6A' }}>
                    {sec.section.type} &middot; {sec.units} units
                  </span>
                </div>
                <div className="course-card-title">{sec.courseTitle}</div>
                <div className="course-card-meta">
                  <span>{instrName}</span>
                  <span>
                    {sec.section.registered}/{sec.section.capacity} seats
                  </span>
                </div>
              </div>
            )
          })}
          <a
            className="link-button"
            href="https://bia-roommate.vercel.app/course-planner"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', textAlign: 'center', marginTop: 8 }}
          >
            Open full planner for more options →
          </a>
        </>
      )}
    </div>
  )
}
