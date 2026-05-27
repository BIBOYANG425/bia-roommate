// /api/shipping/requests
// POST — authenticated user submits a special consolidation request.
// Rate-limited to 3 requests / 24h / user (abuse guard).

import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";
import { shipmentRequestCreateSchema } from "@/lib/schemas/shipment-request";
import { SHIPPING_METHOD_VALUES } from "@/lib/types";

const METHOD_SET = new Set<string>(SHIPPING_METHOD_VALUES);

export const POST = authedHandler({
  schema: shipmentRequestCreateSchema,
  rateLimit: {
    key: "shipment-request",
    limit: 3,
    windowMs: 24 * 60 * 60 * 1000,
    message: "一天内最多提交 3 次申请，请稍后再试。",
  },
  handler: async ({ user, supabase, body }) => {
    const description = body.description.trim();
    if (!description) {
      return NextResponse.json(
        { error: "description 不能为空" },
        { status: 400 },
      );
    }

    const preferredMethod = (body.preferred_method ?? "").trim();
    if (preferredMethod && !METHOD_SET.has(preferredMethod)) {
      return NextResponse.json(
        { error: "非法 preferred_method" },
        { status: 400 },
      );
    }

    let expectedWeight: number | null = null;
    const raw = body.expected_weight_grams;
    if (raw !== undefined && raw !== null && raw !== "") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 500_000) {
        return NextResponse.json(
          { error: "expected_weight_grams 超出范围" },
          { status: 400 },
        );
      }
      expectedWeight = Math.round(n);
    }

    const urgencyNote = (body.urgency_note ?? "").trim();
    const contact = (body.contact ?? "").trim();

    // Best-effort lookup of student row for member_id stamping.
    const { data: student } = await supabase
      .from("students")
      .select("id, member_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("shipment_requests")
      .insert({
        user_id: user.id,
        student_id: student?.id ?? null,
        member_id: student?.member_id ?? null,
        description,
        expected_weight_grams: expectedWeight,
        preferred_method: preferredMethod || null,
        urgency_note: urgencyNote || null,
        contact: contact || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  },
});
