import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CourseRankingSort, RankingsResponse } from "@/lib/course-rating/types";

const SORTS: CourseRankingSort[] = [
  "grading",
  "recent",
  "reviews",
  "difficulty",
  "workload",
];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sortParam = (sp.get("sort") || "grading").toLowerCase();
  const sort: CourseRankingSort = SORTS.includes(sortParam as CourseRankingSort)
    ? (sortParam as CourseRankingSort)
    : "grading";

  const rawPage = parseInt(sp.get("page") || "1", 10);
  const rawPageSize = parseInt(sp.get("pageSize") || "48", 10);

  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, 10_000) : 1;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(rawPageSize, 100)
      : 48;

  const orderMap: Record<
    CourseRankingSort,
    { column: string; ascending: boolean }
  > = {
    grading: { column: "avg_grading", ascending: false },
    recent: { column: "updated_at", ascending: false },
    reviews: { column: "review_count", ascending: false },
    difficulty: { column: "avg_difficulty", ascending: false },
    workload: { column: "avg_workload", ascending: false },
  };

  const { column, ascending } = orderMap[sort];
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createServerSupabaseClient();

  const { data, error, count } = await supabase
    .from("course_rating_aggregates")
    .select("*", { count: "exact" })
    .gte("review_count", 1)
    .order(column, { ascending })
    .order("dept", { ascending: true })
    .order("course_number", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[course-rating] rankings error:", error);
    return NextResponse.json(
      { error: "Failed to load rankings" },
      { status: 500 },
    );
  }

  const body: RankingsResponse = {
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    sort,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=120" },
  });
}
