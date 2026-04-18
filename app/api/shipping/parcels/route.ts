// /api/shipping/parcels
// GET  — list the current user's parcels, newest first
// POST — pre-declare a new parcel. Rate-limited 5/day/user. Auto-attaches
//        student_id via the ensure_student_for_current_user RPC so the
//        member_id trigger in 20260419_shipping.sql can stamp the parcel.

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { PARCEL_CATEGORY_OPTIONS, CN_CARRIER_OPTIONS } from "@/lib/types";

const CATEGORY_SET = new Set<string>(PARCEL_CATEGORY_OPTIONS);
const CARRIER_SET = new Set<string>(CN_CARRIER_OPTIONS);

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("parcels")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 5 declarations per user per 24h — high enough for a legitimate shopping
  // spree, low enough to blunt accidental dupes or abuse.
  const rl = checkRateLimit(`parcel:create:${user.id}`, {
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error:
          "一天内最多预报 5 个包裹，24 小时后再试。需要更多额度请联系 BIA 运营。",
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const description = String(body.description ?? "").trim();
  if (!description) {
    return NextResponse.json(
      { error: "description 不能为空" },
      { status: 400 },
    );
  }
  if (description.length > 500) {
    return NextResponse.json(
      { error: "description 最多 500 字" },
      { status: 400 },
    );
  }

  const category =
    typeof body.category === "string" ? body.category.trim() : "";
  if (category && !CATEGORY_SET.has(category)) {
    return NextResponse.json({ error: "非法 category" }, { status: 400 });
  }

  const carrier =
    typeof body.carrier_cn === "string" ? body.carrier_cn.trim() : "";
  if (carrier && !CARRIER_SET.has(carrier)) {
    return NextResponse.json({ error: "非法 carrier_cn" }, { status: 400 });
  }

  const trackingCn =
    typeof body.tracking_cn === "string" ? body.tracking_cn.trim() : "";

  const declaredRaw = body.declared_value_cny;
  let declaredValue: number | null = null;
  if (declaredRaw !== undefined && declaredRaw !== null && declaredRaw !== "") {
    const n = Number(declaredRaw);
    if (!Number.isFinite(n) || n < 0 || n > 50_000) {
      return NextResponse.json(
        {
          error:
            "declared_value_cny 必须在 0 – 50000 之间；超过单件上限请分多个包裹。",
        },
        { status: 400 },
      );
    }
    declaredValue = Math.round(n);
  }

  const photos = Array.isArray(body.photos)
    ? body.photos
        .filter((p): p is string => typeof p === "string" && p.length > 0)
        .slice(0, 6)
    : [];

  const userNotes =
    typeof body.user_notes === "string" ? body.user_notes.trim() : "";

  // Bridge: ensure the web-app user has a students row + member_id. The
  // parcel trigger will pick up member_id from students; we also pass
  // student_id explicitly so it doesn't go down the orphan path.
  const { data: student, error: bridgeErr } = await supabase
    .rpc("ensure_student_for_current_user", { p_name: null })
    .single();
  if (bridgeErr || !student) {
    return NextResponse.json(
      {
        error:
          "Failed to resolve student record: " +
          (bridgeErr?.message ?? "unknown"),
      },
      { status: 500 },
    );
  }

  // Pick the active default warehouse (may be null if BIA hasn't configured
  // one yet — that's a soft error; the parcel still gets stored but without
  // a warehouse_id. Admin can attach one later.).
  const { data: warehouse } = await supabase
    .from("warehouse_addresses")
    .select("id")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: inserted, error: insertErr } = await supabase
    .from("parcels")
    .insert({
      user_id: user.id,
      student_id: (student as { id: string }).id,
      description,
      category: category || null,
      tracking_cn: trackingCn || null,
      carrier_cn: carrier || null,
      declared_value_cny: declaredValue,
      photos,
      user_notes: userNotes || null,
      warehouse_id: warehouse?.id ?? null,
      // member_id is populated by the ensure_student_member_id trigger
      member_id: "",
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}
