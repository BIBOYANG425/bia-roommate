// /api/admin/shipping/parcels
// GET — list parcels with filters (status, shipment_id, member_id, search).
// Admin-gated. Returns { parcels, total }.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PARCEL_STATUS_VALUES } from "@/lib/types";

const STATUS_SET = new Set<string>(PARCEL_STATUS_VALUES);

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const shipmentId = searchParams.get("shipment_id");
  const memberId = searchParams.get("member_id");
  const search = (searchParams.get("search") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  if (status && !STATUS_SET.has(status)) {
    return NextResponse.json({ error: "非法 status" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("parcels")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (shipmentId === "null") query = query.is("shipment_id", null);
  else if (shipmentId) query = query.eq("shipment_id", shipmentId);
  if (memberId) query = query.eq("member_id", memberId);
  if (search) {
    query = query.or(
      `description.ilike.%${search}%,tracking_cn.ilike.%${search}%,member_id.ilike.%${search}%`,
    );
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    parcels: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
