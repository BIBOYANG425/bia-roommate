import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

// POST/DELETE /api/events/[id]/rsvp — toggle the signed-in user's RSVP.
// Delegates to SECURITY DEFINER RPCs (rsvp_event / unrsvp_event) which bridge
// the web user → students row and set/clear event_attendance.rsvped_at
// (RSVP semantics = rsvped_at IS NOT NULL; the legacy source column is not
// read). rsvp_event enforces event status + capacity — those business errors
// are surfaced as 409 (event_not_open / event_full), not 500.
// Uses the user's anon JWT client (so auth.uid() resolves inside the RPC) —
// NO service-role (bia-roommate security boundary). Idempotent. Rate-limited
// like the sibling write routes (likes/comments) — POST and DELETE share one
// "events-rsvp" budget since together they form a single toggle.

type Params = { id: string };

// Business rejections raised by the rsvp_event RPC (RAISE EXCEPTION '<code>').
const RSVP_BUSINESS_ERRORS = ["event_full", "event_not_open"] as const;

export const POST = authedHandler<undefined, Params>({
  rateLimit: { key: "events-rsvp", limit: 30, windowMs: 60_000 },
  handler: async ({ supabase, params }) => {
    const { error } = await supabase.rpc("rsvp_event", { p_event_id: params.id });
    if (error) {
      const business = RSVP_BUSINESS_ERRORS.find((code) =>
        error.message.includes(code),
      );
      if (business) {
        return NextResponse.json({ error: business }, { status: 409 });
      }
      return NextResponse.json(
        { error: "rsvp_failed", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, rsvped: true });
  },
});

export const DELETE = authedHandler<undefined, Params>({
  rateLimit: { key: "events-rsvp", limit: 30, windowMs: 60_000 },
  handler: async ({ supabase, params }) => {
    const { error } = await supabase.rpc("unrsvp_event", { p_event_id: params.id });
    if (error) {
      return NextResponse.json(
        { error: "unrsvp_failed", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, rsvped: false });
  },
});
