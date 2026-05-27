// /api/admin/shipping/shipments
// GET  — list shipments (filter by status)
// POST — create { name, carrier?, notes? }; status defaults to 'forming'

import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/api/authed-handler";
import { adminShipmentCreateSchema } from "@/lib/schemas/admin-shipping";
import { SHIPMENT_STATUS_VALUES } from "@/lib/types";

const SHIPMENT_STATUS_SET = new Set<string>(SHIPMENT_STATUS_VALUES);

export const GET = adminHandler({
  handler: async ({ adminSupabase, request }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    if (status && !SHIPMENT_STATUS_SET.has(status)) {
      return NextResponse.json({ error: "非法 status" }, { status: 400 });
    }

    let query = adminSupabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  },
});

export const POST = adminHandler({
  schema: adminShipmentCreateSchema,
  handler: async ({ user, adminSupabase, body }) => {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
    }
    const carrier = body.carrier?.trim() || null;
    const notes = body.notes?.trim() || null;

    const { data, error } = await adminSupabase
      .from("shipments")
      .insert({ name, carrier, notes, created_by: user.id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  },
});
