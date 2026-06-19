// lib/george/spectrum.ts
// Spectrum shared-pool user registration for the george signup funnel.
// On the free plan there is NO single dedicated number: each student is
// registered as a "shared" Spectrum user and the API assigns them a pool
// number (assignedPhoneNumber) that THEY specifically must text.
// API: POST https://spectrum.photon.codes/projects/{id}/users/
//      Basic base64(projectId:projectSecret)  (Spectrum OpenAPI, 2026-06)
// Registration is idempotent here: an already-registered phone falls back to
// a user lookup and returns the existing assignment.

const SPECTRUM_BASE = "https://spectrum.photon.codes";

export type SignupOutcome =
  | { ok: true; assignedPhoneNumber: string; alreadyRegistered: boolean }
  | { ok: false; error: "invalid_phone" | "pool_unavailable" | "spectrum_error" };

/**
 * Normalize phone input to E.164 (+<country><number>). Any explicit country
 * code (a leading "+" or the "00" international prefix) is preserved, so +86
 * (China), +44, +33, etc. all work. A bare North-American number (10 digits, or
 * 11 starting with 1) defaults to +1. Returns null if it is not a plausible
 * E.164 (8-15 digits after the "+"). Must agree with george's normalizeHandle()
 * so the registered phone matches the iMessage handle the agent sees.
 */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (!d.startsWith("+") && d.startsWith("00")) d = `+${d.slice(2)}`;
  if (!d.startsWith("+")) {
    if (d.length === 10) d = `+1${d}`;
    else if (d.length === 11 && d.startsWith("1")) d = `+${d}`;
    else return null; // bare number with no country code we can infer
  }
  const digits = d.slice(1);
  if (digits.length < 8 || digits.length > 15) return null; // E.164 bounds
  return `+${digits}`;
}

function authHeader(projectId: string, projectSecret: string): string {
  return `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString("base64")}`;
}

interface SpectrumUser {
  phoneNumber: string;
  assignedPhoneNumber: string;
}

async function findExisting(
  projectId: string,
  auth: string,
  phone: string,
): Promise<SpectrumUser | null> {
  const res = await fetch(
    `${SPECTRUM_BASE}/projects/${projectId}/users/?search=${encodeURIComponent(phone)}`,
    { headers: { authorization: auth }, signal: AbortSignal.timeout(10_000) },
  ).catch(() => null);
  if (!res || !res.ok) return null;
  const data = await res.json().catch(() => null);
  const users = (data?.data?.users ?? []) as SpectrumUser[];
  return users.find((u) => u.phoneNumber === phone) ?? null;
}

export async function registerSharedUser(
  phoneE164: string,
  creds: { projectId: string; projectSecret: string },
): Promise<SignupOutcome> {
  const auth = authHeader(creds.projectId, creds.projectSecret);

  const res = await fetch(`${SPECTRUM_BASE}/projects/${creds.projectId}/users/`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: auth },
    body: JSON.stringify({ type: "shared", phoneNumber: phoneE164 }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (res) {
    const data = await res.json().catch(() => null);
    const assigned = data?.data?.assignedPhoneNumber as string | undefined;
    if (res.ok && data?.succeed && assigned) {
      return { ok: true, assignedPhoneNumber: assigned, alreadyRegistered: false };
    }
  }

  // Create failed — most commonly because this phone is already registered.
  // Look the user up and reuse their existing assignment before giving up.
  const existing = await findExisting(creds.projectId, auth, phoneE164);
  if (existing?.assignedPhoneNumber) {
    return { ok: true, assignedPhoneNumber: existing.assignedPhoneNumber, alreadyRegistered: true };
  }

  // Distinguish "pool exhausted" from generic failure when possible.
  const avail = await fetch(
    `${SPECTRUM_BASE}/projects/${creds.projectId}/imessage/shared/availability?phoneNumber=${encodeURIComponent(phoneE164)}`,
    { headers: { authorization: auth }, signal: AbortSignal.timeout(10_000) },
  ).catch(() => null);
  if (avail?.ok) {
    const a = await avail.json().catch(() => null);
    if (a?.succeed && a?.data?.available === false) return { ok: false, error: "pool_unavailable" };
  }
  return { ok: false, error: "spectrum_error" };
}
