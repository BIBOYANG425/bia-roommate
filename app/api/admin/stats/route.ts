// /api/admin/stats
// GET — aggregate counts for the admin dashboard home.
// Admin-gated.

import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/api/authed-handler";
import { PARCEL_STATUS_VALUES, type ParcelStatus } from "@/lib/types";

export const GET = adminHandler({
  handler: async ({ adminSupabase }) => {
    const [
      parcelsRes,
      shipmentsRes,
      usersRes,
      pendingPackRes,
      pendingRequestRes,
    ] = await Promise.all([
      adminSupabase.from("parcels").select("status"),
      adminSupabase.from("shipments").select("status"),
      adminSupabase.from("students").select("id", { count: "exact", head: true }),
      // Pack requests still awaiting first contact (新提交的拼单).
      adminSupabase
        .from("pack_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      // Express shipment requests still awaiting handling (新提交的急件).
      adminSupabase
        .from("shipment_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
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
      // 待处理提醒计数。count 查询失败时回退到 0，不影响其余统计。
      pendingPackRequests: pendingPackRes.count ?? 0,
      pendingShipmentRequests: pendingRequestRes.count ?? 0,
    });
  },
});
