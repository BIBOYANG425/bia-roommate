import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { enforceIpRateLimit, getClientIp } from "@/lib/api/ip-rate-limit";

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

// The chat UI renders `data.error` as a normal bubble, so 429/413 bodies
// stay in George's bilingual voice instead of reading like infra errors.
const RATE_LIMIT_MESSAGE =
  "汪汪，你问得太快啦 🐕 让我喘口气，一分钟后再来找我吧！\n\nToo many messages at once — George needs a breather. Try again in a minute.";
const MESSAGE_TOO_LONG_MESSAGE =
  "汪... 这条消息太长啦，我的狗脑子装不下 🐕 拆短一点再发给我吧（2000 字以内）。\n\nThat message is too long for George (2,000 characters max) — try splitting it up.";

// Each relayed message drives a full agent loop (LLM + tools) upstream, so
// clamp both the request rate and the message size before forwarding.
const MAX_MESSAGE_CHARS = 2000;

// userId is client-supplied and keyed into Supabase memory upstream. Pre-fix
// the route forwarded it (only lightly regex-validated) verbatim, so a caller
// could pass a victim's iMessage/WeChat handle as userId and read/write THEIR
// George memory. We instead hash the client's stable localStorage id into a
// dedicated `web:` namespace: per-browser conversation continuity is preserved,
// but the derived id can NEVER collide with a real iMessage handle — closing
// the cross-user memory-disclosure vector. Anonymous callers (no client id)
// fall back to a per-IP namespace rather than one shared "web-anon" bucket.
function deriveBackendUserId(clientUserId: unknown, ip: string): string {
  // clientUserId comes from an unvalidated JSON body cast — guard against
  // non-string values (e.g. {"userId": 5}) so .trim() can't throw a 500.
  const seed =
    typeof clientUserId === "string" && clientUserId.trim()
      ? `c:${clientUserId.trim()}`
      : `ip:${ip}`;
  const digest = createHash("sha256")
    .update("george-web-v1")
    .update(seed)
    .digest("hex")
    .slice(0, 32);
  return `web:${digest}`;
}

export async function POST(req: NextRequest) {
  // Per-IP limit before any parsing or upstream work.
  const limited = enforceIpRateLimit(req, {
    name: "george-chat",
    windows: [{ id: "minute", limit: 10, windowMs: 60_000 }],
    message: RATE_LIMIT_MESSAGE,
  });
  if (limited) return limited;

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

  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: MESSAGE_TOO_LONG_MESSAGE },
      { status: 413 },
    );
  }

  const safeUserId = deriveBackendUserId(userId, getClientIp(req));

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
        userId: safeUserId,
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
