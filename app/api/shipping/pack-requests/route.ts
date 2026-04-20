// /api/shipping/pack-requests
//
// POST — authenticated user submits a pack request. Body: { parcel_ids,
//        preferred_method?, urgency_note?, contact?, user_note? }
//        Server validates that every parcel belongs to the user AND is
//        currently in received_cn state (i.e. actually in the warehouse,
//        eligible to pack) AND isn't already in an open pack request.
//
// GET  — list the current user's pack requests with their attached parcels.
//        Used to show "已申请打包" state on the dashboard.

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { SHIPPING_METHOD_VALUES } from "@/lib/types";

const METHOD_SET = new Set<string>(SHIPPING_METHOD_VALUES);

const OPEN_STATUSES = ["pending", "contacted", "approved"] as const;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: requests, error } = await supabase
    .from("pack_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (requests ?? []).map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch parcels-per-request via the join table. Two queries is simpler and
  // easier on types than a nested select.
  const { data: links } = await supabase
    .from("pack_request_parcels")
    .select("request_id, parcel_id")
    .in("request_id", ids);

  const parcelIds = Array.from(new Set((links ?? []).map((l) => l.parcel_id)));
  const { data: parcels } = parcelIds.length
    ? await supabase
        .from("parcels")
        .select(
          "id, member_id, description, status, shipping_method, weight_grams, photos",
        )
        .in("id", parcelIds)
    : { data: [] };

  const parcelById = new Map((parcels ?? []).map((p) => [p.id, p]));
  const parcelsByRequest = new Map<string, unknown[]>();
  for (const link of links ?? []) {
    const p = parcelById.get(link.parcel_id);
    if (!p) continue;
    if (!parcelsByRequest.has(link.request_id)) {
      parcelsByRequest.set(link.request_id, []);
    }
    parcelsByRequest.get(link.request_id)!.push(p);
  }

  const result = (requests ?? []).map((r) => ({
    ...r,
    parcels: parcelsByRequest.get(r.id) ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`pack-request:${user.id}`, {
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "一天内最多提交 10 次打包申请，请稍后再试。" },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parcelIds = Array.isArray(body.parcel_ids)
    ? body.parcel_ids.filter((x): x is string => typeof x === "string")
    : [];
  if (parcelIds.length === 0) {
    return NextResponse.json(
      { error: "请至少选择一个包裹" },
      { status: 400 },
    );
  }
  if (parcelIds.length > 50) {
    return NextResponse.json(
      { error: "单次最多选 50 个包裹" },
      { status: 400 },
    );
  }

  const preferredMethod =
    typeof body.preferred_method === "string"
      ? body.preferred_method.trim()
      : "";
  if (preferredMethod && !METHOD_SET.has(preferredMethod)) {
    return NextResponse.json(
      { error: "非法 preferred_method" },
      { status: 400 },
    );
  }

  const urgencyNote =
    typeof body.urgency_note === "string" ? body.urgency_note.trim() : "";
  const contact =
    typeof body.contact === "string" ? body.contact.trim() : "";
  const userNote =
    typeof body.user_note === "string" ? body.user_note.trim() : "";

  // Validate parcels: each must belong to the user AND be received_cn AND
  // not already linked to a still-open pack request.
  const { data: parcels, error: pErr } = await supabase
    .from("parcels")
    .select("id, status")
    .in("id", parcelIds)
    .eq("user_id", user.id);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  if (!parcels || parcels.length !== parcelIds.length) {
    return NextResponse.json(
      { error: "部分包裹不存在或不属于你" },
      { status: 400 },
    );
  }
  for (const p of parcels) {
    if (p.status !== "received_cn") {
      return NextResponse.json(
        {
          error:
            "只能申请打包「仓库已签收」(received_cn) 状态的包裹。其他状态的包裹暂时不能申请。",
        },
        { status: 400 },
      );
    }
  }

  // Check no open pack request already owns these parcels.
  const { data: existingLinks } = await supabase
    .from("pack_request_parcels")
    .select("parcel_id, request_id, pack_requests!inner(status)")
    .in("parcel_id", parcelIds);

  for (const link of (existingLinks as unknown as Array<{
    parcel_id: string;
    pack_requests: { status: string } | null;
  }>) ?? []) {
    const s = link.pack_requests?.status;
    if (s && OPEN_STATUSES.includes(s as (typeof OPEN_STATUSES)[number])) {
      return NextResponse.json(
        {
          error:
            "选中的包裹里至少有一个已经在另一个打包申请中（进行中）。",
        },
        { status: 409 },
      );
    }
  }

  // Look up student info for denormalization.
  const { data: student } = await supabase
    .from("students")
    .select("id, member_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Create the request row.
  const { data: created, error: insertErr } = await supabase
    .from("pack_requests")
    .insert({
      user_id: user.id,
      student_id: student?.id ?? null,
      member_id: student?.member_id ?? null,
      preferred_method: preferredMethod || null,
      urgency_note: urgencyNote || null,
      contact: contact || null,
      user_note: userNote || null,
    })
    .select()
    .single();

  if (insertErr || !created) {
    return NextResponse.json(
      { error: insertErr?.message ?? "创建申请失败" },
      { status: 500 },
    );
  }

  // Link parcels.
  const links = parcelIds.map((pid) => ({
    request_id: created.id,
    parcel_id: pid,
  }));
  const { error: linkErr } = await supabase
    .from("pack_request_parcels")
    .insert(links);

  if (linkErr) {
    // Best-effort rollback: delete the orphan request
    await supabase.from("pack_requests").delete().eq("id", created.id);
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
