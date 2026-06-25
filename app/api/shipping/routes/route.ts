// /api/shipping/routes
// GET — public read of active shipping routes + contacts.
// No auth required. Cached 60s. Uses the ANON client (not service-role): the
// "Anyone can read active …" RLS policies (20260420 migration) enforce
// active-only at the DB, so even a dropped .eq filter can't leak inactive rows
// — and a student-facing public route must not wield the service-role key.

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const [{ data: routes, error: rErr }, { data: contacts, error: cErr }] =
    await Promise.all([
      supabase
        .from("shipping_routes")
        .select("*")
        .eq("active", true)
        .order("method"),
      // Fetch all active contacts; the "configured?" filter is applied in JS
      // below (the table is tiny). Filtering server-side on value alone hid
      // QR-only channels — see the .filter() note after this call.
      supabase
        .from("shipping_contacts")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true }),
    ]);

  if (rErr || cErr) {
    return NextResponse.json(
      { error: (rErr ?? cErr)!.message },
      { status: 500 },
    );
  }

  // A channel is configured (and shown to students) when it has a real value
  // OR a QR image. `value = '待配置'` is the migration placeholder; 微信群 /
  // George-bot are QR-only (value stays '待配置', only qr_code_url is set), so
  // filtering on value alone hid them entirely and the uploaded QR never
  // reached students. The admin endpoint returns everything regardless.
  const visibleContacts = (contacts ?? []).filter(
    (c) => c.value !== "待配置" || Boolean(c.qr_code_url),
  );

  return NextResponse.json(
    { routes: routes ?? [], contacts: visibleContacts },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
