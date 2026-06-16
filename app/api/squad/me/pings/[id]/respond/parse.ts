// app/api/squad/me/pings/[id]/respond/parse.ts
// Helper kept OUT of route.ts (Next 16 forbids non-handler exports from route files).
export function respondStatusForError(message: string): number {
  if (message.includes("already_responded")) return 409;
  if (message.includes("not_your_ping")) return 403;
  if (message.includes("ping_not_found")) return 404;
  return 400;
}
