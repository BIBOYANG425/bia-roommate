'use client'

import { useMemo } from 'react'
import { usePlanner, getActiveSchedule } from '@/lib/course-planner/store'
import type { DayOfWeek } from '@/lib/course-planner/types'
import CalendarBlock from './CalendarBlock'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const START_HOUR = 8
const END_HOUR = 22
const TOTAL_ROWS = (END_HOUR - START_HOUR) * 2
const ROW_HEIGHT = 30

export default function WeeklyCalendar() {
  const { state } = usePlanner()
  const active = getActiveSchedule(state)

  const blocks = useMemo(() => {
    const result: {
      day: DayOfWeek
      courseId: string
      sectionType: string
      location: string
      instructor: string
      colorIndex: number
      startMin: number
      endMin: number
    }[] = []

    for (const sel of active.selectedSections) {
      for (const slot of sel.timeSlots) {
        const time = sel.section.times[0]
        result.push({
          day: slot.day,
          courseId: sel.courseId,
          sectionType: sel.section.type,
          location: time?.location || '',
          instructor: sel.section.instructor?.lastName || 'Staff',
          colorIndex: sel.colorIndex,
          startMin: slot.startMin,
          endMin: slot.endMin,
        })
      }
    }
    return result
  }, [active.selectedSections])

  const timeLabels = useMemo(() => {
    const labels: string[] = []
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hr = h > 12 ? h - 12 : h
      labels.push(`${hr}${ampm}`)
      labels.push('')
    }
    return labels
  }, [])

  return (
    <div className="overflow-x-auto border-[3px] border-[var(--black)]" style={{ background: 'var(--cream)' }}>
      <div style={{ minWidth: '600px' }}>
        {/* Header row */}
        <div className="grid" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
          <div className="calendar-header-cell" style={{ borderRight: '3px solid var(--black)' }}>
            TIME
          </div>
          {DAYS.map((day) => (
            <div key={day} className="calendar-header-cell">
              {day.toUpperCase()}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="grid" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
          {/* Time column */}
          <div style={{ borderRight: '3px solid var(--black)' }}>
            {timeLabels.map((label, i) => (
              <div
                key={i}
                className={`calendar-time-label ${i % 2 === 0 ? 'calendar-row-line-hour' : 'calendar-row-line'}`}
                style={{ height: `${ROW_HEIGHT}px`, lineHeight: `${ROW_HEIGHT}px` }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day) => (
            <div key={day} className="calendar-day-column" style={{ height: `${TOTAL_ROWS * ROW_HEIGHT}px` }}>
              {/* Grid lines */}
              {timeLabels.map((_, i) => (
                <div
                  key={i}
                  className={i % 2 === 0 ? 'calendar-row-line-hour' : 'calendar-row-line'}
                  style={{ height: `${ROW_HEIGHT}px` }}
                />
              ))}

              {/* Course blocks */}
              {blocks
                .filter((b) => b.day === day)
                .map((b, i) => (
                  <CalendarBlock key={`${b.courseId}-${b.startMin}-${i}`} {...b} />
                ))}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {blocks.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ top: '40px' }}
          >
            <p className="font-display text-3xl" style={{ color: 'var(--mid)', opacity: 0.15 }}>
              ADD COURSES
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
