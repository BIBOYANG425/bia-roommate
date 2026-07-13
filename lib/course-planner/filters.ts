/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared course-planner query helpers. One implementation each of the level
// filter, the units filter, and the GE course fetch — imported by the recommend
// + agent-stream routes, the LLM agent orchestrator, and the free-mode
// recommender. Replaces the previously duplicated level-literal blocks and GE
// fetch copies that had drifted across those files.

import { unitsMatch } from "./units";

/** Filter courses by catalog level band. `lower` = 100–299, `upper` = 300–499,
 *  `graduate` = 500+. Undefined level (or an unrecognized value) keeps every
 *  course; non-numeric course numbers are always kept. */
export function filterByLevel<T extends { number: string }>(
  courses: T[],
  level: string | undefined,
): T[] {
  if (!level) return courses;
  return courses.filter((c) => {
    const num = parseInt(c.number, 10);
    if (isNaN(num)) return true;
    if (level === "lower") return num >= 100 && num <= 299;
    if (level === "upper") return num >= 300 && num <= 499;
    if (level === "graduate") return num >= 500;
    return true;
  });
}

/** Filter courses by units using the shared numeric `unitsMatch` (handles
 *  "4.0" vs "4"). Undefined/empty `units` keeps every course. */
export function filterByUnits<T extends { units: string | null | undefined }>(
  courses: T[],
  units: string | undefined,
): T[] {
  if (!units) return courses;
  return courses.filter((c) => unitsMatch(c.units, units));
}

/** Fetch the raw `courses` array for one GE category from the USC catalog API.
 *  Returns `data.courses || []` and swallows non-OK responses / timeouts as an
 *  empty array so callers can Promise.all across categories without guarding.
 *  Callers own their own per-course transform (they diverge intentionally). */
export async function fetchGeCourses(
  semester: string,
  requirementPrefix: string,
  categoryPrefix: string,
  timeoutMs: number,
): Promise<any[]> {
  try {
    const res = await fetch(
      `https://classes.usc.edu/api/Courses/GeCoursesByTerm?termCode=${semester}&geRequirementPrefix=${requirementPrefix}&categoryPrefix=${categoryPrefix}`,
      { signal: AbortSignal.timeout(timeoutMs) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.courses || [];
  } catch {
    return [];
  }
}
