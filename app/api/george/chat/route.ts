import { NextRequest, NextResponse } from "next/server";

// Forwards web-chat requests to the George Express backend (the same backend
// that powers iMessage and WeChat). The backend lives in bia-roommate/george/
// and runs through Cloudflare Tunnel to give Vercel a public URL.
//
// Why a relay instead of calling Anthropic directly:
// - Web chat must have parity with iMessage: same persona (BIA senior voice
//   distilled from founder's WeChat), same Supabase memory, same 21 tools
//   (search_events, get_course_reviews, recommend_courses, plan_schedule,
//   search_roommates, search_sublets, campus_knowledge, etc.).
// - Reimplementing that 1500-line agent loop inside a Next.js serverless
//   function is a rabbit hole. Relay keeps a single source of truth.
//
// What requires the backend up:
// - bia-roommate/george/ Express server listening on :3001
// - cloudflared quick tunnel exposing :3001 to the public internet
// - GEORGE_BACKEND_URL and GEORGE_ADMIN_TOKEN env vars set on Vercel

export const runtime = "nodejs";
export const maxDuration = 30;

// User-facing message returned (as a normal 200 reply) whenever the backend
// is unreachable or returns an error. Keeps George in character instead of
// surfacing a raw 502 to the chat UI. Bilingual to match the iMessage voice.
const SERVICE_UNAVAILABLE_MESSAGE =
  "汪... 我现在正在调教中 👻🐕\n\nGeorge is currently being fine-tuned. The team is sharpening my replies and rolling out new tools. Try me again in a few minutes — I'll be right back.";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.GEORGE_BACKEND_URL;
  const adminToken = process.env.GEORGE_ADMIN_TOKEN;

  // If env vars aren't configured we treat that the same as "backend down"
  // for the user — they shouldn't see infra errors.
  if (!backendUrl || !adminToken) {
    return NextResponse.json(
      { response: SERVICE_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }

  const body = (await req.json()) as {
    message: string;
    userId?: string;
  };
  const { message, userId } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // The backend pulls history from Supabase keyed on userId, so we don't
  // forward the client history. We pass a stable userId so the conversation
  // stays coherent across turns.
  let res: Response;
  try {
    res = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: userId || "web-anon",
        platform: "imessage",
        text: message,
      }),
    });
  } catch {
    // Network failure means the Mac is asleep, cloudflared restarted,
    // or the tunnel hostname rotated. Show the fine-tuning message.
    return NextResponse.json(
      { response: SERVICE_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }

  if (!res.ok) {
    // Backend reachable but errored (most often 5xx from the Express
    // backend or a 502 from Cloudflare). Same friendly message.
    return NextResponse.json(
      { response: SERVICE_UNAVAILABLE_MESSAGE },
      { status: 502 },
    );
  }

  let data: { response?: string; error?: string };
  try {
    data = (await res.json()) as { response?: string; error?: string };
  } catch {
    return NextResponse.json(
      { response: SERVICE_UNAVAILABLE_MESSAGE },
      { status: 502 },
    );
  }
  // If the backend returned an empty response or an error string, treat
  // that as "service hiccup" rather than show empty bubbles.
  const reply = data.response ?? data.error ?? "";
  if (!reply.trim()) {
    return NextResponse.json(
      { response: SERVICE_UNAVAILABLE_MESSAGE },
      { status: 502 },
    );
  }
  return NextResponse.json({ response: reply });
}
