// LRU cache backed by chrome.storage.local
// All state persisted — survives MV3 service worker termination

interface CacheEntry<T> {
  value: T
  timestamp: number
}

interface CacheConfig {
  key: string       // storage key prefix
  maxEntries: number
  ttlMs: number
}

export class StorageCache<T> {
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
  }

  private storageKey(id: string): string {
    return `${this.config.key}:${id}`
  }

  private indexKey(): string {
    return `${this.config.key}:__index`
  }

  async get(id: string): Promise<T | undefined> {
    try {
      const key = this.storageKey(id)
      const result = await chrome.storage.local.get(key)
      const entry = result[key] as CacheEntry<T> | undefined

      if (!entry) return undefined
      if (Date.now() - entry.timestamp > this.config.ttlMs) {
        // Expired — remove it
        await chrome.storage.local.remove(key)
        return undefined
      }

      // Update access order in index
      await this.touchIndex(id)
      return entry.value
    } catch {
      return undefined
    }
  }

  async getMany(ids: string[]): Promise<Map<string, T>> {
    const keys = ids.map((id) => this.storageKey(id))
    const result = await chrome.storage.local.get(keys)
    const now = Date.now()
    const found = new Map<string, T>()

    for (const id of ids) {
      const entry = result[this.storageKey(id)] as CacheEntry<T> | undefined
      if (entry && now - entry.timestamp <= this.config.ttlMs) {
        found.set(id, entry.value)
      }
    }

    return found
  }

  async set(id: string, value: T): Promise<void> {
    const key = this.storageKey(id)
    const entry: CacheEntry<T> = { value, timestamp: Date.now() }

    await chrome.storage.local.set({ [key]: entry })
    await this.touchIndex(id)
    await this.evictIfNeeded()
  }

  async setMany(entries: Map<string, T>): Promise<void> {
    const items: Record<string, CacheEntry<T>> = {}
    const now = Date.now()

    for (const [id, value] of entries) {
      items[this.storageKey(id)] = { value, timestamp: now }
    }

    await chrome.storage.local.set(items)

    for (const id of entries.keys()) {
      await this.touchIndex(id)
    }

    await this.evictIfNeeded()
  }

  private async touchIndex(id: string): Promise<void> {
    const indexKey = this.indexKey()
    const result = await chrome.storage.local.get(indexKey)
    const index: string[] = result[indexKey] || []

    // Move to end (most recently used)
    const filtered = index.filter((i) => i !== id)
    filtered.push(id)

    await chrome.storage.local.set({ [indexKey]: filtered })
  }

  private async evictIfNeeded(): Promise<void> {
    const indexKey = this.indexKey()
    const result = await chrome.storage.local.get(indexKey)
    const index: string[] = result[indexKey] || []

    if (index.length <= this.config.maxEntries) return

    // Evict oldest entries
    const toRemove = index.slice(0, index.length - this.config.maxEntries)
    const keysToRemove = toRemove.map((id) => this.storageKey(id))

    await chrome.storage.local.remove(keysToRemove)
    await chrome.storage.local.set({
      [indexKey]: index.slice(toRemove.length),
    })
  }
}
