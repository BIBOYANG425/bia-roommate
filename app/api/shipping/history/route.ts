// /api/shipping/history
// GET — public read of completed shipping batches with aggregated weight,
// transit duration, and dominant shipping method. Cached 5min.
//
// "Completed" = status IN ('pickup_closed', 'archived'). Earlier states
// (arrived_us, pickup_open) are still in-flight on the user side.

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ShippingMethod } from "@/lib/types";

const HISTORY_LIMIT = 24;

export async function GET() {
  const supabase = createAdminSupabaseClient();

  const { data: shipments, error: sErr } = await supabase
    .from("shipments")
    .select("id, name, status, departed_cn_at, arrived_us_at, carrier")
    .in("status", ["pickup_closed", "archived"])
    .order("arrived_us_at", { ascending: false, nullsFirst: false })
    .limit(HISTORY_LIMIT);

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }
  if (!shipments || shipments.length === 0) {
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  const ids = shipments.map((s) => s.id);
  const { data: parcels, error: pErr } = await supabase
    .from("parcels")
    .select("shipment_id, weight_grams, shipping_method")
    .in("shipment_id", ids);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  type Agg = {
    weight: number;
    count: number;
    methods: Map<string, number>;
  };
  const byShipment = new Map<string, Agg>();

  for (const p of parcels ?? []) {
    const entry =
      byShipment.get(p.shipment_id) ??
      ({ weight: 0, count: 0, methods: new Map() } as Agg);
    entry.weight += p.weight_grams ?? 0;
    entry.count += 1;
    if (p.shipping_method) {
      entry.methods.set(
        p.shipping_method,
        (entry.methods.get(p.shipping_method) ?? 0) + 1,
      );
    }
    byShipment.set(p.shipment_id, entry);
  }

  const history = shipments.map((s) => {
    const agg =
      byShipment.get(s.id) ??
      ({ weight: 0, count: 0, methods: new Map() } as Agg);

    let transitDays: number | null = null;
    if (s.departed_cn_at && s.arrived_us_at) {
      const ms =
        new Date(s.arrived_us_at).getTime() -
        new Date(s.departed_cn_at).getTime();
      transitDays = Math.max(1, Math.round(ms / 86_400_000));
    }

    const sortedMethods = Array.from(agg.methods.entries()).sort(
      (a, b) => b[1] - a[1],
    );
    const dominantMethod =
      (sortedMethods[0]?.[0] as ShippingMethod | undefined) ?? null;

    return {
      id: s.id,
      name: s.name,
      status: s.status,
      departed_cn_at: s.departed_cn_at,
      arrived_us_at: s.arrived_us_at,
      carrier: s.carrier,
      total_weight_grams: agg.weight,
      parcel_count: agg.count,
      transit_days: transitDays,
      dominant_method: dominantMethod,
    };
  });

  return NextResponse.json(history, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
