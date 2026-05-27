// /api/admin/shipping/shipments/[id]/attach
// POST — body { parcel_ids: string[] }; sets shipment_id and auto-bumps
// received_cn -> in_transit. Goes through admin_attach_parcels_to_shipment
// RPC so the event log stamps actor_role='admin'.

import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/api/authed-handler";
import { adminShipmentAttachSchema } from "@/lib/schemas/admin-shipping";

type Params = { id: string };

export const POST = adminHandler<
  typeof adminShipmentAttachSchema,
  Params
>({
  schema: adminShipmentAttachSchema,
  handler: async ({ user, adminSupabase, body, params }) => {
    const { id } = params;
    const parcelIds = body.parcel_ids;

    // Verify the shipment exists before running the bulk update
    const { data: shipment } = await adminSupabase
      .from("shipments")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 },
      );
    }

    const { data, error } = await adminSupabase.rpc(
      "admin_attach_parcels_to_shipment",
      {
        p_parcel_ids: parcelIds,
        p_shipment_id: id,
        p_actor_user_id: user.id,
      },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ updated: data ?? 0 });
  },
});
