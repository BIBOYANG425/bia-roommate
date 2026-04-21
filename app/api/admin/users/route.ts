// /api/admin/users
// GET — list students with search (name, member_id, email), paginated.
// Joins to auth.users for email.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("students")
    .select("id, name, member_id, user_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,member_id.ilike.%${search}%`,
    );
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach emails by fetching auth.users in bulk
  const userIds = (data ?? []).map((s) => s.user_id).filter(Boolean) as string[];
  const emails = new Map<string, string>();
  if (userIds.length > 0) {
    // supabase-js admin API returns ALL users paginated; for scale we'd use
    // getUserById per student, but BIA is small enough for bulk fetch.
    const { data: authList } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    for (const u of authList?.users ?? []) {
      if (u.email) emails.set(u.id, u.email);
    }
  }

  const students = (data ?? []).map((s) => ({
    ...s,
    email: s.user_id ? emails.get(s.user_id) ?? null : null,
  }));

  return NextResponse.json({ students, total: count ?? 0, limit, offset });
}
