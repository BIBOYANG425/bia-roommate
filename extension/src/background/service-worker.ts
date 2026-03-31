import { fetchRmpBatch, fetchCoursebinDetails, fetchGECourses, fetchRecommendations } from './api-client'
import { StorageCache } from './cache'
import type { BackgroundMessage, BackgroundResponse, RmpRating, ExtensionSettings } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'

// ─── Set up chrome.storage.session access for content scripts ───
chrome.storage.session.setAccessLevel({
  accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
})

// ─── Caches (persist across service worker restarts) ───
const rmpCache = new StorageCache<RmpRating | null>({
  key: 'rmp',
  maxEntries: 500,
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
})

const courseCache = new StorageCache<unknown>({
  key: 'course',
  maxEntries: 200,
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
})

// ─── Message handler ───
chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => {
        console.error('[BIA Worker] Error handling message:', err)
        sendResponse({ type: 'ERROR', error: err.message } as BackgroundResponse)
      })
    return true // keep channel open for async response
  }
)

async function handleMessage(msg: BackgroundMessage): Promise<BackgroundResponse> {
  switch (msg.type) {
    case 'RMP_BATCH':
      return handleRmpBatch(msg.names)

    case 'COURSEBIN_DETAILS':
      return handleCoursebinDetails(msg.courses, msg.semester)

    case 'GE_COURSES':
      return handleGECourses((msg as any).category, (msg as any).semester)

    case 'RECOMMEND':
      return handleRecommend(msg.interests, msg.semester, msg.units)

    case 'GET_SETTINGS':
      return handleGetSettings()

    case 'SAVE_SETTINGS':
      return handleSaveSettings(msg.settings)
  }
}

async function handleRmpBatch(names: string[]): Promise<BackgroundResponse> {
  // Check cache first
  const cached = await rmpCache.getMany(names)
  const uncachedNames = names.filter((n) => !cached.has(n))

  let fetched: Record<string, RmpRating | null> = {}

  if (uncachedNames.length > 0) {
    try {
      fetched = await fetchRmpBatch(uncachedNames)

      // Cache results
      const toCache = new Map<string, RmpRating | null>()
      for (const name of uncachedNames) {
        toCache.set(name, fetched[name] ?? null)
      }
      await rmpCache.setMany(toCache)
    } catch (err) {
      console.warn('[BIA Worker] RMP batch fetch failed:', err)
      // Return cached results + nulls for failed lookups
      for (const name of uncachedNames) {
        fetched[name] = null
      }
    }
  }

  // Merge cached + fetched
  const ratings: Record<string, RmpRating | null> = {}
  for (const name of names) {
    if (cached.has(name)) {
      ratings[name] = cached.get(name)!
    } else {
      ratings[name] = fetched[name] ?? null
    }
  }

  return { type: 'RMP_BATCH_RESULT', ratings }
}

async function handleCoursebinDetails(
  courses: string[],
  semester: string
): Promise<BackgroundResponse> {
  try {
    const result = await fetchCoursebinDetails(courses, semester)
    return { type: 'COURSEBIN_RESULT', courses: result }
  } catch (err) {
    return { type: 'ERROR', error: (err as Error).message }
  }
}

async function handleGECourses(
  category: string,
  semester: string
): Promise<BackgroundResponse> {
  try {
    const courses = await fetchGECourses(category, semester)
    return { type: 'GE_RESULT', courses } as any
  } catch (err) {
    return { type: 'ERROR', error: (err as Error).message }
  }
}

async function handleRecommend(
  interests: string,
  semester: string,
  units?: string
): Promise<BackgroundResponse> {
  try {
    const result = await fetchRecommendations(interests, semester, units)
    return { type: 'RECOMMEND_RESULT', recommendations: result }
  } catch (err) {
    return { type: 'ERROR', error: (err as Error).message }
  }
}

async function handleGetSettings(): Promise<BackgroundResponse> {
  const result = await chrome.storage.local.get('settings')
  return {
    type: 'SETTINGS_RESULT',
    settings: result.settings ?? DEFAULT_SETTINGS,
  }
}

async function handleSaveSettings(settings: ExtensionSettings): Promise<BackgroundResponse> {
  await chrome.storage.local.set({ settings })
  return { type: 'SETTINGS_RESULT', settings }
}

// ─── Check storage quota periodically ───
async function checkStorageQuota() {
  const bytesInUse = await chrome.storage.local.getBytesInUse()
  const THRESHOLD = 8 * 1024 * 1024 // 8MB

  if (bytesInUse > THRESHOLD) {
    console.warn(`[BIA Worker] Storage usage high: ${(bytesInUse / 1024 / 1024).toFixed(1)}MB`)
    // Eviction is handled by the cache's maxEntries limit
    // If still over, could clear old caches entirely
  }
}

// Run quota check on install and periodically
chrome.runtime.onInstalled.addListener(() => {
  console.log('[BIA] Extension installed')
  checkStorageQuota()
})
