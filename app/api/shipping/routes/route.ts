// /api/shipping/routes
// GET — public read of active shipping routes + contacts.
// No auth required. Cached 60s.

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminSupabaseClient();

  const [{ data: routes, error: rErr }, { data: contacts, error: cErr }] =
    await Promise.all([
      supabase
        .from("shipping_routes")
        .select("*")
        .eq("active", true)
        .order("method"),
      // `value = '待配置'` is the migration placeholder. Hide those from the
      // public feed so unconfigured rows don't render empty contact cards.
      // Admin endpoint returns everything regardless.
      supabase
        .from("shipping_contacts")
        .select("*")
        .eq("active", true)
        .neq("value", "待配置")
        .order("display_order", { ascending: true }),
    ]);

  if (rErr || cErr) {
    return NextResponse.json(
      { error: (rErr ?? cErr)!.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { routes: routes ?? [], contacts: contacts ?? [] },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
