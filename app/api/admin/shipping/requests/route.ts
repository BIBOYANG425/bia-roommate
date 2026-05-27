// /api/admin/shipping/requests
// GET — list all shipment requests (filter by status).

import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/api/authed-handler";
import { SHIPMENT_REQUEST_STATUS_VALUES } from "@/lib/types";

const STATUS_SET = new Set<string>(SHIPMENT_REQUEST_STATUS_VALUES);

export const GET = adminHandler({
  handler: async ({ adminSupabase, request }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    if (status && !STATUS_SET.has(status)) {
      return NextResponse.json({ error: "非法 status" }, { status: 400 });
    }

    let query = adminSupabase
      .from("shipment_requests")
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
