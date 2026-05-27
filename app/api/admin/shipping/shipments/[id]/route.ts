// /api/admin/shipping/shipments/[id]
// GET   — shipment + attached parcels
// PATCH — update status, carrier, tracking, dates, pickup fields, notes

import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/api/authed-handler";
import { adminShipmentPatchSchema } from "@/lib/schemas/admin-shipping";
import { SHIPMENT_STATUS_VALUES } from "@/lib/types";

const SHIPMENT_STATUS_SET = new Set<string>(SHIPMENT_STATUS_VALUES);

type Params = { id: string };

export const GET = adminHandler<undefined, Params>({
  handler: async ({ adminSupabase, params }) => {
    const { id } = params;

    const [{ data: shipment, error }, { data: parcels }] = await Promise.all([
      adminSupabase.from("shipments").select("*").eq("id", id).maybeSingle(),
      adminSupabase
        .from("parcels")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!shipment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ shipment, parcels: parcels ?? [] });
  },
});

export const PATCH = adminHandler<typeof adminShipmentPatchSchema, Params>({
  schema: adminShipmentPatchSchema,
  handler: async ({ adminSupabase, body, params }) => {
    const { id } = params;

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        patch[key] = value === "" ? null : value;
      }
    }

    if (
      typeof patch.status === "string" &&
      !SHIPMENT_STATUS_SET.has(patch.status)
    ) {
      return NextResponse.json({ error: "非法 status" }, { status: 400 });
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "没有可更新的字段" },
        { status: 400 },
      );
    }

    const { data, error } = await adminSupabase
      .from("shipments")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  },
});
