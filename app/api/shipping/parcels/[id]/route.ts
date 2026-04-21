// /api/shipping/parcels/[id]
// GET    — parcel detail + timeline (events) + shipment card
// PATCH  — owner edits while status='expected' (description, tracking, etc.)
// DELETE — owner deletes while status='expected'

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  PARCEL_CATEGORY_OPTIONS,
  CN_CARRIER_OPTIONS,
  SHIPPING_METHOD_VALUES,
} from "@/lib/types";

const CATEGORY_SET = new Set<string>(PARCEL_CATEGORY_OPTIONS);
const CARRIER_SET = new Set<string>(CN_CARRIER_OPTIONS);
const METHOD_SET = new Set<string>(SHIPPING_METHOD_VALUES);

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { supabase, user };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireUser();
  if (ctx.error) return ctx.error;
  const { supabase, user } = ctx;

  const { data: parcel, error } = await supabase
    .from("parcels")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!parcel) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireUser();
  if (ctx.error) return ctx.error;
  const { supabase, user } = ctx;

  // 30 edits per user per hour — generous for a legitimate re-entry of
  // tracking numbers / photo adjustments, blunt enough to stop loops.
  const rl = checkRateLimit(`parcel:patch:${user.id}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "修改过于频繁，请稍后再试。" },
      { status: 429 },
    );
  }

  // Enforce "expected only" at the API layer (RLS also enforces this).
  const { data: existing, error: fetchErr } = await supabase
    .from("parcels")
    .select("status, user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "expected") {
    return NextResponse.json(
      { error: "包裹已入库，不能再修改。有问题联系 BIA 运营。" },
      { status: 409 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.description === "string") {
    const v = body.description.trim();
    if (!v) return NextResponse.json({ error: "description 不能为空" }, { status: 400 });
    if (v.length > 500) return NextResponse.json({ error: "description 最多 500 字" }, { status: 400 });
    patch.description = v;
  }

  if (body.category !== undefined) {
    const v = typeof body.category === "string" ? body.category.trim() : "";
    if (v && !CATEGORY_SET.has(v)) return NextResponse.json({ error: "非法 category" }, { status: 400 });
    patch.category = v || null;
  }

  if (body.carrier_cn !== undefined) {
    const v = typeof body.carrier_cn === "string" ? body.carrier_cn.trim() : "";
    if (v && !CARRIER_SET.has(v)) return NextResponse.json({ error: "非法 carrier_cn" }, { status: 400 });
    patch.carrier_cn = v || null;
  }

  if (body.tracking_cn !== undefined) {
    const v = typeof body.tracking_cn === "string" ? body.tracking_cn.trim() : "";
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

  if (Array.isArray(body.photos)) {
    patch.photos = body.photos
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .slice(0, 6);
  }

  if (body.user_notes !== undefined) {
    const v = typeof body.user_notes === "string" ? body.user_notes.trim() : "";
    patch.user_notes = v || null;
  }

  if (body.shipping_method !== undefined) {
    const v =
      typeof body.shipping_method === "string"
        ? body.shipping_method.trim()
        : "";
    if (v && !METHOD_SET.has(v)) {
      return NextResponse.json(
        { error: "非法 shipping_method" },
        { status: 400 },
      );
    }
    patch.shipping_method = v || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("parcels")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "expected")
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireUser();
  if (ctx.error) return ctx.error;
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("parcels")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "expected");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
