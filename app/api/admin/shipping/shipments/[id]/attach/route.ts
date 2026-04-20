// /api/admin/shipping/shipments/[id]/attach
// POST — body { parcel_ids: string[] }; sets shipment_id and auto-bumps
// received_cn -> in_transit. Goes through admin_attach_parcels_to_shipment
// RPC so the event log stamps actor_role='admin'.

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

  const parcelIds = Array.isArray(body.parcel_ids)
    ? body.parcel_ids.filter((x): x is string => typeof x === "string")
    : [];
  if (parcelIds.length === 0) {
    return NextResponse.json(
      { error: "parcel_ids 不能为空" },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();

  // Verify the shipment exists before running the bulk update
  const { data: shipment } = await supabase
    .from("shipments")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  const { data, error } = await supabase.rpc(
    "admin_attach_parcels_to_shipment",
    {
      p_parcel_ids: parcelIds,
      p_shipment_id: id,
      p_actor_user_id: gate.ctx.user.id,
    },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: data ?? 0 });
}
