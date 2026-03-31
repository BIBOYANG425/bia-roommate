// Highlights sections that conflict with enrolled schedule (WebReg only)

interface SimpleTimeSlot {
  day: string
  startMin: number
  endMin: number
}

function parseTimeString(timeStr: string): { startMin: number; endMin: number } | null {
  // Handles "10:00-11:50" or "10:00 AM - 11:50 AM" patterns
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(?:AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(?:AM|PM)?/i)
  if (!match) return null

  let startH = parseInt(match[1], 10)
  const startM = parseInt(match[2], 10)
  let endH = parseInt(match[3], 10)
  const endM = parseInt(match[4], 10)

  // Handle PM
  if (timeStr.toLowerCase().includes('pm') && endH < 12) endH += 12
  if (timeStr.toLowerCase().includes('pm') && startH < 12 && startH < endH - 12) startH += 12

  return {
    startMin: startH * 60 + startM,
    endMin: endH * 60 + endM,
  }
}

function parseDays(dayStr: string): string[] {
  const days: string[] = []
  for (const char of dayStr) {
    if ('MTWHF'.includes(char)) days.push(char)
  }
  return days
}

function slotsConflict(a: SimpleTimeSlot, b: SimpleTimeSlot): boolean {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin
}

async function getEnrolledSlots(): Promise<SimpleTimeSlot[]> {
  try {
    const data = await chrome.storage.session.get('courseBin')
    const entries = data.courseBin || []
    const slots: SimpleTimeSlot[] = []

    for (const entry of entries) {
      if (!entry.times) continue
      const time = parseTimeString(entry.times)
      if (!time) continue

      // Extract day characters from the times string
      const dayMatch = entry.times.match(/[MTWHF]+/)
      if (!dayMatch) continue

      for (const day of parseDays(dayMatch[0])) {
        slots.push({ day, ...time })
      }
    }

    return slots
  } catch {
    return []
  }
}

export async function highlightConflicts() {
  const enrolledSlots = await getEnrolledSlots()
  if (enrolledSlots.length === 0) return

  // Find all section rows in the browsing area (not the course bin)
  const sectionRows = document.querySelectorAll<HTMLElement>(
    '.section-row, .course-section, tr.section, [data-section-id]'
  )

  for (const row of sectionRows) {
    // Already processed
    if (row.classList.contains('bia-conflict-highlight')) continue

    // Extract time info from the row
    const timeCell = row.querySelector('.time, .section-time, td:nth-child(4)')
    if (!timeCell) continue

    const timeText = timeCell.textContent || ''
    const time = parseTimeString(timeText)
    if (!time) continue

    const dayMatch = timeText.match(/[MTWHF]+/)
    if (!dayMatch) continue

    const browsedSlots: SimpleTimeSlot[] = []
    for (const day of parseDays(dayMatch[0])) {
      browsedSlots.push({ day, ...time })
    }

    // Check for conflicts
    const hasConflict = browsedSlots.some((bs) =>
      enrolledSlots.some((es) => slotsConflict(bs, es))
    )

    if (hasConflict) {
      row.classList.add('bia-conflict-highlight')
    }
  }
}
