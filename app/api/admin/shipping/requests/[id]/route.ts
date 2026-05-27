// /api/admin/shipping/requests/[id]
// PATCH — update status and admin_note.

import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/api/authed-handler";
import { adminRequestPatchSchema } from "@/lib/schemas/admin-shipping";
import { SHIPMENT_REQUEST_STATUS_VALUES } from "@/lib/types";

const STATUS_SET = new Set<string>(SHIPMENT_REQUEST_STATUS_VALUES);

type Params = { id: string };

export const PATCH = adminHandler<typeof adminRequestPatchSchema, Params>({
  schema: adminRequestPatchSchema,
  handler: async ({ adminSupabase, body, params }) => {
    const { id } = params;

    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) {
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

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "没有可更新的字段" },
        { status: 400 },
      );
    }

    const { data, error } = await adminSupabase
      .from("shipment_requests")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  },
});
