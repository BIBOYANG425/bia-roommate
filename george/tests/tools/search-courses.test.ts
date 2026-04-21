import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest'

const fetchMock = vi.fn()
// @ts-expect-error override
globalThis.fetch = fetchMock

const mockIn = vi.fn()
vi.mock('../../src/db/client.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => ({
        in: mockIn,
      }),
    })),
  },
}))

describe('search_courses tool (enriched)', () => {
  beforeAll(async () => {
    await import('../../src/tools/search-courses.js')
  })

  afterEach(() => {
    fetchMock.mockReset()
    mockIn.mockReset()
  })

  it('description mentions catalog/description/prereq', async () => {
    const { getToolDefinitions } = await import('../../src/agent/tool-registry.js')
    const tool = getToolDefinitions().find((t) => t.name === 'search_courses')
    expect(tool).toBeDefined()
    expect(tool?.description.toLowerCase()).toMatch(/catalog|description|prereq/)
  })

  it('attaches catalog data to section matches (prefix fallback: 201 -> 201L)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { department: 'CSCI', number: '201', title: 'Principles of Software Development', units: '4' },
      ],
    })
    mockIn.mockResolvedValueOnce({
      data: [
        {
          dept: 'CSCI',
          code: '201L',
          description: 'OOP in Java',
          prereq: 'CSCI 104',
          units: '4',
          terms: 'FaSp',
        },
      ],
      error: null,
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('search_courses', { query: 'CSCI 201' })
    const parsed = JSON.parse(result)
    expect(parsed[0]).toHaveProperty('catalog')
    expect(parsed[0].catalog.description).toContain('OOP')
    expect(parsed[0].catalog.prereq).toBe('CSCI 104')
  })

  it('attaches catalog data on exact code match', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { department: 'WRIT', number: '150', title: 'Writing', units: '4' },
      ],
    })
    mockIn.mockResolvedValueOnce({
      data: [
        {
          dept: 'WRIT',
          code: '150',
          description: 'Freshman writing',
          prereq: null,
          units: '4',
          terms: 'FaSp',
        },
      ],
      error: null,
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('search_courses', { query: 'WRIT 150' })
    const parsed = JSON.parse(result)
    expect(parsed[0].catalog.description).toBe('Freshman writing')
  })

  it('leaves catalog null when no match', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ department: 'ZZZ', number: '999', title: 'Unknown', units: '0' }],
    })
    mockIn.mockResolvedValueOnce({ data: [], error: null })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('search_courses', { query: 'ZZZ 999' })
    const parsed = JSON.parse(result)
    expect(parsed[0].catalog).toBeNull()
  })

  it('returns no-courses message when WebReg returns empty', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('search_courses', { query: 'nothinghere' })
    expect(result.toLowerCase()).toContain('no courses')
  })

  it('returns failure message on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('search_courses', { query: 'x' })
    expect(result).toContain('Course search failed')
    expect(result).toContain('503')
  })
})
