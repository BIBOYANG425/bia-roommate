import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest'

const fetchMock = vi.fn()
// @ts-expect-error override
globalThis.fetch = fetchMock

describe('recommend_courses tool', () => {
  beforeAll(async () => {
    await import('../../src/tools/recommend-courses.js')
  })

  afterEach(() => fetchMock.mockReset())

  it("POSTs with mode='free' to avoid LLM agent timeout", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recommendations: [{ dept: 'CSCI', code: '201L' }] }),
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    await executeTool('recommend_courses', { interests: 'AI, startups' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const call = fetchMock.mock.calls[0]
    const url = call[0] as string
    const init = call[1] as RequestInit
    expect(url).toContain('/api/courses/recommend')
    const body = JSON.parse(init.body as string)
    expect(body.mode).toBe('free')
    expect(body.interests).toBe('AI, startups')
  })

  it('returns empty-recs message when backend returns no recommendations', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recommendations: [] }),
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('recommend_courses', { interests: 'abstract algebra' })
    expect(result.toLowerCase()).toContain('no recommendations')
  })

  it('returns failure message on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('recommend_courses', { interests: 'chess' })
    expect(result).toContain('503')
  })
})
