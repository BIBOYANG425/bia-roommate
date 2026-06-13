// lib/george/spectrum.ts
// Phone-number normalization for the george signup funnel.
//
// NOTE: this used to also register each student as a per-user "shared" Spectrum
// user (POST /projects/{id}/users/) and hand back a pool-assigned number. That
// model does not work on the free/shared plan: the Spectrum connection has a
// single routable identity (issueImessageTokens → {type:"shared"}), so only ONE
// number (GEORGE_IMESSAGE_PHONE) ever delivers inbound to george. Per-user
// assigned numbers were accepted by Apple (blue bubble) but never routed to our
// connection. The funnel now sends every student to the one shared number and
// binds identity via the handshake code + sender handle. See george's
// src/onboarding/handshake.ts and CLAUDE.md "Onboarding handshake (Slice B)".

/** Normalize US phone input to E.164 (+1XXXXXXXXXX). Returns null if not a US number. */
export function normalizeUsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
