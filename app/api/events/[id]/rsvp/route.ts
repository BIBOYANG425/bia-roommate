import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authedHandler } from "@/lib/api/authed-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// POST/DELETE /api/events/[id]/rsvp — toggle the signed-in user's RSVP.
//
// Identity bridge: the web user (auth.users) is resolved to their students row
// via the SECURITY DEFINER RPC ensure_student_for_current_user (auto-creates the
// row + member_id on first use), the same bridge shipping uses. The attendance
// write goes through the service-role client (event_attendance is a george-owned
// table with no anon RLS). Idempotent: unique(student_id, event_id).

type Params = { id: string };

async function resolveStudentId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase
    .rpc("ensure_student_for_current_user", { p_name: null })
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export const POST = authedHandler<undefined, Params>({
  handler: async ({ supabase, params }) => {
    const studentId = await resolveStudentId(supabase);
    if (!studentId) {
      return NextResponse.json({ error: "student_resolve_failed" }, { status: 500 });
    }
    const admin = createAdminSupabaseClient();
    const { error } = await admin
      .from("event_attendance")
      .upsert(
        { student_id: studentId, event_id: params.id, source: "rsvp" },
        { onConflict: "student_id,event_id", ignoreDuplicates: true },
      );
    if (error) {
      return NextResponse.json(
        { error: "rsvp_failed", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, rsvped: true });
  },
});

export const DELETE = authedHandler<undefined, Params>({
  handler: async ({ supabase, params }) => {
    const studentId = await resolveStudentId(supabase);
    if (!studentId) return NextResponse.json({ ok: true, rsvped: false });
    const admin = createAdminSupabaseClient();
    // Only remove an RSVP — never a check-in record.
    await admin
      .from("event_attendance")
      .delete()
      .eq("student_id", studentId)
      .eq("event_id", params.id)
      .eq("source", "rsvp");
    return NextResponse.json({ ok: true, rsvped: false });
  },
});
