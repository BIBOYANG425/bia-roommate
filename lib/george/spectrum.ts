// lib/george/spectrum.ts
// Spectrum shared-pool user registration for the george signup funnel.
// On the free plan there is NO single dedicated number: each student is
// registered as a "shared" Spectrum user and the API assigns them a pool
// number (assignedPhoneNumber) that THEY specifically must text.
// API: POST https://spectrum.photon.codes/projects/{id}/users/
//      Basic base64(projectId:projectSecret)  (Spectrum OpenAPI, 2026-06)
// Registration is idempotent here: an already-registered phone falls back to
// a user lookup and returns the existing assignment.

import { canonicalizePhone } from "@biboyang425/bia-shared/phone";

const SPECTRUM_BASE = "https://spectrum.photon.codes";

export type SignupOutcome =
  | { ok: true; assignedPhoneNumber: string; alreadyRegistered: boolean }
  | { ok: false; error: "invalid_phone" | "pool_unavailable" | "spectrum_error" };

/**
 * Normalize phone input to canonical E.164. Delegates to the SINGLE shared
 * canonicalizer (`@biboyang425/bia-shared/phone`, parity-vectored against
 * george's normalizeHandle) so the registered phone is byte-identical to the
 * iMessage handle the agent stores — the two paths can no longer drift (the
 * drift was the +86→+853 identity fork). A bare North-American number defaults
 * to US; an explicit country code (typed "+", a full foreign number) is
 * trusted. Returns null when the input can't be canonicalized.
 */
export function normalizePhone(raw: string): string | null {
  const result = canonicalizePhone(raw, { defaultCountry: "US" });
  return result.ok ? result.e164 : null;
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
