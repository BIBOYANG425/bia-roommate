import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/course-rating/validation";
import type {
  CourseReview,
  CourseAggregate,
  ReviewsResponse,
} from "@/lib/course-rating/types";

const REVIEW_COLUMNS =
  "id, dept, course_number, professor, term, difficulty, workload, grading, gpa, comment, created_at";

export async function GET(request: NextRequest) {
  const dept = request.nextUrl.searchParams.get("dept")?.toUpperCase();
  const number = request.nextUrl.searchParams.get("number");
  const professor = request.nextUrl.searchParams.get("professor");

  if (!dept || !number) {
    return NextResponse.json(
      { error: "Missing dept or number" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();

  // Check if user is logged in (for isOwn flag)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch reviews and aggregate in parallel
  let reviewQuery = supabase
    .from("course_reviews")
    .select(REVIEW_COLUMNS)
    .eq("dept", dept)
    .eq("course_number", number)
    .order("created_at", { ascending: false })
    .limit(50);

  if (professor) {
    reviewQuery = reviewQuery.eq("professor", professor);
  }

  const [reviewsResult, aggregateResult, ownResult] = await Promise.allSettled([
    reviewQuery,
    supabase
      .from("course_rating_aggregates")
      .select("*")
      .eq("dept", dept)
      .eq("course_number", number)
      .single(),
    user
      ? supabase
          .from("course_reviews")
          .select("id")
          .eq("dept", dept)
          .eq("course_number", number)
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  // Check for failures
  if (
    reviewsResult.status === "rejected" ||
    (reviewsResult.status === "fulfilled" && reviewsResult.value.error)
  ) {
    console.error(
      "[course-rating] reviews query failed:",
      reviewsResult.status === "rejected"
        ? reviewsResult.reason
        : reviewsResult.value.error,
    );
    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 },
    );
  }

  const reviews: CourseReview[] = [];
  if (reviewsResult.value.data) {
    const ownIds = new Set<string>();
    if (ownResult.status === "fulfilled") {
      const ownData = "data" in ownResult.value ? ownResult.value.data : [];
      if (Array.isArray(ownData)) {
        for (const r of ownData) ownIds.add(r.id);
      }
    }
    for (const r of reviewsResult.value.data) {
      reviews.push({ ...r, isOwn: ownIds.has(r.id) });
    }
  }

  const aggregate: CourseAggregate | null =
    aggregateResult.status === "fulfilled" &&
    !aggregateResult.value.error &&
    aggregateResult.value.data
      ? aggregateResult.value.data
      : null;

  const response: ReviewsResponse = { reviews, aggregate };
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": user
        ? "private, no-cache, no-store"
        : "public, s-maxage=60",
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  // Rate limit: max 10 reviews per hour
  const { count } = await supabase
    .from("course_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());

  if (count && count >= 10) {
    return NextResponse.json(
      { error: "Too many reviews. Try again later." },
      { status: 429 },
    );
  }

  const { data, error } = await supabase
    .from("course_reviews")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You already reviewed this course for this term" },
        { status: 409 },
      );
    }
    console.error("[course-rating] POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Missing id parameter" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("course_reviews")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[course-rating] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: true });
}
