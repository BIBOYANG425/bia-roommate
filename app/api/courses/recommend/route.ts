import { NextRequest } from "next/server";
import { getRecommendations } from "@/lib/course-planner/recommender";
import { corsHeaders, handleOptions } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request) ?? new Response(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request);
  try {
    const body = await request.json();
    const { interests, semester, units } = body ?? {};

    if (typeof interests !== "string" || interests.trim().length < 2) {
      return Response.json(
        { error: "Please describe your interests" },
        { status: 400, headers: cors },
      );
    }

    const baseUrl = request.nextUrl.origin;

    const recommendations = await getRecommendations(
      interests,
      typeof semester === "string" && semester ? semester : "20263",
      baseUrl,
      typeof units === "string" ? units : undefined,
    );

    return Response.json(recommendations, { headers: cors });
  } catch (err) {
    console.error("[recommend] Failed to generate recommendations:", err);
    return Response.json(
      { error: "Failed to generate recommendations" },
      { status: 500, headers: cors },
    );
  }
}
