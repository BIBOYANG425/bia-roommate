// Seat-bearing course/section data refreshes from USC at most this often. The
// course planner shows seat counts, so this caps how stale they can be.
//
// Header last reviewed: 2026-06-17

export const SEAT_REVALIDATE_SECONDS = 600; // 10 minutes
