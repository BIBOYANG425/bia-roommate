// /api/shipping/admin/routes
// GET  — list all routes (including inactive), admin-gated
// PATCH — update route by id (price, dates, notes), admin-gated
//
// Note: `method` is intentionally not patchable. To retire a route, set
// `active=false`; to add a new method, add the enum value in a migration
// and insert a new row via SQL. This prevents accidental semantic flips
// (e.g. changing a sea row to air and silently mislabelling historic
// parcels whose shipping_method still points at the old meaning).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("shipping_routes")
    .select("*")
    .order("method");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.price_per_kg_cny !== undefined) {
    const v = body.price_per_kg_cny;
    patch.price_per_kg_cny = v === null ? null : Number(v);
  }
  if (body.next_departure_date !== undefined) {
    patch.next_departure_date = body.next_departure_date || null;
  }
  if (body.estimated_arrival_date !== undefined) {
    patch.estimated_arrival_date = body.estimated_arrival_date || null;
  }
  if (body.transit_days_estimate !== undefined) {
    const v = body.transit_days_estimate;
    patch.transit_days_estimate = v === null ? null : Number(v);
  }
  if (typeof body.cutoff_note === "string" || body.cutoff_note === null) {
    patch.cutoff_note = body.cutoff_note || null;
  }
  if (typeof body.notes === "string" || body.notes === null) {
    patch.notes = body.notes || null;
  }
  if (typeof body.label === "string") {
    patch.label = body.label;
  }
  if (body.frequency_label !== undefined) {
    patch.frequency_label =
      typeof body.frequency_label === "string"
        ? body.frequency_label.trim() || null
        : null;
  }
  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("shipping_routes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
