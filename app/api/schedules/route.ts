import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";
import { scheduleCreateSchema } from "@/lib/schemas/schedules";

export const POST = authedHandler({
  schema: scheduleCreateSchema,
  handler: async ({ user, supabase, body }) => {
    const { name, semester, courses, preferences, schedule_data } = body;

    const { data, error } = await supabase
      .from("saved_schedules")
      .insert([
        {
          user_id: user.id,
          name: name || "My Schedule",
          semester,
          courses,
          preferences: preferences ?? null,
          schedule_data,
        },
      ])
      .select("id, name, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  },
});

export const GET = authedHandler({
  handler: async ({ user, supabase, request }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await supabase
        .from("saved_schedules")
        .select(
          "id, name, semester, courses, preferences, schedule_data, created_at",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        const status = error.code === "PGRST116" ? 404 : 500;
        const msg = status === 404 ? "Schedule not found" : error.message;
        return NextResponse.json({ error: msg }, { status });
      }
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from("saved_schedules")
      .select("id, name, semester, courses, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  },
});
