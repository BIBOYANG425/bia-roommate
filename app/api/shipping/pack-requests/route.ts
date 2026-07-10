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
import { authedHandler } from "@/lib/api/authed-handler";
import { packRequestCreateSchema } from "@/lib/schemas/pack-request";
import { SHIPPING_METHOD_VALUES } from "@/lib/types";

const METHOD_SET = new Set<string>(SHIPPING_METHOD_VALUES);

export const GET = authedHandler({
  handler: async ({ user, supabase }) => {
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

    // Fetch parcels-per-request via the join table. Two queries is simpler
    // and easier on types than a nested select.
    const { data: links, error: linksError } = await supabase
      .from("pack_request_parcels")
      .select("request_id, parcel_id")
      .in("request_id", ids);

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 });
    }

    const parcelIds = Array.from(
      new Set((links ?? []).map((l) => l.parcel_id)),
    );
    const { data: parcels, error: parcelsError } = parcelIds.length
      ? await supabase
          .from("parcels")
          .select(
            "id, member_id, description, status, shipping_method, weight_grams, photos",
          )
          .in("id", parcelIds)
      : { data: [], error: null };

    if (parcelsError) {
      return NextResponse.json({ error: parcelsError.message }, { status: 500 });
    }

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
  },
});

export const POST = authedHandler({
  schema: packRequestCreateSchema,
  rateLimit: {
    key: "pack-request",
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
    message: "一天内最多提交 10 次打包申请，请稍后再试。",
  },
  handler: async ({ supabase, body }) => {
    const parcelIds = body.parcel_ids;

    const preferredMethod = (body.preferred_method ?? "").trim();
    if (preferredMethod && !METHOD_SET.has(preferredMethod)) {
      return NextResponse.json(
        { error: "非法 preferred_method" },
        { status: 400 },
      );
    }

    const urgencyNote = (body.urgency_note ?? "").trim();
    const contact = (body.contact ?? "").trim();
    const userNote = (body.user_note ?? "").trim();

    const { data: created, error: rpcError } = await supabase.rpc(
      "create_pack_request",
      {
        p_parcel_ids: parcelIds,
        p_preferred_method: preferredMethod || null,
        p_urgency_note: urgencyNote || null,
        p_contact: contact || null,
        p_user_note: userNote || null,
      },
    );

    if (rpcError) {
      if (rpcError.message.includes("pack_request_already_open")) {
        return NextResponse.json(
          { error: "选中的包裹里至少有一个已经在另一个打包申请中（进行中）。" },
          { status: 409 },
        );
      }
      if (
        rpcError.message.includes("pack_request_invalid_parcels") ||
        rpcError.message.includes("pack_request_parcel_not_eligible")
      ) {
        return NextResponse.json({ error: rpcError.message }, { status: 400 });
      }
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!created) {
      return NextResponse.json({ error: "创建申请失败" }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  },
});
