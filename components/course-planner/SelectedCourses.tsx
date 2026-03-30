'use client'

import { usePlanner, getActiveSchedule } from '@/lib/course-planner/store'
import { COURSE_COLORS } from '@/lib/course-planner/colors'
import { formatTime, formatDays } from '@/lib/course-planner/conflicts'

export default function SelectedCourses() {
  const { state, dispatch } = usePlanner()
  const active = getActiveSchedule(state)

  // Group by courseId
  const grouped = new Map<string, typeof active.selectedSections>()
  for (const sel of active.selectedSections) {
    const list = grouped.get(sel.courseId) || []
    list.push(sel)
    grouped.set(sel.courseId, list)
  }

  if (grouped.size === 0) {
    return (
      <div className="p-4 text-center">
        <p className="font-display text-sm" style={{ color: 'var(--mid)' }}>
          NO COURSES SELECTED
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {[...grouped.entries()].map(([courseId, sections]) => {
        const color = COURSE_COLORS[sections[0].colorIndex % COURSE_COLORS.length]
        return (
          <div key={courseId} className="brutal-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 border-[2px] border-[var(--black)] shrink-0"
                style={{ backgroundColor: color.bg }}
              />
              <span className="font-display text-sm flex-1" style={{ color: 'var(--black)' }}>
                {courseId}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--mid)' }}>
                {sections[0].units}u
              </span>
              <button
                onClick={() => dispatch({ type: 'REMOVE_COURSE', courseId })}
                className="font-display text-xs px-1.5 border-[2px] border-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white transition-colors"
                style={{ background: 'var(--cream)' }}
              >
                X
              </button>
            </div>
            <p className="text-[10px] truncate mb-1" style={{ color: 'var(--mid)' }}>
              {sections[0].courseTitle}
            </p>
            {sections.map((sel) => (
              <div key={sel.section.id} className="text-[10px] font-mono" style={{ color: 'var(--mid)' }}>
                {(sel.section.type ?? '').slice(0, 3)} —{' '}
                {sel.section.times.length > 0
                  ? sel.section.times.map((t, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        {t.start_time ? `${formatDays(t.day)} ${formatTime(t.start_time)}-${formatTime(t.end_time)}` : 'TBA'}
                      </span>
                    ))
                  : 'TBA'}{' '}
                — {sel.section.instructor?.lastName || 'Staff'}
              </div>
            ))}
          </div>
        )
      })}

      <div className="p-3 border-t-[3px] border-[var(--black)]">
        <div className="flex justify-between">
          <span className="font-display text-sm" style={{ color: 'var(--black)' }}>TOTAL UNITS</span>
          <span className="font-display text-lg" style={{ color: 'var(--cardinal)' }}>
            {active.totalUnits}
          </span>
        </div>
      </div>
    </div>
  )
}
