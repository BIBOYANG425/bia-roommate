// /api/admin/stats
// GET — aggregate counts for the admin dashboard home.
// Admin-gated.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  PARCEL_STATUS_VALUES,
  type ParcelStatus,
} from "@/lib/types";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const supabase = createAdminSupabaseClient();

  const [parcelsRes, shipmentsRes, usersRes] = await Promise.all([
    supabase.from("parcels").select("status"),
    supabase.from("shipments").select("status"),
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);

  if (parcelsRes.error) {
    return NextResponse.json(
      { error: parcelsRes.error.message },
      { status: 500 },
    );
  }
  if (shipmentsRes.error) {
    return NextResponse.json(
      { error: shipmentsRes.error.message },
      { status: 500 },
    );
  }

  const parcelsByStatus = {} as Record<ParcelStatus, number>;
  for (const s of PARCEL_STATUS_VALUES) parcelsByStatus[s] = 0;
  for (const row of parcelsRes.data ?? []) {
    const s = row.status as ParcelStatus;
    parcelsByStatus[s] = (parcelsByStatus[s] ?? 0) + 1;
  }

  const activeShipments =
    shipmentsRes.data?.filter(
      (r) => r.status !== "archived" && r.status !== "pickup_closed",
    ).length ?? 0;

  return NextResponse.json({
    parcelsByStatus,
    parcelsTotal: parcelsRes.data?.length ?? 0,
    activeShipments,
    totalShipments: shipmentsRes.data?.length ?? 0,
    usersTotal: usersRes.count ?? 0,
  });
}
