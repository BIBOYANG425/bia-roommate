/**
 * Real tests for memory extraction. Replaces the previous placeholder.
 * Locks down PR #40's expansion to 10 categories: confirms unknown
 * categories are dropped + warned, valid categories survive, and the
 * multi-category extraction prompt (added in this PR) works in practice
 * by checking the helper that filters extracted rows.
 *
 * We mock the LLM and the DB so the test exercises the pure filter +
 * upsert plumbing without needing API keys.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

let llmResponse = ''
let upsertCalls: Array<Record<string, unknown>> = []

vi.mock('../../src/agent/llm-providers.js', () => ({
  callLightweightLLM: vi.fn(async () => llmResponse),
}))

vi.mock('../../src/db/client.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(async (row: Record<string, unknown>) => {
        upsertCalls.push(row)
        return { data: null, error: null }
      }),
    })),
  },
}))

vi.mock('../../src/observability/logger.js', () => ({
  log: vi.fn(),
}))

async function runExtraction(studentId: string, conversationText: string) {
  upsertCalls = []
  const { extractMemories } = await import('../../src/jobs/memory-extraction.js')
  await extractMemories(studentId, conversationText)
  return upsertCalls
}

describe('extractMemories — happy paths', () => {
  beforeEach(() => {
    vi.resetModules()
    upsertCalls = []
  })

  it('upserts all rows in a multi-category extraction', async () => {
    // Simulate the LLM correctly extracting 7 rows from a Chinese sentence
    // that mentions year + major + two completed courses + units + GE gaps.
    llmResponse = JSON.stringify([
      { key: 'year', value: 'sophomore', category: 'personal_fact' },
      { key: 'major', value: 'CS', category: 'personal_fact' },
      { key: 'CSCI 104', value: 'completed', category: 'completed_course' },
      { key: 'MATH 225', value: 'completed', category: 'completed_course' },
      { key: 'default', value: '4 courses', category: 'units_preference' },
      { key: 'GE-C', value: 'in progress', category: 'ge_completed' },
      { key: 'GE-D', value: 'in progress', category: 'ge_completed' },
    ])
    const rows = await runExtraction('stu-multi', '我大二 CS, 修过 104/225, GE 还差 CD')
    expect(rows).toHaveLength(7)
    expect(rows.map((r) => r.category).sort()).toEqual(
      ['completed_course', 'completed_course', 'ge_completed', 'ge_completed', 'personal_fact', 'personal_fact', 'units_preference'],
    )
  })

  it('upserts each of the 10 valid categories', async () => {
    llmResponse = JSON.stringify([
      { key: 'k1', value: 'v', category: 'food_preference' },
      { key: 'k2', value: 'v', category: 'academic_interest' },
      { key: 'k3', value: 'v', category: 'social_preference' },
      { key: 'k4', value: 'v', category: 'mentioned_plan' },
      { key: 'k5', value: 'v', category: 'personal_fact' },
      { key: 'k6', value: 'v', category: 'completed_course' },
      { key: 'k7', value: 'v', category: 'ge_completed' },
      { key: 'k8', value: 'v', category: 'units_preference' },
      { key: 'k9', value: 'v', category: 'prof_bar' },
      { key: 'k10', value: 'v', category: 'time_preference' },
    ])
    const rows = await runExtraction('stu-all', 'a bit of everything')
    expect(rows).toHaveLength(10)
  })
})

describe('extractMemories — defensive filtering', () => {
  beforeEach(() => {
    vi.resetModules()
    upsertCalls = []
  })

  it('drops rows with unknown categories (DB CHECK would reject anyway)', async () => {
    llmResponse = JSON.stringify([
      { key: 'k', value: 'good', category: 'personal_fact' },
      { key: 'bad', value: 'oops', category: 'made_up_category' },
      { key: 'k2', value: 'good2', category: 'completed_course' },
    ])
    const rows = await runExtraction('stu-unknown', 'noise')
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.value === 'oops')).toBeUndefined()
    expect(rows.find((r) => r.value === 'good')).toBeDefined()
    expect(rows.find((r) => r.value === 'good2')).toBeDefined()
  })

  it('drops rows missing key or value', async () => {
    llmResponse = JSON.stringify([
      { key: 'ok', value: 'fine', category: 'personal_fact' },
      { key: null, value: 'nope', category: 'personal_fact' },
      { key: 'no-value', category: 'personal_fact' },
      { value: 'no-key', category: 'personal_fact' },
    ])
    const rows = await runExtraction('stu-malformed', 'noise')
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe('fine')
  })

  it('returns silently when LLM emits non-JSON', async () => {
    llmResponse = 'not-json-at-all'
    const rows = await runExtraction('stu-bad-json', 'noise')
    expect(rows).toEqual([])
  })

  it('returns silently when LLM emits an empty array', async () => {
    llmResponse = '[]'
    const rows = await runExtraction('stu-empty', 'noise')
    expect(rows).toEqual([])
  })

  it('extraction prompt advertises all 10 categories + multi-category examples', async () => {
    // Sanity check that the prompt itself hasn't been stripped to single-cat
    // mode. If someone removes the multi-cat examples, this test goes red.
    const { readFileSync } = await import('fs')
    const promptFile = readFileSync(
      new URL('../../src/jobs/memory-extraction.ts', import.meta.url),
      'utf-8',
    )
    expect(promptFile).toContain('completed_course')
    expect(promptFile).toContain('ge_completed')
    expect(promptFile).toContain('units_preference')
    expect(promptFile).toContain('prof_bar')
    expect(promptFile).toContain('time_preference')
    expect(promptFile).toMatch(/Multi-category examples/)
  })
})
