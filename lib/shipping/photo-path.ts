// Ownership validation for parcel-photo storage paths.
//
// Photos are uploaded client-side to the private `parcel-photos` bucket under
// the convention `${user.id}/<file>` (app/shipping/declare/page.tsx). The
// student parcel APIs must NOT persist client-supplied paths verbatim: the
// folder layout is guessable, so a tampering client could submit another
// user's `${otherId}/...` path, which the officer console later signs with the
// service-role client (RLS-bypassing) — leaking or injecting another student's
// photo into the officer view. Enforce caller ownership + no path traversal
// before any path is stored.

export function isOwnedPhotoPath(path: unknown, userId: string): path is string {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.startsWith(`${userId}/`) &&
    !path.includes("..")
  );
}

// Keep only paths the caller owns, capped at `max`. Invalid paths are dropped
// silently — a legitimate client never produces them, and dropping is safer
// than trusting a tampered path.
export function filterOwnedPhotos(
  photos: readonly unknown[] | undefined | null,
  userId: string,
  max = 6,
): string[] {
  return (photos ?? [])
    .filter((p): p is string => isOwnedPhotoPath(p, userId))
    .slice(0, max);
}
