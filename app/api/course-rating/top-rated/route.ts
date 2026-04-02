import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const rawLimit = parseInt(
    request.nextUrl.searchParams.get("limit") || "20",
    10,
  );
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 50) : 20;
  const sort = request.nextUrl.searchParams.get("sort") || "rating";

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("course_rating_aggregates")
    .select("*")
    .gte("review_count", 1);

  if (sort === "recent") {
    query = query.order("updated_at", { ascending: false });
  } else {
    // "rating" sort: highest grading first (easiest graders / best rated)
    query = query.order("avg_grading", { ascending: false });
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error("[course-rating] top-rated error:", error);
    return NextResponse.json(
      { error: "Failed to load top-rated courses" },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}
