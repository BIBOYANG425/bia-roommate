// /api/shipping/parcels/[id]
// GET    — parcel detail + timeline (events) + shipment card
// PATCH  — owner edits while status='expected' (description, tracking, etc.)
// DELETE — owner deletes while status='expected'

import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";
import { parcelPatchSchema } from "@/lib/schemas/parcel";
import { filterOwnedPhotos } from "@/lib/shipping/photo-path";
import {
  PARCEL_CATEGORY_OPTIONS,
  CN_CARRIER_OPTIONS,
  SHIPPING_METHOD_VALUES,
} from "@/lib/types";

const CATEGORY_SET = new Set<string>(PARCEL_CATEGORY_OPTIONS);
const CARRIER_SET = new Set<string>(CN_CARRIER_OPTIONS);
const METHOD_SET = new Set<string>(SHIPPING_METHOD_VALUES);

type Params = { id: string };

export const GET = authedHandler<undefined, Params>({
  handler: async ({ user, supabase, params }) => {
    const { id } = params;

    const { data: parcel, error } = await supabase
      .from("parcels")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!parcel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [{ data: events }, { data: shipment }] = await Promise.all([
      supabase
        .from("parcel_events")
        .select("*")
        .eq("parcel_id", id)
        .order("created_at", { ascending: false }),
      parcel.shipment_id
        ? supabase
            .from("shipments")
            .select("*")
            .eq("id", parcel.shipment_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({
      parcel,
      events: events ?? [],
      shipment: shipment ?? null,
    });
  },
});

export const PATCH = authedHandler<typeof parcelPatchSchema, Params>({
  schema: parcelPatchSchema,
  rateLimit: {
    key: "parcel:patch",
    limit: 30,
    windowMs: 60 * 60 * 1000,
    message: "修改过于频繁，请稍后再试。",
  },
  handler: async ({ user, supabase, body, params }) => {
    const { id } = params;

    // Enforce "expected only" at the API layer (RLS also enforces this).
    const { data: existing, error: fetchErr } = await supabase
      .from("parcels")
      .select("status, user_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.status !== "expected") {
      return NextResponse.json(
        { error: "包裹已入库，不能再修改。有问题联系 BIA 运营。" },
        { status: 409 },
      );
    }

    const patch: Record<string, unknown> = {};

    if (body.description !== undefined) {
      const v = body.description.trim();
      if (!v) {
        return NextResponse.json(
          { error: "description 不能为空" },
          { status: 400 },
        );
      }
      patch.description = v;
    }

    if (body.category !== undefined) {
      const v = body.category.trim();
      if (v && !CATEGORY_SET.has(v)) {
        return NextResponse.json({ error: "非法 category" }, { status: 400 });
      }
      patch.category = v || null;
    }

    if (body.carrier_cn !== undefined) {
      const v = body.carrier_cn.trim();
      if (v && !CARRIER_SET.has(v)) {
        return NextResponse.json(
          { error: "非法 carrier_cn" },
          { status: 400 },
        );
      }
      patch.carrier_cn = v || null;
    }

    if (body.tracking_cn !== undefined) {
      const v = body.tracking_cn.trim();
      patch.tracking_cn = v || null;
    }

    if (body.declared_value_cny !== undefined) {
      const raw = body.declared_value_cny;
      if (raw === null || raw === "") {
        patch.declared_value_cny = null;
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 50_000) {
          return NextResponse.json(
            { error: "declared_value_cny 必须在 0 – 50000 之间" },
            { status: 400 },
          );
        }
        patch.declared_value_cny = Math.round(n);
      }
    }

    if (body.photos !== undefined) {
      // Only keep paths the caller owns (`${user.id}/...`); see photo-path.ts.
      patch.photos = filterOwnedPhotos(body.photos, user.id);
    }

    if (body.user_notes !== undefined) {
      const v = body.user_notes.trim();
      patch.user_notes = v || null;
    }

    if (body.shipping_method !== undefined) {
      const v = body.shipping_method.trim();
      if (v && !METHOD_SET.has(v)) {
        return NextResponse.json(
          { error: "非法 shipping_method" },
          { status: 400 },
        );
      }
      patch.shipping_method = v || null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "没有可更新的字段" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("parcels")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "expected")
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  },
});

export const DELETE = authedHandler<undefined, Params>({
  handler: async ({ user, supabase, params }) => {
    const { id } = params;

    const { error } = await supabase
      .from("parcels")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "expected");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  },
});
