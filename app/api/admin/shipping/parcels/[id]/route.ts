// /api/admin/shipping/parcels/[id]
// GET   — full parcel + events + shipment
// PATCH — update status / weight / dims / notes / received_at / shipment_id
//         via admin_patch_parcel RPC (sets actor GUCs so event log tags admin)

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PARCEL_STATUS_VALUES } from "@/lib/types";

const STATUS_SET = new Set<string>(PARCEL_STATUS_VALUES);

const ALLOWED_PATCH_KEYS = [
  "status",
  "weight_grams",
  "dim_cm_l",
  "dim_cm_w",
  "dim_cm_h",
  "notes",
  "received_at",
  "shipment_id",
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: parcel, error } = await supabase
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
    supabase
      .from("parcel_events")
      .select("*")
      .eq("parcel_id", id)
      .order("created_at", { ascending: false }),
    parcel.shipment_id
      ? supabase
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
}

export async function PATCH(
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

  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED_PATCH_KEYS) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  if (typeof patch.status === "string" && !STATUS_SET.has(patch.status)) {
    return NextResponse.json({ error: "非法 status" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("admin_patch_parcel", {
    p_id: id,
    p_actor_user_id: gate.ctx.user.id,
    p_patch: patch,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
