// GET /api/shipping/address
// Bridges the current Supabase-Auth user to their public.students row
// (creating it if needed), auto-provisions a member_id, and returns the
// active warehouse address the user should use as the Taobao recipient.
// First hit from /shipping/address is what physically creates the member_id.

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { WarehouseAddress } from "@/lib/types";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Prefer a human-ish name if Supabase user metadata has one, so the CN
  // warehouse recipient label is something staff can recognize on arrival.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nameHint =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (typeof user.email === "string" && user.email.split("@")[0]) ||
    null;

  const { data: student, error: studentErr } = await supabase
    .rpc("ensure_student_for_current_user", { p_name: nameHint })
    .single();

  if (studentErr || !student) {
    return NextResponse.json(
      {
        error:
          "Failed to provision student record: " +
          (studentErr?.message ?? "unknown"),
      },
      { status: 500 },
    );
  }

  const { data: warehouse, error: whErr } = await supabase
    .from("warehouse_addresses")
    .select(
      "id, code, display_name, recipient_template, street, city, province, postal_code, phone, active, notes",
    )
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (whErr) {
    return NextResponse.json({ error: whErr.message }, { status: 500 });
  }

  const row = student as { id: string; member_id: string; name: string };

  return NextResponse.json({
    student: {
      id: row.id,
      member_id: row.member_id,
      name: row.name,
    },
    warehouse: (warehouse ?? null) as WarehouseAddress | null,
  });
}
