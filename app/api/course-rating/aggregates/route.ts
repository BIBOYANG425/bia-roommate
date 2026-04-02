import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AggregatesBatchResponse } from "@/lib/course-rating/types";

const MAX_COURSES = 50;

export async function GET(request: NextRequest) {
  const coursesParam = request.nextUrl.searchParams.get("courses");
  if (!coursesParam) {
    return NextResponse.json(
      { error: "Missing courses parameter" },
      { status: 400 },
    );
  }

  // Parse "CSCI-201,MATH-225" format
  const courseKeys = [
    ...new Set(
      coursesParam
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    ),
  ].slice(0, MAX_COURSES);

  if (courseKeys.length === 0) {
    return NextResponse.json({ aggregates: {} } satisfies AggregatesBatchResponse);
  }

  const supabase = await createServerSupabaseClient();

  // Build filter: each key is "DEPT-NUMBER"
  const pairs = courseKeys
    .map((k) => {
      const idx = k.lastIndexOf("-");
      if (idx <= 0) return null;
      return { dept: k.slice(0, idx), number: k.slice(idx + 1) };
    })
    .filter(Boolean) as { dept: string; number: string }[];

  if (pairs.length === 0) {
    return NextResponse.json({ aggregates: {} } satisfies AggregatesBatchResponse);
  }

  // Fetch all matching aggregates
  // Use OR filter for each (dept, course_number) pair
  const orFilter = pairs
    .map((p) => `and(dept.eq.${p.dept},course_number.eq.${p.number})`)
    .join(",");

  const { data, error } = await supabase
    .from("course_rating_aggregates")
    .select("*")
    .or(orFilter);

  if (error) {
    console.error("[course-rating] aggregates batch error:", error);
    return NextResponse.json(
      { error: "Failed to load aggregates" },
      { status: 500 },
    );
  }

  const aggregates: AggregatesBatchResponse["aggregates"] = {};
  for (const row of data ?? []) {
    aggregates[`${row.dept}-${row.course_number}`] = row;
  }

  return NextResponse.json({ aggregates } satisfies AggregatesBatchResponse, {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}
