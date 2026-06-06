import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/events — public list of upcoming active events, each with its RSVP
// count and (if signed in) whether the caller RSVP'd. All logic lives in the
// SECURITY DEFINER RPC list_events_with_rsvp(); the student app uses only the
// anon/user client (NEVER service-role — bia-roommate has no service-role key).
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("list_events_with_rsvp");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
