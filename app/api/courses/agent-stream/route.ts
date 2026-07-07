import { NextRequest } from "next/server";
import { runAgentStreaming, type AgentEvent } from "@/lib/course-planner/agent";
import { corsHeaders, handleOptions } from "@/lib/cors";
import { parseIntake } from "./intake";
import { checkAgentRateLimit, clientIpFromHeaders } from "./rate-limit";

/** Hard cap on the freeform interests string. Defense in depth vs the
 *  interpreter's own slice(0,500) and the recommender prompt cap. */
const MAX_INTERESTS_LEN = 500;

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request) ?? new Response(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request);

  // Per-IP sliding-window abuse guard — this is the most expensive route in the
  // app (multiple LLM calls + catalog/RMP/Reddit fan-out per request).
  const ip = clientIpFromHeaders(request.headers);
  const rl = checkAgentRateLimit(`agent-stream:${ip}`);
  if (!rl.allowed) {
    return Response.json(
      {
        error:
          "Too many AI searches in a short window — give it a minute and try again.",
      },
      {
        status: 429,
        headers: { ...cors, "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  try {
    const body = await request.json();
    const { interests, semester, units, level, thinking, intake } = body ?? {};
    const intakeConstraints = parseIntake(intake);

    if (typeof interests !== "string" || interests.trim().length < 2) {
      return Response.json(
        { error: "Please describe your interests" },
        { status: 400, headers: cors },
      );
    }

    // Cap length before it reaches the agent (interpreter + recommender both
    // build prompts from this string).
    const cappedInterests = interests.slice(0, MAX_INTERESTS_LEN);

    const hasLLMKey = !!(
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.NVIDIA_API_KEY
    );
    if (!hasLLMKey) {
      return Response.json(
        { error: "AI search is not configured" },
        { status: 503, headers: cors },
      );
    }

    const baseUrl = request.nextUrl.origin;
    const semesterCode =
      typeof semester === "string" && semester ? semester : "20263";
    const unitsFilter = typeof units === "string" ? units : undefined;

    const levelFilter = typeof level === "string" ? level : undefined;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function emit(event: AgentEvent) {
          // Filter recommendations by level if specified
          if (levelFilter && event.type === "results") {
            const filtered = event.data.filter((r) => {
              const num = parseInt(r.number, 10);
              if (isNaN(num)) return true;
              if (levelFilter === "lower") return num >= 100 && num <= 299;
              if (levelFilter === "upper") return num >= 300 && num <= 499;
              if (levelFilter === "graduate") return num >= 500;
              return true;
            });
            // Level chip wiped out a non-empty ranking → explicit empty state
            // so the UI shows "loosen your filters" instead of hanging dots.
            if (filtered.length === 0 && event.data.length > 0) {
              event = {
                type: "no_results",
                message:
                  "No ranked courses match your LEVEL filter. Try a different level.",
              };
            } else {
              event = { ...event, data: filtered };
            }
          }
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        try {
          await runAgentStreaming(
            cappedInterests,
            semesterCode,
            baseUrl,
            unitsFilter,
            !!thinking,
            emit,
            intakeConstraints,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          emit({ type: "error", message: msg });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...cors,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[agent-stream] Failed:", err);
    return Response.json(
      { error: "Failed to start agent" },
      { status: 500, headers: cors },
    );
  }
}
