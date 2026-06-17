import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isClaimBlocked,
  recordFailedClaim,
  _resetLinkCodeLimiterForTest,
} from '../../src/security/link-code-limiter.js'

beforeEach(() => {
  vi.useFakeTimers()
  _resetLinkCodeLimiterForTest()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('link-code claim limiter', () => {
  it('allows a claimer with no failures', () => {
    expect(isClaimBlocked('student-a')).toBe(false)
  })

  it('blocks a claimer after 3 failed attempts within 10 minutes', () => {
    recordFailedClaim('student-a')
    recordFailedClaim('student-a')
    expect(isClaimBlocked('student-a')).toBe(false)
    recordFailedClaim('student-a')
    expect(isClaimBlocked('student-a')).toBe(true)
  })

  it('does not block other claimers on a per-user trip', () => {
    for (let i = 0; i < 3; i++) recordFailedClaim('student-a')
    expect(isClaimBlocked('student-a')).toBe(true)
    expect(isClaimBlocked('student-b')).toBe(false)
  })

  it('unblocks once the 10-minute window has passed', () => {
    for (let i = 0; i < 3; i++) recordFailedClaim('student-a')
    expect(isClaimBlocked('student-a')).toBe(true)
    vi.advanceTimersByTime(10 * 60_000 + 1)
    expect(isClaimBlocked('student-a')).toBe(false)
  })

  it('blocks EVERY claimer once the global cap (30/10min) is hit', () => {
    // 30 distinct claimers each fail once — none trips the per-user cap,
    // but together they trip the global one.
    for (let i = 0; i < 30; i++) recordFailedClaim(`student-${i}`)
    expect(isClaimBlocked('fresh-student')).toBe(true)
  })

  it('global cap also expires with the window', () => {
    for (let i = 0; i < 30; i++) recordFailedClaim(`student-${i}`)
    expect(isClaimBlocked('fresh-student')).toBe(true)
    vi.advanceTimersByTime(10 * 60_000 + 1)
    expect(isClaimBlocked('fresh-student')).toBe(false)
  })
})
