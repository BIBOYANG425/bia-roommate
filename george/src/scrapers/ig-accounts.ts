// Hard-coded USC student org Instagram handles that the weekly scraper pulls.
// Adding/removing a handle is intentionally a code change — see the design
// spec's "Non goals" section for why.
//
// Currently a thin slice: only Troy Labs + SEP. The frats group is intentionally
// empty pending Bob's WeChat reply on the wedge question (see CEO review
// amendment in docs/plans/2026-04-22-instagram-scraper.md, 2026-04-25). A
// small follow-up commit fills in the revised cultural-org or frat handles
// once Bob confirms.
//
// Header last reviewed: 2026-05-03

export const IG_ACCOUNTS = {
  // PENDING Bob's wedge confirmation. Either reverts to the 20-frat IFC list
  // or gets replaced with cultural-org / pre-pro accounts (CSSA, KSA, etc.).
  frats: [] as string[],
  // Troy Labs — USC's student-run venture studio.
  troyLabs: ['troylabsusc'],
  // SEP — Spark SC / Student Entrepreneur Program.
  sep: ['sparksc'],
} as const

export function flattenHandles(): string[] {
  return [
    ...IG_ACCOUNTS.frats,
    ...IG_ACCOUNTS.troyLabs,
    ...IG_ACCOUNTS.sep,
  ]
}
