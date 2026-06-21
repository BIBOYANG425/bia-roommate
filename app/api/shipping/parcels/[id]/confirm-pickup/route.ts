// /api/shipping/parcels/[id]/confirm-pickup
// POST — student self-confirms pickup (arrived_us -> picked_up).
//
// Calls the SECURITY DEFINER RPC student_confirm_pickup with the user's RLS
// client, so auth.uid() resolves to the caller and the RPC re-checks ownership
// (user_id = auth.uid()). The transition fires log_parcel_status_change (a
// parcel_events row) and enqueue_parcel_notification ('picked_up_thanks').

import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

type Params = { id: string };

export const POST = authedHandler<undefined, Params>({
  rateLimit: {
    key: "parcel:confirm-pickup",
    limit: 10,
    windowMs: 60 * 60 * 1000,
    message: "操作过于频繁，请稍后再试。",
  },
  handler: async ({ supabase, params }) => {
    const { id } = params;

    const { data, error } = await supabase.rpc("student_confirm_pickup", {
      p_parcel_id: id,
    });

    if (error) {
      const msg = error.message ?? "";
      // Map the RPC's RAISE EXCEPTION messages to HTTP statuses.
      if (msg.includes("not_found_or_not_owner")) {
        return NextResponse.json({ error: "包裹不存在或无权操作" }, { status: 404 });
      }
      if (msg.includes("not_pickup_eligible")) {
        return NextResponse.json(
          { error: "当前状态不能确认取件（需「到达美国」）" },
          { status: 409 },
        );
      }
      if (msg.includes("not_authenticated")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ parcel: data });
  },
});
