/**
 * Trust-boundary validator for the chip-state IntakeConstraints object
 * coming off the SSE route's request body.
 *
 * Lives in its own module (not inside route.ts) because Next.js 16
 * strictly typechecks route files and refuses any export beyond the
 * runtime contract (GET / POST / OPTIONS / etc.). Both the route and
 * the unit tests import from here.
 */

import {
  emptyIntakeConstraints,
  type IntakeConstraints,
} from "@/lib/course-planner/agent/types";

const VALID_YEARS: Array<IntakeConstraints["year"]> = [
  "freshman",
  "soph",
  "junior",
  "senior",
  "grad",
];

const VALID_GE = new Set([
  "GE-A",
  "GE-B",
  "GE-C",
  "GE-D",
  "GE-E",
  "GE-F",
  "GE-G",
  "GE-H",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw JSON body
export function parseIntake(raw: any): IntakeConstraints {
  const out = emptyIntakeConstraints();
  if (!raw || typeof raw !== "object") return out;

  if (
    typeof raw.year === "string" &&
    (VALID_YEARS as string[]).includes(raw.year)
  ) {
    out.year = raw.year as IntakeConstraints["year"];
  }
  if (Array.isArray(raw.geNeeded)) {
    // Cap BEFORE filtering so a malicious client can't OOM us with a giant
    // array. The whitelist filter then drops anything that isn't a known GE.
    out.geNeeded = raw.geNeeded
      .slice(0, 8)
      .filter((g: unknown): g is string => typeof g === "string" && VALID_GE.has(g));
  }
  if (
    typeof raw.profRatingFloor === "number" &&
    Number.isFinite(raw.profRatingFloor) &&
    raw.profRatingFloor >= 0
  ) {
    out.profRatingFloor = Math.min(5, raw.profRatingFloor);
  }
  return out;
}
