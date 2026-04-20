// Parcel status flow helpers for the admin UI. Steps are the happy path;
// branches (lost/returned/disputed) render off-path on the stepper.

import type { ParcelStatus } from "@/lib/types";

/** Ordered happy-path statuses, used by StatusProgress. */
export const PARCEL_STEPS: ParcelStatus[] = [
  "expected",
  "received_cn",
  "in_transit",
  "arrived_us",
  "picked_up",
];

/** Branch statuses — end states that are not part of the main stepper. */
export const PARCEL_BRANCH_STATUSES: ParcelStatus[] = [
  "lost",
  "returned",
  "disputed",
];

/** Status the admin would typically bump to next on the happy path. */
export function nextParcelStatus(current: ParcelStatus): ParcelStatus | null {
  const idx = PARCEL_STEPS.indexOf(current);
  if (idx < 0 || idx >= PARCEL_STEPS.length - 1) return null;
  return PARCEL_STEPS[idx + 1];
}
