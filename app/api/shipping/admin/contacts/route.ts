// /api/shipping/admin/contacts
// GET  — list all contacts (including inactive), admin-gated
// PATCH — update contact by id (value, label, qr_code_url), admin-gated

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("shipping_contacts")
    .select("*")
    .order("display_order", { ascending: true });

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
  if (typeof body.value === "string") {
    patch.value = body.value;
  }
  if (typeof body.label === "string") {
    patch.label = body.label;
  }
  if (typeof body.label_en === "string" || body.label_en === null) {
    patch.label_en = body.label_en || null;
  }
  if (typeof body.qr_code_url === "string" || body.qr_code_url === null) {
    patch.qr_code_url = body.qr_code_url || null;
  }
  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }
  if (typeof body.display_order === "number") {
    patch.display_order = body.display_order;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("shipping_contacts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
