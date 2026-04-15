import { log } from '../observability/logger.js'

const WINDOW_MS = 60_000
const MAX_MESSAGES = 10

const counters = new Map<string, { count: number; windowStart: number }>()

export function checkRateLimit(studentId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const entry = counters.get(studentId)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    counters.set(studentId, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (entry.count >= MAX_MESSAGES) {
    const retryAfterMs = WINDOW_MS - (now - entry.windowStart)
    log('warn', 'rate_limit_hit', { studentId, count: entry.count })
    return { allowed: false, retryAfterMs }
  }

  entry.count++
  return { allowed: true }
}

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 2
  for (const [key, entry] of counters) {
    if (entry.windowStart < cutoff) counters.delete(key)
  }
}, WINDOW_MS * 5)

export const RATE_LIMIT_RESPONSE = '你发太快了 —— 缓一分钟再来。'
