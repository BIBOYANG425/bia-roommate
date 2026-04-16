// LRU cache backed by chrome.storage.local. Configurable TTL + max entries, with
// timestamps serialized into each entry for expiry. Survives MV3 service worker
// termination — all state is persisted. Used by RMP / courses / GE lookups from
// service-worker.ts.
//
// Header last reviewed: 2026-04-16

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

interface CacheConfig {
  key: string; // storage key prefix
  maxEntries: number;
  ttlMs: number;
}

export class StorageCache<T> {
  private config: CacheConfig;
  private indexLock: Promise<void> = Promise.resolve();

  constructor(config: CacheConfig) {
    this.config = config;
  }

  private storageKey(id: string): string {
    return `${this.config.key}:${id}`;
  }

  private indexKey(): string {
    return `${this.config.key}:__index`;
  }

  // Serialize all index mutations to prevent lost updates
  private withIndexLock<R>(fn: () => Promise<R>): Promise<R> {
    const prev = this.indexLock;
    let resolve: () => void;
    this.indexLock = new Promise<void>((r) => {
      resolve = r;
    });
    return prev.then(fn).finally(() => resolve!());
  }

  async get(id: string): Promise<T | undefined> {
    try {
      const key = this.storageKey(id);
      const result = await chrome.storage.local.get(key);
      const entry = result[key] as CacheEntry<T> | undefined;

      if (!entry) return undefined;
      if (Date.now() - entry.timestamp > this.config.ttlMs) {
        // Expired — remove entry and index reference
        await this.withIndexLock(async () => {
          await chrome.storage.local.remove(key);
          const indexKey = this.indexKey();
          const idxResult = await chrome.storage.local.get(indexKey);
          const index: string[] = idxResult[indexKey] || [];
          const filtered = index.filter((i) => i !== id);
          await chrome.storage.local.set({ [indexKey]: filtered });
        });
        return undefined;
      }

      // Update access order in index
      await this.withIndexLock(() => this.touchIndex(id));
      return entry.value;
    } catch {
      return undefined;
    }
  }

  async getMany(ids: string[]): Promise<Map<string, T>> {
    const keys = ids.map((id) => this.storageKey(id));
    const result = await chrome.storage.local.get(keys);
    const now = Date.now();
    const found = new Map<string, T>();
    const expiredIds: string[] = [];
    const hitIds: string[] = [];

    for (const id of ids) {
      const entry = result[this.storageKey(id)] as CacheEntry<T> | undefined;
      if (!entry) continue;
      if (now - entry.timestamp > this.config.ttlMs) {
        expiredIds.push(id);
      } else {
        found.set(id, entry.value);
        hitIds.push(id);
      }
    }

    // Clean up expired entries and refresh recency for hits in one lock
    if (expiredIds.length > 0 || hitIds.length > 0) {
      await this.withIndexLock(async () => {
        const indexKey = this.indexKey();
        const idxResult = await chrome.storage.local.get(indexKey);
        let index: string[] = idxResult[indexKey] || [];

        // Remove expired entries from storage and index
        if (expiredIds.length > 0) {
          const keysToRemove = expiredIds.map((id) => this.storageKey(id));
          await chrome.storage.local.remove(keysToRemove);
          const expiredSet = new Set(expiredIds);
          index = index.filter((i) => !expiredSet.has(i));
        }

        // Refresh recency for hits — move to end
        if (hitIds.length > 0) {
          const hitSet = new Set(hitIds);
          index = index.filter((i) => !hitSet.has(i));
          index.push(...hitIds);
        }

        await chrome.storage.local.set({ [indexKey]: index });
      });
    }

    return found;
  }

  async set(id: string, value: T): Promise<void> {
    const key = this.storageKey(id);
    const entry: CacheEntry<T> = { value, timestamp: Date.now() };

    await chrome.storage.local.set({ [key]: entry });
    await this.withIndexLock(async () => {
      await this.touchIndex(id);
      await this.evictIfNeeded();
    });
  }

  async setMany(entries: Map<string, T>): Promise<void> {
    const items: Record<string, CacheEntry<T>> = {};
    const now = Date.now();

    for (const [id, value] of entries) {
      items[this.storageKey(id)] = { value, timestamp: now };
    }

    await chrome.storage.local.set(items);

    await this.withIndexLock(async () => {
      const indexKey = this.indexKey();
      const result = await chrome.storage.local.get(indexKey);
      let index: string[] = result[indexKey] || [];

      // Move all new entries to end (most recently used)
      const newIds = new Set(entries.keys());
      index = index.filter((i) => !newIds.has(i));
      index.push(...newIds);

      await chrome.storage.local.set({ [indexKey]: index });
      await this.evictIfNeeded();
    });
  }

  // Must be called within withIndexLock
  private async touchIndex(id: string): Promise<void> {
    const indexKey = this.indexKey();
    const result = await chrome.storage.local.get(indexKey);
    const index: string[] = result[indexKey] || [];

    // Move to end (most recently used)
    const filtered = index.filter((i) => i !== id);
    filtered.push(id);

    await chrome.storage.local.set({ [indexKey]: filtered });
  }

  // Must be called within withIndexLock
  private async evictIfNeeded(): Promise<void> {
    const indexKey = this.indexKey();
    const result = await chrome.storage.local.get(indexKey);
    const index: string[] = result[indexKey] || [];

    if (index.length <= this.config.maxEntries) return;

    // Evict oldest entries
    const toRemove = index.slice(0, index.length - this.config.maxEntries);
    const keysToRemove = toRemove.map((id) => this.storageKey(id));

    await chrome.storage.local.remove(keysToRemove);
    await chrome.storage.local.set({
      [indexKey]: index.slice(toRemove.length),
    });
  }
}
