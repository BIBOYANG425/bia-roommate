import { describe, it, expect, beforeEach } from 'vitest'
import { checkGeoBudget, _resetBudgets } from '../../src/services/geo-rate-limit.js'

beforeEach(() => {
  _resetBudgets()
})

describe('checkGeoBudget', () => {
  it('allows first 30 calls in an hour for a given student', () => {
    for (let i = 0; i < 30; i++) {
      expect(checkGeoBudget('student-a')).toBe(true)
    }
  })

  it('blocks call 31 in the same hour', () => {
    for (let i = 0; i < 30; i++) checkGeoBudget('student-a')
    expect(checkGeoBudget('student-a')).toBe(false)
  })

  it('tracks students independently', () => {
    for (let i = 0; i < 30; i++) checkGeoBudget('student-a')
    expect(checkGeoBudget('student-b')).toBe(true)
  })

  it('resets after the hour window elapses', () => {
    const now = Date.now()
    for (let i = 0; i < 30; i++) checkGeoBudget('student-a', now)
    expect(checkGeoBudget('student-a', now)).toBe(false)
    expect(checkGeoBudget('student-a', now + 61 * 60 * 1000)).toBe(true)
  })
})
