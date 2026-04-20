// /api/shipping/pack-requests/[id]
// DELETE — user cancels their own pending pack request. Cascades to join rows.

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only allow cancel while still pending — once admin has touched it
  // (contacted/approved/...), force the user to reach out manually.
  const { data: req, error: fetchErr } = await supabase
    .from("pack_requests")
    .select("status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!req || req.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (req.status !== "pending") {
    return NextResponse.json(
      { error: "申请已被处理，不能自行取消。请联系 BIA 运营。" },
      { status: 409 },
    );
  }

  // Soft-cancel — flip status to 'cancelled' rather than DELETE so we keep
  // the audit trail. Join rows stay; they're harmless after cancellation.
  const { error } = await supabase
    .from("pack_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ cancelled: true });
}
