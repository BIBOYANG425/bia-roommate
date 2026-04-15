import { describe, it, expect } from 'vitest'
import { matchStudentsToEvents } from '../../src/jobs/proactive.js'

describe('Proactive engine', () => {
  it('matchStudentsToEvents is a function', () => {
    expect(typeof matchStudentsToEvents).toBe('function')
  })
})
