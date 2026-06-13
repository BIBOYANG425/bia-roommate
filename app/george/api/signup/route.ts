// POST /george/api/signup — the george onboarding funnel backend.
// Body: { phone: string }. Mints (or reuses) a pending_users code pre-linked to
// the student's handle, then returns george's ONE shared iMessage number
// (GEORGE_IMESSAGE_PHONE) plus the code so the frontend can open iMessage with a
// prefilled "...george (code)" message.
//
// On the free/shared Spectrum plan the connection has a single routable identity,
// so every student texts the SAME number; the code (primary) and sender handle
// (backup, self-healed on handshake) bind identity in george's handshake. There
// is no per-user assigned number — that does not route on the shared plan.
// Unauthenticated by design (it's the front door) — IP rate-limited.
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeUsPhone } from "@/lib/george/spectrum";
import { mintPendingCode, findPendingByHandle } from "@/lib/george/mint-code";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`george-signup:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const phone = normalizeUsPhone(typeof body?.phone === "string" ? body.phone : "");
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const georgeNumber = process.env.GEORGE_IMESSAGE_PHONE;
  if (!georgeNumber) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  // Pre-link a pending row to this handle (reuse an existing one so repeat
  // signups don't mint duplicate codes; completed users skip straight to texting).
  const admin = createAdminSupabaseClient();
  let code: string | null = null;
  let alreadyOnboarded = false;
  const existing = await findPendingByHandle(admin, phone);
  if (existing?.status === "completed") {
    alreadyOnboarded = true;
    code = existing.code;
  } else if (existing) {
    code = existing.code;
  } else {
    code = await mintPendingCode(admin, { imessageHandle: phone });
  }

  return NextResponse.json({ georgeNumber, code, alreadyOnboarded });
}
