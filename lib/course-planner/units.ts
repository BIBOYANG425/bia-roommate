/**
 * Numeric units comparison for course filtering.
 *
 * The USC catalog sometimes returns "4.0" while the UI chips send "4"; raw
 * string equality (`c.units === wanted`) silently drops those valid matches.
 * `unitsMatch` normalizes both sides via parseFloat and only falls back to
 * string equality when a side isn't numeric (e.g. "1-4" variable-unit courses).
 *
 * Single source of truth for the units comparison used by the agent
 * orchestrators, the in-agent catalog filter, and the free-mode recommender.
 */
export function unitsMatch(
  courseUnits: string | null | undefined,
  wanted: string,
): boolean {
  if (courseUnits == null || courseUnits === "") return false;
  const u = parseFloat(courseUnits);
  const w = parseFloat(wanted);
  if (Number.isFinite(u) && Number.isFinite(w)) return u === w;
  return courseUnits === wanted;
}
