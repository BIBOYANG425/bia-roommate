// /api/admin/shipping/parcels/[id]
// GET   — full parcel + events + shipment
// PATCH — update status / weight / dims / notes / received_at / shipment_id
//         via admin_patch_parcel RPC (sets actor GUCs so event log tags admin)

import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/api/authed-handler";
import { adminParcelPatchSchema } from "@/lib/schemas/admin-shipping";
import { PARCEL_STATUS_VALUES } from "@/lib/types";

const STATUS_SET = new Set<string>(PARCEL_STATUS_VALUES);

type Params = { id: string };

export const GET = adminHandler<undefined, Params>({
  handler: async ({ adminSupabase, params }) => {
    const { id } = params;

    const { data: parcel, error } = await adminSupabase
      .from("parcels")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!parcel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [{ data: events }, { data: shipment }] = await Promise.all([
      adminSupabase
        .from("parcel_events")
        .select("*")
        .eq("parcel_id", id)
        .order("created_at", { ascending: false }),
      parcel.shipment_id
        ? adminSupabase
            .from("shipments")
            .select("*")
            .eq("id", parcel.shipment_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({
      parcel,
      events: events ?? [],
      shipment: shipment ?? null,
    });
  },
});

export const PATCH = adminHandler<typeof adminParcelPatchSchema, Params>({
  schema: adminParcelPatchSchema,
  handler: async ({ user, adminSupabase, body, params }) => {
    const { id } = params;

    // Build patch from defined keys only.
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "没有可更新的字段" },
        { status: 400 },
      );
    }

    if (typeof patch.status === "string" && !STATUS_SET.has(patch.status)) {
      return NextResponse.json({ error: "非法 status" }, { status: 400 });
    }

    const { data, error } = await adminSupabase.rpc("admin_patch_parcel", {
      p_id: id,
      p_actor_user_id: user.id,
      p_patch: patch,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  },
});
