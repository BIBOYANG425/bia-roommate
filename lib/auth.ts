export const ALLOWED_DOMAINS = ['usc.edu', 'berkeley.edu', 'stanford.edu'] as const

export function isSchoolEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))
}

export function getSchoolFromEmail(email: string): 'USC' | 'UC Berkeley' | 'Stanford' | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null
  if (domain === 'usc.edu' || domain.endsWith('.usc.edu')) return 'USC'
  if (domain === 'berkeley.edu' || domain.endsWith('.berkeley.edu')) return 'UC Berkeley'
  if (domain === 'stanford.edu' || domain.endsWith('.stanford.edu')) return 'Stanford'
  return null
}
