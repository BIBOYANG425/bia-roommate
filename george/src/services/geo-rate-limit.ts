// Per-student per-hour budget for geo-tool calls. Stops a single student
// from burning Google Maps spend via a 12-iteration sub-agent loop on every
// message.
//
// Default: 30 calls / hour / student. Fixed 60-min buckets keyed on
// studentId, in-process memory. Not a strict rolling-hour; a student who
// exhausts the cap at :59 gets reset at :00 of the next hour. Close enough
// for cost protection; moves to Redis when we run multiple agent instances.
//
// Header last reviewed: 2026-04-21

import { log } from '../observability/logger.js'

const MAX_PER_HOUR = 30
const WINDOW_MS = 60 * 60 * 1000

interface Bucket {
  windowStart: number
  count: number
  lastWarnedAt: number
}

const buckets = new Map<string, Bucket>()

export function checkGeoBudget(studentId: string, now: number = Date.now()): boolean {
  const b = buckets.get(studentId)
  if (!b || now - b.windowStart >= WINDOW_MS) {
    buckets.set(studentId, { windowStart: now, count: 1, lastWarnedAt: 0 })
    return true
  }
  if (b.count >= MAX_PER_HOUR) {
    if (now - b.lastWarnedAt >= WINDOW_MS) {
      log('warn', 'geo_budget_exceeded_for_student', { studentId, count: b.count })
      b.lastWarnedAt = now
    }
    return false
  }
  b.count += 1
  return true
}

// Test-only helper. Do not call from production code.
export function _resetBudgets(): void {
  buckets.clear()
}
