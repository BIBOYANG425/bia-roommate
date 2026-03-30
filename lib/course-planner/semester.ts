/**
 * USC term codes: YYYYS where S = 1 (Spring), 2 (Summer), 3 (Fall)
 * Example: 20253 = Fall 2025, 20261 = Spring 2026
 */

export function getCurrentSemesterCode(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Registration timing:
  // Oct-Dec: registering for Spring (next year)
  // Mar-May: registering for Summer/Fall (same year)
  if (month >= 10) return `${year + 1}1`
  if (month >= 5) return `${year}3`
  return `${year}1`
}

export function semesterLabel(code: string): string {
  const year = code.slice(0, 4)
  const s = code.charAt(4)
  const season = s === '1' ? 'Spring' : s === '2' ? 'Summer' : 'Fall'
  return `${season} ${year}`
}

export function getAvailableSemesters(): { code: string; label: string }[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const semesters: { code: string; label: string }[] = []

  // Current semester
  if (month <= 5) {
    semesters.push({ code: `${year}1`, label: `Spring ${year}` })
    semesters.push({ code: `${year}2`, label: `Summer ${year}` })
    semesters.push({ code: `${year}3`, label: `Fall ${year}` })
    semesters.push({ code: `${year + 1}1`, label: `Spring ${year + 1}` })
  } else if (month <= 9) {
    semesters.push({ code: `${year}3`, label: `Fall ${year}` })
    semesters.push({ code: `${year + 1}1`, label: `Spring ${year + 1}` })
    semesters.push({ code: `${year + 1}2`, label: `Summer ${year + 1}` })
  } else {
    semesters.push({ code: `${year + 1}1`, label: `Spring ${year + 1}` })
    semesters.push({ code: `${year + 1}2`, label: `Summer ${year + 1}` })
    semesters.push({ code: `${year + 1}3`, label: `Fall ${year + 1}` })
  }

  return semesters
}
