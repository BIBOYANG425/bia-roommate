import { useState, useEffect, useCallback, Fragment } from 'react'
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

// ─── Optimizer algorithm ───

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

// A "combo" is a valid combination of sections for one course:
// e.g., Lecture + Discussion, or Lecture + Lab, or just Lecture if no linked sections
interface SectionCombo {
  course: Course
  sections: { section: Course['sections'][number]; slots: TimeSlot[] }[]
  allSlots: TimeSlot[]
  score: number
}

// Build all valid section combos for a course (lecture + discussion/lab pairs)
function buildCombos(course: Course): SectionCombo[] {
  const byType: Record<string, { section: Course['sections'][number]; slots: TimeSlot[] }[]> = {}

  for (const s of course.sections || []) {
    if (s.isCancelled || s.isClosed) continue
    const slots = parseSectionTimes(s.times)
    // Keep sections even if TBA — they may be quizzes
    const type = (s.type || 'Lecture').toLowerCase()
    if (!byType[type]) byType[type] = []
    byType[type].push({ section: s, slots })
  }

  const types = Object.keys(byType)
  if (types.length === 0) return []

  // Sort types so Lecture comes first (primary), then others
  types.sort((a, b) => {
    if (a === 'lecture') return -1
    if (b === 'lecture') return 1
    return a.localeCompare(b)
  })

  // Filter out types where ALL sections have no time data (TBA-only types like Quiz)
  const requiredTypes = types.filter((t) =>
    byType[t].some((s) => s.slots.length > 0)
  )

  // If no required types, return empty
  if (requiredTypes.length === 0) return []

  const combos: SectionCombo[] = []

  function generate(
    typeIdx: number,
    current: { section: Course['sections'][number]; slots: TimeSlot[] }[],
    currentSlots: TimeSlot[]
  ) {
    // Limit total combos for performance
    if (combos.length >= 50) return

    if (typeIdx >= requiredTypes.length) {
      if (current.length > 0) {
        combos.push({
          course,
          sections: [...current],
          allSlots: [...currentSlots],
          score: 2.5 * current.length,
        })
      }
      return
    }

    for (const entry of byType[requiredTypes[typeIdx]]) {
      if (entry.slots.length === 0) continue

      // Check for conflicts within this combo
      const hasInternalConflict = entry.slots.some((a) =>
        currentSlots.some((b) => slotsConflict(a, b))
      )
      if (hasInternalConflict) continue

      current.push(entry)
      currentSlots.push(...entry.slots)
      generate(typeIdx + 1, current, currentSlots)
      current.pop()
      currentSlots.splice(currentSlots.length - entry.slots.length, entry.slots.length)
    }
  }

  generate(0, [], [])
  return combos
}

interface CourseGroup {
  label: string
  isGE: boolean
  options: Course[]
}

function optimizeSchedule(groups: CourseGroup[]): SelectedSection[] {
  let bestScore = -1
  let bestSections: SelectedSection[] = []
  const startTime = Date.now()

  // Pre-compute combo candidates for each group
  const groupCandidates = groups.map((g) => {
    const combos: SectionCombo[] = []
    const options = g.isGE ? g.options.slice(0, 10) : g.options
    for (const course of options) {
      combos.push(...buildCombos(course))
    }
    combos.sort((a, b) => b.score - a.score)
    return { label: g.label, combos: combos.slice(0, 40) }
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
    if (score + remaining * 5.0 * 3 <= bestScore) return

    for (const combo of gc.combos) {
      // Check for conflicts with already-selected sections
      const hasConflict = combo.allSlots.some((a) =>
        currentSlots.some((b) => slotsConflict(a, b))
      )
      if (hasConflict) continue

      const usedColors = current.map((s) => s.colorIndex)
      const courseId = `${combo.course.department}-${combo.course.number}`
      const colorIndex = getNextColorIndex(usedColors)

      // Add all sections in the combo (lecture + discussion + lab)
      const newEntries: SelectedSection[] = combo.sections.map((entry) => ({
        courseId,
        courseTitle: combo.course.title,
        units: combo.course.units,
        section: entry.section,
        colorIndex,
        timeSlots: entry.slots,
      }))

      current.push(...newEntries)
      currentSlots.push(...combo.allSlots)
      backtrack(idx + 1, score + combo.score)
      current.splice(current.length - newEntries.length, newEntries.length)
      currentSlots.splice(currentSlots.length - combo.allSlots.length, combo.allSlots.length)
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
      const endRow = Math.min(HOURS.length, Math.ceil((slot.endMin - 480) / 60))
      for (let r = startRow; r < endRow; r++) {
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
        <Fragment key={`row-${h}`}>
          <div className="mini-calendar-time">
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
        </Fragment>
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
        if (response?.type === 'ERROR') {
          setError(`Failed to fetch courses: ${response.error}`)
          return
        }
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
        if (response?.type === 'ERROR') {
          setError(`Failed to fetch ${geCode}: ${response.error}`)
          return
        }
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
            <button
              key={code}
              type="button"
              className="match-tag"
              style={{ fontSize: 11, cursor: 'pointer' }}
              aria-label={`Remove ${code}`}
              onClick={() => removeCourse(code)}
            >
              {code} ✕
            </button>
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
