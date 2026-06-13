// POST /george/api/signup — the Spectrum signup funnel backend.
// Body: { phone: string }. Registers the student's phone as a shared Spectrum
// user (the pool ASSIGNS them a number to text), pre-links a pending_users row
// to their handle, and returns the assigned number + code so the frontend can
// open iMessage with a prefilled message.
// Unauthenticated by design (it's the front door) — IP rate-limited.
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeUsPhone, registerSharedUser } from "@/lib/george/spectrum";
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

  const projectId = process.env.SPECTRUM_PROJECT_ID;
  const projectSecret = process.env.SPECTRUM_PROJECT_SECRET;
  if (!projectId || !projectSecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const outcome = await registerSharedUser(phone, { projectId, projectSecret });
  if (!outcome.ok) {
    const status = outcome.error === "pool_unavailable" ? 503 : 502;
    return NextResponse.json({ error: outcome.error }, { status });
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

  return NextResponse.json({
    assignedPhoneNumber: outcome.assignedPhoneNumber,
    code,
    alreadyRegistered: outcome.alreadyRegistered,
    alreadyOnboarded,
  });
}
