import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

const fetchMock = vi.fn()
// @ts-expect-error override the global for hermetic tests
globalThis.fetch = fetchMock

describe('get_course_reviews tool (BIA + RMP merge)', () => {
  beforeAll(async () => {
    await import('../../src/tools/get-course-reviews.js')
  })

  afterEach(() => {
    fetchMock.mockReset()
  })

  it('is registered and description mentions RMP', async () => {
    const { getToolDefinitions } = await import('../../src/agent/tool-registry.js')
    const tool = getToolDefinitions().find((t) => t.name === 'get_course_reviews')
    expect(tool).toBeDefined()
    expect(tool?.description.toLowerCase()).toContain('rmp')
  })

  it('merges bia_reviews + rmp payloads on success', async () => {
    fetchMock.mockImplementation(async (url: string | URL) => {
      const u = url.toString()
      if (u.includes('/api/course-rating/reviews')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            reviews: [
              { instructor: 'Jane Doe', rating: 5 },
              { instructor: 'John Smith', rating: 4 },
              { instructor: 'Jane Doe', rating: 3 }, // duplicate
            ],
          }),
        }
      }
      if (u.includes('/api/rmp/batch')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            'Jane Doe': { avgRating: 4.5 },
            'John Smith': { avgRating: 3.8 },
          }),
        }
      }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_course_reviews', { dept: 'csci', number: '201' })
    const parsed = JSON.parse(result)
    expect(parsed).toHaveProperty('bia_reviews')
    expect(parsed).toHaveProperty('rmp')
    expect(parsed.rmp['Jane Doe'].avgRating).toBe(4.5)
    expect(parsed.rmp['John Smith'].avgRating).toBe(3.8)

    // Verify the RMP call was made with deduplicated names.
    const rmpCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/rmp/batch'))
    expect(rmpCall).toBeDefined()
    const body = JSON.parse((rmpCall![1] as { body: string }).body)
    expect(body.names).toEqual(expect.arrayContaining(['Jane Doe', 'John Smith']))
    expect(body.names.length).toBe(2)
  })

  it('skips RMP call when no instructors are present', async () => {
    fetchMock.mockImplementation(async (url: string | URL) => {
      const u = url.toString()
      if (u.includes('/api/course-rating/reviews')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ reviews: [{ rating: 4 /* no instructor field */ }] }),
        }
      }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_course_reviews', { dept: 'CSCI', number: '201' })
    const parsed = JSON.parse(result)
    expect(parsed).toHaveProperty('bia_reviews')
    expect(parsed.rmp).toEqual({})
    // Only the BIA call should have happened.
    const rmpCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/api/rmp/batch'))
    expect(rmpCalls.length).toBe(0)
  })

  it('returns bia_reviews with empty rmp when RMP call fails', async () => {
    fetchMock.mockImplementation(async (url: string | URL) => {
      const u = url.toString()
      if (u.includes('/api/course-rating/reviews')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ reviews: [{ instructor: 'Jane Doe', rating: 5 }] }),
        }
      }
      if (u.includes('/api/rmp/batch')) {
        return { ok: false, status: 500, json: async () => ({}) }
      }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_course_reviews', { dept: 'CSCI', number: '201' })
    const parsed = JSON.parse(result)
    expect(parsed).toHaveProperty('bia_reviews')
    expect(parsed.rmp).toEqual({})
    expect(parsed.bia_reviews.reviews[0].instructor).toBe('Jane Doe')
  })

  it('still returns bia_reviews when the RMP fetch throws', async () => {
    fetchMock.mockImplementation(async (url: string | URL) => {
      const u = url.toString()
      if (u.includes('/api/course-rating/reviews')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ reviews: [{ instructor: 'Jane Doe', rating: 5 }] }),
        }
      }
      if (u.includes('/api/rmp/batch')) {
        throw new Error('network boom')
      }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_course_reviews', { dept: 'CSCI', number: '201' })
    const parsed = JSON.parse(result)
    expect(parsed).toHaveProperty('bia_reviews')
    expect(parsed.rmp).toEqual({})
  })

  it('returns "No reviews found." when BIA reviews are empty', async () => {
    fetchMock.mockImplementation(async (url: string | URL) => {
      const u = url.toString()
      if (u.includes('/api/course-rating/reviews')) {
        return { ok: true, status: 200, json: async () => ({ reviews: [] }) }
      }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('get_course_reviews', { dept: 'CSCI', number: '201' })
    expect(result.toLowerCase()).toContain('no reviews')
  })
})
