/**
 * Locks down get_student_academic_state — the tool the course voice MUST
 * call before recommending. Drift in the queried category list or the
 * `missing` flag logic would silently break the "ask before recommend"
 * discipline added in PR #40.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

interface StudentRow {
  year: string | null
  major: string | null
  interests: string[] | null
}

interface MemoryRow {
  key: string
  value: string
  category: string
}

let studentRow: StudentRow | null = null
let memoryRows: MemoryRow[] = []

vi.mock('../../src/db/client.js', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'students') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: studentRow, error: null }),
            }),
          }),
        }
      }
      if (table === 'student_memories') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({ data: memoryRows, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  },
}))

async function callTool(input: { student_id?: string }) {
  await import('../../src/tools/get-student-academic-state.js')
  const { executeTool } = await import('../../src/agent/tool-registry.js')
  const result = await executeTool('get_student_academic_state', input)
  return JSON.parse(result)
}

describe('get_student_academic_state', () => {
  beforeEach(() => {
    vi.resetModules()
    studentRow = null
    memoryRows = []
  })

  it('returns an error result when no student_id is provided', async () => {
    const out = await callTool({})
    expect(out.error).toMatch(/no student context/i)
  })

  it('flags year/major/ge_status/units_preference as missing for empty profile', async () => {
    studentRow = { year: null, major: null, interests: null }
    memoryRows = []
    const out = await callTool({ student_id: 'stu-empty' })
    expect(out.profile).toEqual({ year: null, major: null, interests: [] })
    expect(out.completed_courses).toEqual([])
    expect(out.ge_status).toEqual({})
    expect(out.missing).toEqual(
      expect.arrayContaining(['year', 'major', 'ge_status', 'units_preference']),
    )
  })

  it('has empty missing[] when all 4 key fields are populated', async () => {
    studentRow = { year: 'junior', major: 'CS', interests: ['AI'] }
    memoryRows = [
      { key: 'GE-A', value: 'done', category: 'ge_completed' },
      { key: 'default', value: '14', category: 'units_preference' },
    ]
    const out = await callTool({ student_id: 'stu-full' })
    expect(out.missing).toEqual([])
    expect(out.profile.year).toBe('junior')
    expect(out.profile.major).toBe('CS')
    expect(out.ge_status).toEqual({ 'GE-A': 'done' })
    expect(out.units_preference).toBe('14')
  })

  it('populates completed_courses, prof_bar, and time_preference from memory', async () => {
    studentRow = { year: 'soph', major: 'CS', interests: [] }
    memoryRows = [
      { key: 'CSCI 104', value: 'completed', category: 'completed_course' },
      { key: 'MATH 225', value: 'completed', category: 'completed_course' },
      { key: 'default', value: '4.0', category: 'prof_bar' },
      { key: 'default', value: 'no class before 10am', category: 'time_preference' },
      { key: 'GE-C', value: 'in progress', category: 'ge_completed' },
    ]
    const out = await callTool({ student_id: 'stu-rich' })
    expect(out.completed_courses).toEqual(
      expect.arrayContaining(['CSCI 104', 'MATH 225']),
    )
    expect(out.prof_bar).toBe('4.0')
    expect(out.time_preference).toBe('no class before 10am')
    expect(out.ge_status['GE-C']).toBe('in progress')
  })

  it('falls back to personal_fact category when students.year is null', async () => {
    studentRow = { year: null, major: null, interests: [] }
    memoryRows = [
      { key: 'year', value: 'sophomore', category: 'personal_fact' },
      { key: 'major', value: 'EE', category: 'personal_fact' },
    ]
    const out = await callTool({ student_id: 'stu-mem-fallback' })
    expect(out.profile.year).toBe('sophomore')
    expect(out.profile.major).toBe('EE')
    expect(out.missing).not.toContain('year')
    expect(out.missing).not.toContain('major')
  })

  it('ignores memory rows whose category falls outside the queried set', async () => {
    // We pre-filter via `.in('category', [...])` so the DB shouldn't return
    // unknown categories — but if it ever does (replication lag, manual
    // insert), the switch statement quietly drops them.
    studentRow = { year: 'freshman', major: 'CS', interests: [] }
    memoryRows = [
      { key: 'GE-A', value: 'done', category: 'ge_completed' },
      // @ts-expect-error simulating bad data from DB
      { key: 'whatever', value: 'unrelated', category: 'food_preference' },
    ]
    const out = await callTool({ student_id: 'stu-with-noise' })
    expect(out.ge_status).toEqual({ 'GE-A': 'done' })
    // No throw, no crash — bad row silently skipped.
  })
})
