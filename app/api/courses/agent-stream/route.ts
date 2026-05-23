import { NextRequest } from "next/server";
import { runAgentStreaming, type AgentEvent } from "@/lib/course-planner/agent";
import {
  emptyIntakeConstraints,
  type IntakeConstraints,
} from "@/lib/course-planner/agent/types";
import { corsHeaders, handleOptions } from "@/lib/cors";

const VALID_YEARS: Array<IntakeConstraints["year"]> = [
  "freshman",
  "soph",
  "junior",
  "senior",
  "grad",
];

const VALID_GE = new Set([
  "GE-A",
  "GE-B",
  "GE-C",
  "GE-D",
  "GE-E",
  "GE-F",
  "GE-G",
  "GE-H",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw JSON body
function parseIntake(raw: any): IntakeConstraints {
  const out = emptyIntakeConstraints();
  if (!raw || typeof raw !== "object") return out;

  if (
    typeof raw.year === "string" &&
    (VALID_YEARS as string[]).includes(raw.year)
  ) {
    out.year = raw.year as IntakeConstraints["year"];
  }
  if (Array.isArray(raw.geNeeded)) {
    // Cap BEFORE filtering so a malicious client can't OOM us with a giant
    // array. The whitelist filter then drops anything that isn't a known GE.
    out.geNeeded = raw.geNeeded
      .slice(0, 8)
      .filter((g: unknown): g is string => typeof g === "string" && VALID_GE.has(g));
  }
  if (
    typeof raw.profRatingFloor === "number" &&
    Number.isFinite(raw.profRatingFloor) &&
    raw.profRatingFloor >= 0
  ) {
    out.profRatingFloor = Math.min(5, raw.profRatingFloor);
  }
  return out;
}

// Exported for unit tests; not part of the route's runtime API.
export const __test = { parseIntake };

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request) ?? new Response(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request);

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
            event = { ...event, data: filtered };
          }
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        try {
          await runAgentStreaming(
            interests,
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
