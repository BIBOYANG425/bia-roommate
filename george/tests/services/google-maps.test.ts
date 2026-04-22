import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = 'test-key'
  global.fetch = vi.fn()
  vi.resetModules()
})

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...originalEnv }
})

describe('geocode', () => {
  it('returns lat/lng on happy path and caches result', async () => {
    const { geocode } = await import('../../src/services/google-maps.js')
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'OK',
          results: [{ geometry: { location: { lat: 34.02, lng: -118.28 } } }],
        }),
        { status: 200 },
      ),
    )
    const first = await geocode('Pardee Tower USC')
    expect(first).toEqual({ lat: 34.02, lng: -118.28 })

    const second = await geocode('Pardee Tower USC')
    expect(second).toEqual({ lat: 34.02, lng: -118.28 })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('rejects out-of-LA-bbox results', async () => {
    const { geocode } = await import('../../src/services/google-maps.js')
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'OK',
          results: [{ geometry: { location: { lat: 42.36, lng: -71.05 } } }], // Boston
        }),
        { status: 200 },
      ),
    )
    expect(await geocode('Main Street')).toBeNull()
  })

  it('returns null on Google status != OK', async () => {
    const { geocode } = await import('../../src/services/google-maps.js')
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ZERO_RESULTS', results: [] }), { status: 200 }),
    )
    expect(await geocode('Nowhereville')).toBeNull()
  })

  it('retries once on 5xx and succeeds on the second call', async () => {
    const { geocode } = await import('../../src/services/google-maps.js')
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response('err', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'OK',
            results: [{ geometry: { location: { lat: 34.02, lng: -118.28 } } }],
          }),
          { status: 200 },
        ),
      )
    const result = await geocode('Retry Test')
    expect(result).toEqual({ lat: 34.02, lng: -118.28 })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('throws geo_disabled when key missing', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY
    const { geocode } = await import('../../src/services/google-maps.js')
    await expect(geocode('anywhere')).rejects.toMatchObject({ code: 'geo_disabled' })
  })
})
