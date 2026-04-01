/**
 * USC term codes: YYYYS where S = 1 (Spring), 2 (Summer), 3 (Fall)
 * Example: 20253 = Fall 2025, 20261 = Spring 2026
 */

export function getCurrentSemesterCode(): string {
  // Default to Fall 2026 for incoming freshmen
  return '20263'
}

export function semesterLabel(code: string): string {
  const year = code.slice(0, 4)
  const s = code.charAt(4)
  const season = s === '1' ? 'Spring' : s === '2' ? 'Summer' : 'Fall'
  return `${season} ${year}`
}

export function getAvailableSemesters(): { code: string; label: string }[] {
  // Fall 2026 first (default for incoming freshmen), then nearby semesters
  return [
    { code: '20263', label: 'Fall 2026' },
    { code: '20271', label: 'Spring 2027' },
    { code: '20261', label: 'Spring 2026' },
    { code: '20262', label: 'Summer 2026' },
  ]
}
