// In-memory failed-attempt limiter for link-code claims. Codes are 6 digits in
// one global namespace and the claim path is reachable from the unauthenticated
// web relay, so guessing must be throttled: max 3 failures per claimer per
// 10 min, plus a process-wide cap of 30 per 10 min against distributed guessing.
//
// Header last reviewed: 2026-06-11

const WINDOW_MS = 10 * 60_000
const MAX_FAILED_PER_CLAIMER = 3
const MAX_FAILED_GLOBAL = 30

const failuresByClaimer = new Map<string, number[]>()
let globalFailures: number[] = []

function withinWindow(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS)
}

// True when this claimer (or the process as a whole) has exhausted its failed
// attempts. Callers must refuse WITHOUT querying the DB when this returns true.
export function isClaimBlocked(claimerKey: string): boolean {
  const now = Date.now()
  globalFailures = withinWindow(globalFailures, now)
  if (globalFailures.length >= MAX_FAILED_GLOBAL) return true

  const recent = withinWindow(failuresByClaimer.get(claimerKey) ?? [], now)
  if (recent.length === 0) failuresByClaimer.delete(claimerKey)
  else failuresByClaimer.set(claimerKey, recent)
  return recent.length >= MAX_FAILED_PER_CLAIMER
}

export function recordFailedClaim(claimerKey: string): void {
  const now = Date.now()
  globalFailures = withinWindow(globalFailures, now)
  globalFailures.push(now)
  const recent = withinWindow(failuresByClaimer.get(claimerKey) ?? [], now)
  recent.push(now)
  failuresByClaimer.set(claimerKey, recent)
}

// Test hook — clears all limiter state.
export function _resetLinkCodeLimiterForTest(): void {
  failuresByClaimer.clear()
  globalFailures = []
}

// Periodic sweep so claimers who failed once and never returned don't
// accumulate in the map. unref() keeps the timer from holding the process
// (or a vitest worker) open.
const sweep = setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of failuresByClaimer) {
    if (withinWindow(timestamps, now).length === 0) failuresByClaimer.delete(key)
  }
}, WINDOW_MS)
sweep.unref?.()
