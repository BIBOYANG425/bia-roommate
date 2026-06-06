import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

// POST/DELETE /api/events/[id]/rsvp — toggle the signed-in user's RSVP.
// Delegates to SECURITY DEFINER RPCs (rsvp_event / unrsvp_event) which bridge
// the web user → students row and write event_attendance(source='rsvp').
// Uses the user's anon JWT client (so auth.uid() resolves inside the RPC) —
// NO service-role (bia-roommate security boundary). Idempotent.

type Params = { id: string };

export const POST = authedHandler<undefined, Params>({
  handler: async ({ supabase, params }) => {
    const { error } = await supabase.rpc("rsvp_event", { p_event_id: params.id });
    if (error) {
      return NextResponse.json(
        { error: "rsvp_failed", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, rsvped: true });
  },
});

export const DELETE = authedHandler<undefined, Params>({
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
