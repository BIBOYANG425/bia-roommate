// lib/squad/george-link.ts
// The 加入 handoff: web records interest, then points the user to finish the join
// with george over iMessage. Prefilled sms deep-link (iOS '?&body='); null when the
// pool number isn't configured so the UI can fall back to a plain instruction.
export function buildGeorgeImessageLink(postLabel: string): string | null {
  const phone = process.env.NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE;
  if (!phone) return null;
  return `sms:${phone}?&body=${encodeURIComponent(`我想加入 ${postLabel}`)}`;
}
