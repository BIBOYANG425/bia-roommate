// app/api/squad/foryou/route.ts
// Personalized board ranking for the signed-in user. Identity is derived inside
// squad_board_for_me() from the caller's JWT (self-scoped, JIT-provisioned) — the
// user's own anon-key session is the right client here, NOT service role.
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildReason, type RankRow } from "@/lib/squad/reason";

export async function GET(_req?: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data, error } = await supabase.rpc("squad_board_for_me", { p_match_count: 30 });
  if (error) {
    return NextResponse.json({ error: "recommendations_unavailable" }, { status: 502 });
  }
  const rows = (data ?? []) as RankRow[];
  return NextResponse.json(rows.map((r, i) => ({
    post_id: r.post_id,
    rank: i + 1,
    reason: buildReason(r),
  })));
}
