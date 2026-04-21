import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest'

const fetchMock = vi.fn()
// @ts-expect-error override global fetch
globalThis.fetch = fetchMock

describe('get_rmp_ratings tool', () => {
  beforeAll(async () => {
    await import('../../src/tools/get-rmp-ratings.js')
  })

  afterEach(() => {
    fetchMock.mockReset()
  })

  it('registers with names required', async () => {
    const { getToolDefinitions } = await import('../../src/agent/tool-registry.js')
    const tool = getToolDefinitions().find((t) => t.name === 'get_rmp_ratings')
    expect(tool).toBeDefined()
    expect(tool?.input_schema.properties).toHaveProperty('names')
    expect((tool?.input_schema as { required?: string[] }).required).toEqual(['names'])
  })

  it('returns error for empty names', async () => {
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_rmp_ratings', { names: [] })
    expect(result.toLowerCase()).toContain('names')
  })

  it('returns error for >50 names', async () => {
    const names = Array.from({ length: 51 }, (_, i) => `Prof ${i}`)
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_rmp_ratings', { names })
    expect(result.toLowerCase()).toContain('at most 50')
  })

  it('returns batch response on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ratings: { 'Jane Doe': { avgRating: 4.7, avgDifficulty: 3.1, numRatings: 22, wouldTakeAgainPercent: 93 } } }),
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_rmp_ratings', { names: ['Jane Doe'] })
    expect(result).toContain('Jane Doe')
    expect(result).toContain('4.7')
  })

  it('calls /api/rmp/batch as GET with comma-separated names query string', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ratings: {} }) })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    await executeTool('get_rmp_ratings', { names: ['Jane Doe', 'John Smith'] })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]
    expect(url).toContain('/api/rmp/batch?')
    // GET: no method set is also acceptable
    expect(init?.method).toBeUndefined()
    // Names encoded as comma-separated in query
    expect(url).toContain('names=Jane+Doe%2CJohn+Smith')
  })

  it('returns lookup-failed on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_rmp_ratings', { names: ['Jane Doe'] })
    expect(result.toLowerCase()).toContain('failed')
    expect(result).toContain('500')
  })
})
