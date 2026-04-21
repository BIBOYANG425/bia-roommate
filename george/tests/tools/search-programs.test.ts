import { describe, it, expect, beforeAll, vi } from 'vitest'

// Mock the searchWithFallback helper so the test is hermetic (no live Supabase).
const mockSearch = vi.fn()
vi.mock('../../src/tools/search-helpers.js', () => ({
  searchWithFallback: mockSearch,
}))

describe('search_programs tool', () => {
  beforeAll(async () => {
    await import('../../src/tools/search-programs.js')
  })

  it('registers with query required', async () => {
    const { getToolDefinitions } = await import('../../src/agent/tool-registry.js')
    const tool = getToolDefinitions().find((t) => t.name === 'search_programs')
    expect(tool).toBeDefined()
    expect(tool?.input_schema.properties).toHaveProperty('query')
    expect((tool?.input_schema as { required?: string[] }).required).toEqual(['query'])
  })

  it('returns a not-found message when nothing matches', async () => {
    mockSearch.mockResolvedValueOnce([])
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('search_programs', { query: 'zzzzznonsense_xyz' })
    expect(result.toLowerCase()).toContain('no programs')
  })

  it('returns JSON on hits', async () => {
    mockSearch.mockResolvedValueOnce([
      { name: 'Accounting (BS)', degree_type: 'BS', school: 'USC Marshall School of Business', description: 'Accounting description.' },
    ])
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('search_programs', { query: 'accounting' })
    expect(result).toContain('Accounting (BS)')
    expect(result).toContain('Marshall')
  })
})
