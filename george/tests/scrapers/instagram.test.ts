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

describe('scrapeInstagram — graceful degrade', () => {
  it('logs instagram_unavailable and returns when APIFY_TOKEN is empty', async () => {
    process.env.APIFY_TOKEN = ''
    vi.resetModules()

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    expect(actorCallMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
    const warnCall = logMock.mock.calls.find(
      (c) => c[0] === 'warn' && c[1] === 'instagram_unavailable',
    )
    expect(warnCall).toBeDefined()
  })

  it('logs instagram_unavailable and returns when the apify actor call rejects', async () => {
    actorCallMock.mockRejectedValueOnce(new Error('apify network down'))

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    expect(insertMock).not.toHaveBeenCalled()
    const warnCall = logMock.mock.calls.find(
      (c) => c[0] === 'warn' && c[1] === 'instagram_unavailable',
    )
    expect(warnCall).toBeDefined()
    expect(warnCall![2]).toMatchObject({ error: 'apify network down' })
  })
})

describe('scrapeInstagram — insert error handling', () => {
  it('silently skips a unique-violation (23505) — expected race resolution', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'Mixer', displayUrl: 'https://cdn/q.jpg', url: 'https://ig/p/q', ownerUsername: 'sparksc' },
      ],
    })
    llmMock.mockResolvedValueOnce(JSON.stringify({
      isEvent: true,
      title: 'Spring Mixer',
      description: 'Free pizza',
      date: daysFromNow(7),
      location: 'TCC',
      category: 'social',
    }))
    insertMock.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key' } })

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    const warnCall = logMock.mock.calls.find(
      (c) => c[0] === 'warn' && c[1] === 'instagram_insert_failed',
    )
    expect(warnCall).toBeUndefined()
    const doneCall = logMock.mock.calls.find((c) => c[1] === 'instagram_scrape_done')
    expect(doneCall![2]).toMatchObject({ events_inserted: 0 })
  })

  it('logs instagram_insert_failed warn on unexpected supabase errors', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'Talk', displayUrl: 'https://cdn/r.jpg', url: 'https://ig/p/r', ownerUsername: 'sparksc' },
      ],
    })
    llmMock.mockResolvedValueOnce(JSON.stringify({
      isEvent: true,
      title: 'Founders Talk',
      description: 'Demos',
      date: daysFromNow(14),
      location: 'Founders',
      category: 'career',
    }))
    insertMock.mockResolvedValueOnce({ error: { code: '99999', message: 'something broke' } })

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    const warnCall = logMock.mock.calls.find(
      (c) => c[0] === 'warn' && c[1] === 'instagram_insert_failed',
    )
    expect(warnCall).toBeDefined()
    expect(warnCall![2]).toMatchObject({ code: '99999' })
  })
})

describe('scrapeInstagram — LLM and post edge cases', () => {
  it('counts a post as llm_rejected when LLM returns malformed JSON', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'whatever', displayUrl: 'https://cdn/m.jpg', url: 'https://ig/p/m', ownerUsername: 'troylabsusc' },
      ],
    })
    llmMock.mockResolvedValueOnce('not-json-at-all{{{')

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    expect(insertMock).not.toHaveBeenCalled()
    const doneCall = logMock.mock.calls.find((c) => c[1] === 'instagram_scrape_done')
    expect(doneCall![2]).toMatchObject({ llm_rejected: 1, validation_rejected: 0, events_inserted: 0 })
  })

  it('skips dedup query when post.url is missing but still tries LLM + insert', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'no url', displayUrl: 'https://cdn/n.jpg', ownerUsername: 'sparksc' },
      ],
    })
    llmMock.mockResolvedValueOnce(JSON.stringify({
      isEvent: true,
      title: 'No-URL Event',
      description: 'edge case',
      date: daysFromNow(5),
      location: 'somewhere',
      category: 'other',
    }))

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    expect(maybeSingleMock).not.toHaveBeenCalled()
    expect(insertMock).toHaveBeenCalledTimes(1)
    const row = insertMock.mock.calls[0][0]
    expect(row.source_url).toBeUndefined()
  })
})

describe('scrapeInstagram — structured counters', () => {
  it('logs instagram_scrape_done with the expected counter shape', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'Formal', displayUrl: 'https://cdn/a.jpg', url: 'https://ig/p/a', ownerUsername: 'troylabsusc' },
        { caption: 'Cute pic', displayUrl: 'https://cdn/b.jpg', url: 'https://ig/p/b', ownerUsername: 'troylabsusc' },
        { caption: 'Dated wrong', displayUrl: 'https://cdn/c.jpg', url: 'https://ig/p/c', ownerUsername: 'troylabsusc' },
      ],
    })

    llmMock
      .mockResolvedValueOnce(JSON.stringify({
        isEvent: true,
        title: 'Founders Lunch',
        description: 'Lunch',
        date: daysFromNow(10),
        location: 'Founders',
        category: 'career',
      }))
      .mockResolvedValueOnce(JSON.stringify({ isEvent: false, title: '', date: null, category: 'other' }))
      .mockResolvedValueOnce(JSON.stringify({
        isEvent: true,
        title: 'Past-date event',
        description: 'x',
        date: daysFromNow(-5),
        location: 'x',
        category: 'social',
      }))

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    const doneCall = logMock.mock.calls.find((c) => c[1] === 'instagram_scrape_done')
    expect(doneCall).toBeDefined()
    expect(doneCall![2]).toMatchObject({
      scraped: 3,
      candidates: 3,
      events_inserted: 1,
      llm_rejected: 1,
      validation_rejected: 1,
    })
  })
})

describe('scrapeInstagram — dedup', () => {
  it('skips posts whose source_url already exists in the events table', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'Career Mixer', displayUrl: 'https://cdn/3.jpg', url: 'https://ig/p/dup', ownerUsername: 'sparksc' },
      ],
    })
    maybeSingleMock.mockResolvedValueOnce({ data: { id: 'existing-id' } })

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    expect(llmMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
  })
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
