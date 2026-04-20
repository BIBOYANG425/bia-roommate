// /api/admin/shipping/pack-requests/[id]/attach
// POST — body { shipment_id }. Takes every parcel in this pack request and
// attaches them to the specified shipment via the existing
// admin_attach_parcels_to_shipment RPC (which auto-bumps received_cn ->
// in_transit and stamps parcel_events with actor_role='admin'). Also sets
// pack_requests.shipment_id + flips status to 'approved'.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const shipmentId =
    typeof body.shipment_id === "string" ? body.shipment_id.trim() : "";
  if (!shipmentId) {
    return NextResponse.json(
      { error: "shipment_id 不能为空" },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();

  // Validate the shipment exists
  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, status")
    .eq("id", shipmentId)
    .maybeSingle();
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  // Validate pack request exists + collect parcel IDs
  const { data: req } = await supabase
    .from("pack_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!req) {
    return NextResponse.json(
      { error: "Pack request not found" },
      { status: 404 },
    );
  }

  const { data: links } = await supabase
    .from("pack_request_parcels")
    .select("parcel_id")
    .eq("request_id", id);
  const parcelIds = (links ?? []).map((l) => l.parcel_id);
  if (parcelIds.length === 0) {
    return NextResponse.json(
      { error: "这个申请里没有包裹" },
      { status: 400 },
    );
  }

  // Run the RPC — sets parcels.shipment_id + flips received_cn->in_transit
  // + stamps parcel_events via the existing status-change trigger.
  const { data: attached, error: rpcErr } = await supabase.rpc(
    "admin_attach_parcels_to_shipment",
    {
      p_parcel_ids: parcelIds,
      p_shipment_id: shipmentId,
      p_actor_user_id: gate.ctx.user.id,
    },
  );
  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  // Mark the pack request as approved + remember which shipment it went to
  const { data: updated, error: updErr } = await supabase
    .from("pack_requests")
    .update({ shipment_id: shipmentId, status: "approved" })
    .eq("id", id)
    .select()
    .single();
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    attached: attached ?? 0,
    request: updated,
  });
}
