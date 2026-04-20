// /api/admin/shipping/shipments
// GET  — list shipments (filter by status)
// POST — create { name, carrier?, notes? }; status defaults to 'forming'

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { SHIPMENT_STATUS_VALUES } from "@/lib/types";

const SHIPMENT_STATUS_SET = new Set<string>(SHIPMENT_STATUS_VALUES);

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  if (status && !SHIPMENT_STATUS_SET.has(status)) {
    return NextResponse.json({ error: "非法 status" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
  }
  const carrier =
    typeof body.carrier === "string" ? body.carrier.trim() || null : null;
  const notes =
    typeof body.notes === "string" ? body.notes.trim() || null : null;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("shipments")
    .insert({
      name,
      carrier,
      notes,
      created_by: gate.ctx.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
