'use client'

import { useMemo } from 'react'
import type { Course, Section, DayOfWeek } from '@/lib/course-planner/types'
import { parseSectionTimes, formatTime } from '@/lib/course-planner/conflicts'
import { COURSE_COLORS } from '@/lib/course-planner/colors'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const START_HOUR = 8
const END_HOUR = 19
const ROW_HEIGHT = 50

interface ResultCalendarProps {
  sections: { course: Course; section: Section; colorIndex: number }[]
}

export default function ResultCalendar({ sections }: ResultCalendarProps) {
  const blocks = useMemo(() => {
    const result: {
      day: DayOfWeek
      courseLabel: string
      sectionType: string
      timeLabel: string
      colorIndex: number
      startMin: number
      endMin: number
    }[] = []

    // Helper to convert minutes to time string
    function minToTime(min: number): string {
      const h = Math.floor(min / 60)
      const m = min % 60
      return `${h}:${m.toString().padStart(2, '0')}`
    }

    for (const { course, section, colorIndex } of sections) {
      const slots = parseSectionTimes(section.times)
      for (const slot of slots) {
        result.push({
          day: slot.day,
          courseLabel: `${course.department} ${course.number}`,
          sectionType: section.type || 'Lecture',
          timeLabel: slot.startMin && slot.endMin
            ? `${formatTime(minToTime(slot.startMin))} - ${formatTime(minToTime(slot.endMin))}`
            : 'TBA',
          colorIndex,
          startMin: slot.startMin,
          endMin: slot.endMin,
        })
      }
    }
    return result
  }, [sections])

  // Determine visible hour range
  const minHour = blocks.length > 0
    ? Math.min(START_HOUR, Math.floor(Math.min(...blocks.map((b) => b.startMin)) / 60))
    : START_HOUR
  const maxHour = blocks.length > 0
    ? Math.max(END_HOUR, Math.ceil(Math.max(...blocks.map((b) => b.endMin)) / 60))
    : END_HOUR

  const hours: number[] = []
  for (let h = minHour; h <= maxHour; h++) hours.push(h)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: '550px' }}>
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th className="w-14 p-2" />
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="p-2 font-display text-sm tracking-wider text-center"
                  style={{ color: 'var(--black)', borderBottom: '2px solid var(--beige)' }}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
        </table>

        {/* Calendar body with positioned blocks */}
        <div className="relative" style={{ display: 'grid', gridTemplateColumns: '56px repeat(5, 1fr)' }}>
          {/* Time labels */}
          <div>
            {hours.map((h) => (
              <div
                key={h}
                className="text-right pr-2 text-[11px]"
                style={{
                  height: `${ROW_HEIGHT}px`,
                  lineHeight: `${ROW_HEIGHT}px`,
                  color: 'var(--mid)',
                  borderTop: '1px solid var(--beige)',
                }}
              >
                {h <= 12 ? h : h - 12}{h < 12 ? 'am' : 'pm'}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day) => (
            <div
              key={day}
              className="relative"
              style={{
                height: `${hours.length * ROW_HEIGHT}px`,
                borderLeft: '1px solid var(--beige)',
              }}
            >
              {/* Hour grid lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    height: `${ROW_HEIGHT}px`,
                    borderTop: '1px solid var(--beige)',
                  }}
                />
              ))}

              {/* Course blocks */}
              {blocks
                .filter((b) => b.day === day)
                .map((b, i) => {
                  const color = COURSE_COLORS[b.colorIndex % COURSE_COLORS.length]
                  const top = ((b.startMin - minHour * 60) / 60) * ROW_HEIGHT
                  const height = Math.max(((b.endMin - b.startMin) / 60) * ROW_HEIGHT, 30)

                  return (
                    <div
                      key={`${b.courseLabel}-${i}`}
                      className="absolute left-1 right-1 px-2 py-1 overflow-hidden"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: color.bg,
                        color: color.text,
                        borderRadius: '4px',
                        fontSize: '11px',
                        lineHeight: '1.3',
                        zIndex: 1,
                      }}
                    >
                      <div className="font-bold truncate">{b.courseLabel}</div>
                      {height > 35 && (
                        <div className="opacity-80 truncate" style={{ fontSize: '10px' }}>
                          {b.sectionType}
                        </div>
                      )}
                      {height > 50 && (
                        <div className="opacity-70 truncate" style={{ fontSize: '10px' }}>
                          {b.timeLabel}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
