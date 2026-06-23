import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

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

// User-facing message returned (as a normal 200 reply) whenever the backend
// is unreachable or returns an error. Keeps George in character instead of
// surfacing a raw 502 to the chat UI. Bilingual to match the iMessage voice.
const SERVICE_UNAVAILABLE_MESSAGE =
  "汪... 我现在正在调教中 👻🐕\n\nGeorge is currently being fine-tuned. The team is sharpening my replies and rolling out new tools. Try me again in a few minutes — I'll be right back.";

// Returned (as a 429, but the chat client reads `response` regardless of HTTP
// status) when one IP exceeds the per-minute message cap. Keeps George in
// character instead of surfacing a raw throttling error.
const RATE_LIMITED_MESSAGE =
  "汪！你说得太快啦 🐕 给我几秒钟喘口气，马上回来～\n\nWhoa — too many messages too fast. Give me a few seconds and try again.";

function getClientIp(req: NextRequest): string {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (first) return first;
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Confine every web-relay caller to a dedicated `web:` identity namespace.
// Pre-fix, this route forwarded the client-supplied userId verbatim, so anyone
// could pass a victim's iMessage/WeChat handle as userId and read/write THEIR
// George memory. We hash the client's stable localStorage id into the web
// namespace: per-browser conversation continuity is preserved, but the derived
// id can never collide with a real iMessage handle — closing the cross-user
// memory-disclosure vector. Anonymous callers (no client id) fall back to a
// per-IP namespace instead of a single shared bucket.
function deriveBackendUserId(clientUserId: string | undefined, ip: string): string {
  const seed =
    clientUserId && clientUserId.trim() ? `c:${clientUserId.trim()}` : `ip:${ip}`;
  const digest = createHash("sha256")
    .update("george-web-v1")
    .update(seed)
    .digest("hex")
    .slice(0, 32);
  return `web:${digest}`;
}

export async function POST(req: NextRequest) {
  // Abuse guard: this relay forwards to a paid LLM backend. Rate-limit per IP
  // and never call the backend for a throttled caller, so the endpoint can't be
  // scripted for unbounded LLM cost. Limit is generous (campus NAT shares one
  // IP) but still caps automated abuse to 30 msg/min/IP vs. unbounded.
  const ip = getClientIp(req);
  if (!checkRateLimit(`george-chat:${ip}`, { limit: 30, windowMs: 60_000 }).allowed) {
    return NextResponse.json(
      { response: RATE_LIMITED_MESSAGE },
      { status: 429 },
    );
  }

  const backendUrl = process.env.GEORGE_BACKEND_URL;
  const adminToken = process.env.GEORGE_ADMIN_TOKEN;

  // If env vars aren't configured we treat that the same as "backend down"
  // for the user — they shouldn't see infra errors.
  if (!backendUrl || !adminToken) {
    return NextResponse.json({ response: SERVICE_UNAVAILABLE_MESSAGE });
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
        userId: deriveBackendUserId(userId, ip),
        platform: "imessage",
        text: message,
      }),
    });
  } catch {
    // Network failure means the Mac is asleep, cloudflared restarted,
    // or the tunnel hostname rotated. Show the fine-tuning message.
    return NextResponse.json({ response: SERVICE_UNAVAILABLE_MESSAGE });
  }

  if (!res.ok) {
    // Backend reachable but errored (most often 5xx from the Express
    // backend or a 502 from Cloudflare). Same friendly message.
    return NextResponse.json({ response: SERVICE_UNAVAILABLE_MESSAGE });
  }

  const data = (await res.json()) as { response?: string; error?: string };
  // If the backend returned an empty response or an error string, treat
  // that as "service hiccup" rather than show empty bubbles.
  const reply = data.response ?? data.error ?? "";
  if (!reply.trim()) {
    return NextResponse.json({ response: SERVICE_UNAVAILABLE_MESSAGE });
  }
  return NextResponse.json({ response: reply });
}
