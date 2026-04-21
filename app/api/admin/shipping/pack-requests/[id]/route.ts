// /api/admin/shipping/pack-requests/[id]
// PATCH — update status / admin_note / shipment_id (when linked to an
//         actual shipment after attach).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PACK_REQUEST_STATUS_VALUES } from "@/lib/types";

const STATUS_SET = new Set<string>(PACK_REQUEST_STATUS_VALUES);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    if (!STATUS_SET.has(body.status)) {
      return NextResponse.json({ error: "非法 status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.admin_note !== undefined) {
    patch.admin_note =
      typeof body.admin_note === "string"
        ? body.admin_note.trim() || null
        : null;
  }
  if (body.shipment_id !== undefined) {
    patch.shipment_id =
      typeof body.shipment_id === "string" && body.shipment_id
        ? body.shipment_id
        : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("pack_requests")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
