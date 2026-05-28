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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.GEORGE_BACKEND_URL;
  const adminToken = process.env.GEORGE_ADMIN_TOKEN;

  if (!backendUrl || !adminToken) {
    return NextResponse.json(
      {
        error:
          "GEORGE_BACKEND_URL or GEORGE_ADMIN_TOKEN not configured on the server",
      },
      { status: 500 },
    );
  }

  const body = (await req.json()) as {
    message: string;
    history?: ChatMessage[];
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
  } catch (err) {
    const m = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json(
      { error: `george backend unreachable: ${m}` },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: `george backend ${res.status}: ${errText.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { response?: string; error?: string };
  return NextResponse.json({ response: data.response ?? data.error ?? "" });
}
