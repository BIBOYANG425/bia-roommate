// Central "coming soon" feature switches.
//
// We pause unfinished features behind an honest 敬请期待 placeholder instead of
// shipping them half-built or deleting their code. Flip a flag to false to
// re-open a feature — the route, page, and all logic stay intact underneath.
//
// Paused 2026-06-17: George (chat backend not deployed), Hackathon (past event,
// next edition TBD). Focus is on 找室友 / 选课 / 集运.
//
// Re-opened 2026-06-26 for orientation showcase: USC 新生群 (the 2030 group post
// with a live join QR) — students need to reach the group from the home page.

export const COMING_SOON = {
  george: true,
  hackathon: true,
  uscGroup: false,
} as const;

export type FeatureKey = keyof typeof COMING_SOON;

export function isComingSoon(key: FeatureKey): boolean {
  return COMING_SOON[key];
}
