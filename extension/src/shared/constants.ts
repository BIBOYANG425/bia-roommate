export const BIA_API_BASE = 'https://bia-roommate.vercel.app'

export const USC_SCHOOL_ID = 'U2Nob29sLTEzODE=' // RMP school ID for USC (School-1381)

export const RMP_BADGE_COLORS = {
  great: '#4CAF50',   // 4.0 – 5.0
  average: '#FFC107', // 3.0 – 3.9
  below: '#FF9800',   // 2.0 – 2.9
  poor: '#F44336',    // 0.0 – 1.9
  none: '#9E9E9E',    // No data
} as const

export function getRmpColor(rating: number | null): string {
  if (rating === null) return RMP_BADGE_COLORS.none
  if (rating >= 4.0) return RMP_BADGE_COLORS.great
  if (rating >= 3.0) return RMP_BADGE_COLORS.average
  if (rating >= 2.0) return RMP_BADGE_COLORS.below
  return RMP_BADGE_COLORS.poor
}

export const COURSE_COLORS = [
  { bg: '#990000', text: '#FFFFFF' },
  { bg: '#014B83', text: '#FFFFFF' },
  { bg: '#2D6A4F', text: '#FFFFFF' },
  { bg: '#7B2D8E', text: '#FFFFFF' },
  { bg: '#B85C00', text: '#FFFFFF' },
  { bg: '#1A1410', text: '#FFCC00' },
  { bg: '#8C1515', text: '#FFFFFF' },
  { bg: '#005F73', text: '#FFFFFF' },
] as const

export function getNextColorIndex(usedIndices: number[]): number {
  for (let i = 0; i < COURSE_COLORS.length; i++) {
    if (!usedIndices.includes(i)) return i
  }
  return usedIndices.length % COURSE_COLORS.length
}
