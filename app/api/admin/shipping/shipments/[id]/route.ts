// /api/admin/shipping/shipments/[id]
// GET   — shipment + attached parcels
// PATCH — update status, carrier, tracking, dates, pickup fields, notes

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { SHIPMENT_STATUS_VALUES } from "@/lib/types";

const SHIPMENT_STATUS_SET = new Set<string>(SHIPMENT_STATUS_VALUES);

const ALLOWED_KEYS = [
  "name",
  "status",
  "carrier",
  "international_tracking",
  "departed_cn_at",
  "arrived_us_at",
  "pickup_location",
  "pickup_starts_at",
  "pickup_ends_at",
  "price_per_kg_cents",
  "notes",
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  const [{ data: shipment, error }, { data: parcels }] = await Promise.all([
    supabase.from("shipments").select("*").eq("id", id).maybeSingle(),
    supabase
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
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      const v = body[key];
      patch[key] = v === "" ? null : v;
    }
  }

  if (
    typeof patch.status === "string" &&
    !SHIPMENT_STATUS_SET.has(patch.status)
  ) {
    return NextResponse.json({ error: "非法 status" }, { status: 400 });
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("shipments")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
