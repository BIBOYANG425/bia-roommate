const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 3_600_000; // 1 hour
const MAX_ENTRIES = 20;

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  if (cache.size >= MAX_ENTRIES) {
    // evict oldest
    let oldestKey = "";
    let oldestTs = Infinity;
    for (const [k, v] of cache) {
      if (v.ts < oldestTs) {
        oldestTs = v.ts;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, ts: Date.now() });
}
