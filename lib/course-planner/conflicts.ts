import type { SectionTime, TimeSlot, DayOfWeek, SelectedSection } from './types'

const DAY_MAP: Record<string, DayOfWeek> = {
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  H: 'Thu',
  F: 'Fri',
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function parseSectionTimes(times: SectionTime[]): TimeSlot[] {
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

export function slotsConflict(a: TimeSlot, b: TimeSlot): boolean {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin
}

export function findConflicts(
  newSlots: TimeSlot[],
  existingSections: SelectedSection[]
): SelectedSection[] {
  const conflicts: Set<SelectedSection> = new Set()

  for (const existing of existingSections) {
    for (const existSlot of existing.timeSlots) {
      for (const newSlot of newSlots) {
        if (slotsConflict(existSlot, newSlot)) {
          conflicts.add(existing)
        }
      }
    }
  }

  return [...conflicts]
}

export function formatTime(time: string): string {
  if (!time) return 'TBA'
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m || 0).padStart(2, '0')} ${ampm}`
}

export function formatDays(day: string): string {
  if (!day || day.toUpperCase() === 'TBA') return 'TBA'
  return day
    .split('')
    .map((c) => DAY_MAP[c] || c)
    .join('/')
}
