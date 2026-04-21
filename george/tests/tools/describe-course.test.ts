import { describe, it, expect, beforeAll, vi } from 'vitest'

const mockMaybeSingle = vi.fn()
vi.mock('../../src/db/client.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({ maybeSingle: mockMaybeSingle }),
          }),
        }),
      }),
    }),
  },
}))

describe('describe_course tool', () => {
  beforeAll(async () => {
    await import('../../src/tools/describe-course.js')
  })

  it('registers with dept + code required', async () => {
    const { getToolDefinitions } = await import('../../src/agent/tool-registry.js')
    const tool = getToolDefinitions().find((t) => t.name === 'describe_course')
    expect(tool).toBeDefined()
    expect(tool?.input_schema.properties).toHaveProperty('dept')
    expect(tool?.input_schema.properties).toHaveProperty('code')
    expect((tool?.input_schema as { required?: string[] }).required).toEqual(['dept', 'code'])
  })

  it('returns a not-found message on miss', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('describe_course', { dept: 'ZZZ', code: '999' })
    expect(result.toLowerCase()).toContain('not found')
  })

  it('returns lookup-failed on Supabase error', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'relation does not exist' } })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('describe_course', { dept: 'CSCI', code: '201L' })
    expect(result.toLowerCase()).toContain('lookup failed')
    expect(result).toContain('relation does not exist')
  })

  it('returns stringified row on hit', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        dept: 'CSCI',
        code: '201L',
        title: 'Principles of Software Development',
        description: 'desc',
        units: '4',
        terms: 'FaSp',
        prereq: 'CSCI 104',
        corequisite: null,
        recommended_prep: null,
        restriction: null,
        mode: 'Lecture',
        grading: 'Letter',
        source_url: 'https://...',
      },
      error: null,
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('describe_course', { dept: 'CSCI', code: '201L' })
    expect(result).toContain('Principles of Software Development')
    expect(result).toContain('CSCI 104')
  })
})
