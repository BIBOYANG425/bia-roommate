import { describe, it, expect, vi, beforeEach } from 'vitest'

const actorCallMock = vi.fn()
const datasetListItemsMock = vi.fn()
vi.mock('apify-client', () => ({
  ApifyClient: class {
    actor() {
      return { call: actorCallMock }
    }
    dataset() {
      return { listItems: datasetListItemsMock }
    }
  },
}))

const llmMock = vi.fn()
vi.mock('../../src/agent/llm-providers.js', () => ({
  callLightweightLLM: llmMock,
}))

const maybeSingleMock = vi.fn()
const insertMock = vi.fn()
vi.mock('../../src/db/client.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      insert: insertMock,
    })),
  },
}))

const logMock = vi.fn()
vi.mock('../../src/observability/logger.js', () => ({
  log: logMock,
}))

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

beforeEach(() => {
  process.env.APIFY_TOKEN = 'test-apify-token'
  vi.resetModules()
  actorCallMock.mockReset()
  datasetListItemsMock.mockReset()
  llmMock.mockReset()
  maybeSingleMock.mockReset()
  insertMock.mockReset()
  logMock.mockReset()
  maybeSingleMock.mockResolvedValue({ data: null })
  insertMock.mockResolvedValue({ error: null })
  actorCallMock.mockResolvedValue({ defaultDatasetId: 'ds-1' })
})

describe('scrapeInstagram — happy path', () => {
  it('inserts one event row per valid post, skips invalid, uses resultsLimit=3', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'Come to our formal!', displayUrl: 'https://cdn/1.jpg', url: 'https://ig/p/1', ownerUsername: 'troylabsusc' },
        { caption: 'just a cute dog pic', displayUrl: 'https://cdn/2.jpg', url: 'https://ig/p/2', ownerUsername: 'troylabsusc' },
      ],
    })

    llmMock
      .mockResolvedValueOnce(JSON.stringify({
        isEvent: true,
        title: 'Spring Founders Mixer',
        description: 'Come to our mixer!',
        date: daysFromNow(14),
        location: 'Founders Hall',
        category: 'career',
      }))
      .mockResolvedValueOnce(JSON.stringify({
        isEvent: false,
        title: '',
        date: null,
        category: 'other',
      }))

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    expect(actorCallMock).toHaveBeenCalledTimes(1)
    const callArg = actorCallMock.mock.calls[0][0]
    expect(callArg.resultsLimit).toBe(3)
    expect(Array.isArray(callArg.username)).toBe(true)
    expect(callArg.username.length).toBeGreaterThan(0)

    expect(insertMock).toHaveBeenCalledTimes(1)
    const row = insertMock.mock.calls[0][0]
    expect(row).toMatchObject({
      title: 'Spring Founders Mixer',
      category: 'career',
      source: 'instagram',
      source_url: 'https://ig/p/1',
      source_account: 'troylabsusc',
      image_url: 'https://cdn/1.jpg',
      status: 'active',
    })
  })
})
