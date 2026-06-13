// app/api/squad/draft/route.ts
// Relay to george /squad/draft: converts a one-line description into a
// structured squad-post draft for the submit form's prefill assist.
// Only exports allowed by Next.js 16 route whitelist: HTTP handlers + config.

import { NextRequest, NextResponse } from "next/server";
import { relayDraft } from "./relay";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let text: string;
  try {
    const body = (await req.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const { status, body } = await relayDraft(text);
  return NextResponse.json(body, { status });
}
