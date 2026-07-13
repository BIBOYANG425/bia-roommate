import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authedHandler } from "@/lib/api/authed-handler";
import { reviewSchema } from "@/lib/course-rating/validation";
import type {
  CourseReview,
  CourseAggregate,
  ReviewsResponse,
} from "@/lib/course-rating/types";

const REVIEW_COLUMNS =
  "id, dept, course_number, professor, term, difficulty, workload, grading, gpa, comment, created_at";

// GET is intentionally NOT wrapped with authedHandler — it serves anonymous
// readers and only uses the user identity to flag `isOwn` on results.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

export const POST = authedHandler({
  schema: reviewSchema,
  // Rate limit stays DB-based (count last hour) — the in-memory checkRateLimit
  // can't tell us "did this user post 10 reviews across cold starts".
  handler: async ({ user, supabase, body }) => {
    const { count, error: countError } = await supabase
      .from("course_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString());

    if (countError) {
      console.error("[course-rating] rate-limit query failed:", countError);
      return NextResponse.json(
        { error: "Failed to verify review rate limit" },
        { status: 500 },
      );
    }

    if (count && count >= 10) {
      return NextResponse.json(
        { error: "Too many reviews. Try again later." },
        { status: 429 },
      );
    }

    const { data, error } = await supabase
      .from("course_reviews")
      .insert({ user_id: user.id, ...body })
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
  },
});

export const DELETE = authedHandler({
  handler: async ({ user, supabase, request }) => {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("course_reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    if (error) {
      console.error("[course-rating] DELETE error:", error);
      return NextResponse.json(
        { error: "Failed to delete review" },
        { status: 500 },
      );
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  },
});
