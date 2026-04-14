import { describe, it, expect } from 'vitest'
import { extractMemories } from '../../src/jobs/memory-extraction.js'

describe('Memory extraction', () => {
  it('extractMemories is a function', () => {
    expect(typeof extractMemories).toBe('function')
  })
})
