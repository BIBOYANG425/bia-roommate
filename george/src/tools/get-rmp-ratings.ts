// Batch-looks-up RMP (RateMyProfessors) ratings for USC instructors. Proxies to
// bia-roommate's /api/rmp/batch endpoint which handles the RMP GraphQL + in-memory
// caching. Returns {name → {avgRating, avgDifficulty, numRatings, wouldTakeAgainPercent}}.
//
// Header last reviewed: 2026-04-20

import { registerTool } from '../agent/tool-registry.js'
import { config } from '../config.js'

registerTool(
  'get_rmp_ratings',
  'Look up RateMyProfessors ratings for USC instructors in batch. Returns per-name rating (avg, difficulty, count, would-take-again%) or null for professors with no RMP record. Always call this before quoting an rmp score to the student.',
  {
    properties: {
      names: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of instructor full names (first + last). Max 50.',
      },
    },
    required: ['names'],
  },
  async (input) => {
    const names = Array.isArray(input.names) ? (input.names as string[]).filter((n) => n && n.trim()) : []
    if (names.length === 0) return 'Error: names must be a non-empty array of instructor names.'
    if (names.length > 50) return 'Error: at most 50 names per call.'

    const res = await fetch(`${config.biaRoommate.baseUrl}/api/rmp/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return `RMP batch lookup failed (${res.status})`
    const data = await res.json()
    return JSON.stringify(data)
  },
)
