import { NextRequest } from "next/server";
import {
  getRecommendations,
  RecommendedCourse,
} from "@/lib/course-planner/recommender";
import { runAgent, AgentRecommendation } from "@/lib/course-planner/agent";
import { corsHeaders, handleOptions } from "@/lib/cors";

function filterByLevel<T extends { number: string }>(
  courses: T[],
  level: string | undefined,
): T[] {
  if (!level) return courses;
  return courses.filter((c) => {
    const num = parseInt(c.number, 10);
    if (isNaN(num)) return true;
    if (level === "lower") return num >= 100 && num <= 299;
    if (level === "upper") return num >= 300 && num <= 499;
    if (level === "graduate") return num >= 500;
    return true;
  });
}

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request) ?? new Response(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request);
  try {
    const body = await request.json();
    const { interests, semester, units, level, mode } = body ?? {};

    if (typeof interests !== "string" || interests.trim().length < 2) {
      return Response.json(
        { error: "Please describe your interests" },
        { status: 400, headers: cors },
      );
    }

    const baseUrl = request.nextUrl.origin;
    const semesterCode =
      typeof semester === "string" && semester ? semester : "20263";
    const unitsFilter = typeof units === "string" ? units : undefined;

    // Try agent mode if API key is configured and not explicitly requesting free mode
    const hasLLMKey = !!(
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.NVIDIA_API_KEY
    );
    let agentFailed = false;

    if (hasLLMKey && mode !== "free") {
      try {
        const result = await runAgent(
          interests,
          semesterCode,
          baseUrl,
          unitsFilter,
        );

        if ("error" in result) {
          if (result.isRejection) {
            return Response.json(
              { error: result.error, isRejection: true, mode: "agent" },
              { status: 400, headers: cors },
            );
          }
          // Agent failed but not a rejection — fall through to free mode
          agentFailed = true;
        } else {
          const filtered = filterByLevel(result.recommendations, level);
          return Response.json(
            { recommendations: filtered, mode: "agent" },
            { headers: cors },
          );
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(
          "[recommend] Agent mode failed, falling back to free:",
          errMsg,
        );
        console.error(
          "[recommend] LLM provider:",
          process.env.ANTHROPIC_API_KEY
            ? "anthropic"
            : process.env.OPENAI_API_KEY
              ? "openai"
              : "nvidia",
        );
        agentFailed = true;
        // Fall through to free mode
      }
    }

    // Free mode: keyword-based matching
    const recommendations = filterByLevel(
      await getRecommendations(interests, semesterCode, baseUrl, unitsFilter),
      level,
    );

    return Response.json(
      { recommendations, mode: "free", agentFailed },
      { headers: cors },
    );
  } catch (err) {
    console.error("[recommend] Failed to generate recommendations:", err);
    return Response.json(
      { error: "Failed to generate recommendations" },
      { status: 500, headers: cors },
    );
  }
}
