import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// GET /api/events — public list of upcoming active events, each annotated with
// its RSVP count and (if the caller is signed in) whether they've RSVP'd.
//
// Reads via the service-role client: the events / event_attendance tables are
// owned by george (service-role access, no anon RLS), so we read them server-
// side rather than relying on RLS. Only public-safe fields are returned.
export async function GET() {
  const admin = createAdminSupabaseClient();

  // Upcoming + still-relevant (keep events from the last 12h visible as "today").
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: events, error } = await admin
    .from("events")
    .select(
      "id, title, description, date, end_date, location, category, source, source_url, image_url, capacity",
    )
    .eq("status", "active")
    .gte("date", cutoff)
    .order("date", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (events ?? []).map((e) => e.id as string);
  if (ids.length === 0) return NextResponse.json([]);

  // RSVP counts per event.
  const counts = new Map<string, number>();
  const { data: rsvps } = await admin
    .from("event_attendance")
    .select("event_id")
    .eq("source", "rsvp")
    .in("event_id", ids);
  for (const r of rsvps ?? []) {
    const eid = r.event_id as string;
    counts.set(eid, (counts.get(eid) ?? 0) + 1);
  }

  // Which of these the current user has RSVP'd (if signed in).
  const mine = new Set<string>();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: student } = await admin
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (student) {
      const { data: myRsvps } = await admin
        .from("event_attendance")
        .select("event_id")
        .eq("student_id", student.id)
        .eq("source", "rsvp")
        .in("event_id", ids);
      for (const r of myRsvps ?? []) mine.add(r.event_id as string);
    }
  }

  const out = (events ?? []).map((e) => ({
    ...e,
    rsvp_count: counts.get(e.id as string) ?? 0,
    is_rsvped: mine.has(e.id as string),
  }));
  return NextResponse.json(out);
}
