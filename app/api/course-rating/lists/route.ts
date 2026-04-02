import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("course_lists")
    .select("id, slug, title, description, display_order, courses")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[course-rating] lists error:", error);
    return NextResponse.json(
      { error: "Failed to load course lists" },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "public, s-maxage=600" },
  });
}
