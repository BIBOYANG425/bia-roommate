import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  category: z.enum(["bug", "feature", "general"]),
  message: z.string().trim().min(10).max(2000),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  path: z.string().max(500).optional(),
});

// Window/limit knobs. Picked to be tolerant of legitimate users (a student
// writing a long bug report and resubmitting after a network blip) while
// still cutting off scripted spam.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5;
const DEDUPE_WINDOW_MS = 15 * 60_000; // 15 minutes

// Static salt for IP hashing. Goal is to anonymize IPs at rest in the
// feedback table — not to protect against an attacker who already has
// source access. A pepper from env would be stronger; for a student-org
// site this is sufficient.
const IP_HASH_SALT = "bia-feedback-v1";

function getClientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    null
  );
}

function hashIp(ip: string): string {
  return createHash("sha256").update(IP_HASH_SALT).update(ip).digest("hex");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = getClientIp(request);
  const ipHash = ip ? hashIp(ip) : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  // Rate limit: prefer user_id when signed in (stable across IP changes),
  // fall back to ip_hash for anonymous submissions. If neither is available
  // (rare — request with no IP header and no auth), fail open rather than
  // block legitimate edge cases.
  const rateKey = user
    ? { col: "user_id" as const, val: user.id }
    : ipHash
      ? { col: "ip_hash" as const, val: ipHash }
      : null;

  if (rateKey) {
    const rateSince = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error: rateErr } = await supabase
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq(rateKey.col, rateKey.val)
      .gte("created_at", rateSince);

    if (rateErr) {
      console.error("[feedback] rate-limit query error:", rateErr);
      // Don't block on a query failure — log and continue.
    } else if (count !== null && count >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many submissions. Please slow down." },
        { status: 429 },
      );
    }

    // Dedupe: same message from same key inside the dedupe window. Drops
    // accidental double-clicks and naive copy-paste spam without storing
    // a separate hash column.
    const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: dup, error: dupErr } = await supabase
      .from("feedback")
      .select("id")
      .eq(rateKey.col, rateKey.val)
      .eq("message", parsed.data.message)
      .gte("created_at", dedupeSince)
      .limit(1)
      .maybeSingle();

    if (dupErr) {
      console.error("[feedback] dedupe query error:", dupErr);
    } else if (dup) {
      // Treat as a successful idempotent submit — no need to alarm the user.
      return NextResponse.json({ ok: true, deduped: true });
    }
  }

  const { error } = await supabase.from("feedback").insert({
    category: parsed.data.category,
    message: parsed.data.message,
    email: parsed.data.email ?? null,
    path: parsed.data.path ?? null,
    user_agent: userAgent,
    user_id: user?.id ?? null,
    ip_hash: ipHash,
  });

  if (error) {
    console.error("[feedback] insert error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
