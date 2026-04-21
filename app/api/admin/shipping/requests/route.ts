// /api/admin/shipping/requests
// GET — list all shipment requests (filter by status).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { SHIPMENT_REQUEST_STATUS_VALUES } from "@/lib/types";

const STATUS_SET = new Set<string>(SHIPMENT_REQUEST_STATUS_VALUES);

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  if (status && !STATUS_SET.has(status)) {
    return NextResponse.json({ error: "非法 status" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("shipment_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
