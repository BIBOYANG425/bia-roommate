import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  process.env.GOOGLE_MAPS_API_KEY = 'test-key'
})

async function loadTool(name: string) {
  await import('../../src/tools/places.js')
  const { getToolsByNames, executeTool } = await import('../../src/agent/tool-registry.js')
  const [tool] = getToolsByNames([name])
  expect(tool, `tool ${name} not registered`).toBeDefined()
  return executeTool
}

class FakeGeoError extends Error {
  constructor(public code: string, m: string) {
    super(m)
  }
}

describe('travel_time', () => {
  it('happy path: returns minutes, km, walkable for known origin and destination', async () => {
    vi.doMock('../../src/services/google-maps.js', () => ({
      geocode: vi.fn(),
      distanceMatrix: vi.fn(async () => [[{ minutes: 15, km: 1.2 }]]),
      GeoError: FakeGeoError,
    }))
    vi.doMock('../../src/services/geo-rate-limit.js', () => ({
      checkGeoBudget: vi.fn(() => true),
    }))
    const execute = await loadTool('travel_time')
    const result = await execute('travel_time', {
      from: 'Frat Row',
      to: 'Leavey',
      mode: 'walking',
      student_id: 's1',
    })
    const parsed = JSON.parse(result)
    expect(parsed).toMatchObject({ minutes: 15, km: 1.2, walkable: true, mode: 'walking' })
  })

  it('marks walkable=false when minutes > 20', async () => {
    vi.doMock('../../src/services/google-maps.js', () => ({
      geocode: vi.fn(),
      distanceMatrix: vi.fn(async () => [[{ minutes: 25, km: 2.0 }]]),
      GeoError: FakeGeoError,
    }))
    vi.doMock('../../src/services/geo-rate-limit.js', () => ({
      checkGeoBudget: vi.fn(() => true),
    }))
    const execute = await loadTool('travel_time')
    const result = await execute('travel_time', {
      from: 'Frat Row',
      to: 'K-town',
      mode: 'walking',
      student_id: 's1',
    })
    expect(JSON.parse(result)).toMatchObject({ walkable: false })
  })

  it('returns need_location when origin is an unknown short acronym', async () => {
    vi.doMock('../../src/services/google-maps.js', () => ({
      geocode: vi.fn(),
      distanceMatrix: vi.fn(),
      GeoError: FakeGeoError,
    }))
    vi.doMock('../../src/services/geo-rate-limit.js', () => ({
      checkGeoBudget: vi.fn(() => true),
    }))
    const execute = await loadTool('travel_time')
    const result = await execute('travel_time', {
      from: 'MRF',
      to: 'Leavey',
      mode: 'walking',
      student_id: 's1',
    })
    expect(JSON.parse(result)).toMatchObject({ error: 'need_location' })
  })

  it('falls through to geocode for non-acronym unknowns', async () => {
    const geocodeMock = vi.fn(async () => ({ lat: 34.05, lng: -118.24 }))
    vi.doMock('../../src/services/google-maps.js', () => ({
      geocode: geocodeMock,
      distanceMatrix: vi.fn(async () => [[{ minutes: 30, km: 12 }]]),
      GeoError: FakeGeoError,
    }))
    vi.doMock('../../src/services/geo-rate-limit.js', () => ({
      checkGeoBudget: vi.fn(() => true),
    }))
    const execute = await loadTool('travel_time')
    const result = await execute('travel_time', {
      from: '1234 Main St',
      to: 'Leavey',
      mode: 'driving',
      student_id: 's1',
    })
    expect(geocodeMock).toHaveBeenCalled()
    expect(JSON.parse(result)).toMatchObject({ minutes: 30 })
  })

  it('returns geo_budget_exceeded when over the per-student cap', async () => {
    vi.doMock('../../src/services/google-maps.js', () => ({
      geocode: vi.fn(),
      distanceMatrix: vi.fn(),
      GeoError: FakeGeoError,
    }))
    vi.doMock('../../src/services/geo-rate-limit.js', () => ({
      checkGeoBudget: vi.fn(() => false),
    }))
    const execute = await loadTool('travel_time')
    const result = await execute('travel_time', {
      from: 'Frat Row',
      to: 'Leavey',
      student_id: 's1',
    })
    expect(JSON.parse(result)).toMatchObject({ error: 'geo_budget_exceeded' })
  })

  it('returns geo_unavailable when the Google client errors', async () => {
    vi.doMock('../../src/services/google-maps.js', () => ({
      geocode: vi.fn(),
      distanceMatrix: vi.fn(async () => {
        throw new FakeGeoError('geo_unavailable', 'timeout')
      }),
      GeoError: FakeGeoError,
    }))
    vi.doMock('../../src/services/geo-rate-limit.js', () => ({
      checkGeoBudget: vi.fn(() => true),
    }))
    const execute = await loadTool('travel_time')
    const result = await execute('travel_time', {
      from: 'Frat Row',
      to: 'Leavey',
      student_id: 's1',
    })
    expect(JSON.parse(result)).toMatchObject({ error: 'geo_unavailable' })
  })

  it('returns geo_disabled when key missing', async () => {
    vi.doMock('../../src/services/google-maps.js', () => ({
      geocode: vi.fn(),
      distanceMatrix: vi.fn(async () => {
        throw new FakeGeoError('geo_disabled', 'no key')
      }),
      GeoError: FakeGeoError,
    }))
    vi.doMock('../../src/services/geo-rate-limit.js', () => ({
      checkGeoBudget: vi.fn(() => true),
    }))
    const execute = await loadTool('travel_time')
    const result = await execute('travel_time', {
      from: 'Frat Row',
      to: 'Leavey',
      student_id: 's1',
    })
    expect(JSON.parse(result)).toMatchObject({ error: 'geo_disabled' })
  })
})
