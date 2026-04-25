import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  category: z.enum(["bug", "feature", "general"]),
  message: z.string().trim().min(10).max(2000),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  path: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await supabase.from("feedback").insert({
    category: parsed.data.category,
    message: parsed.data.message,
    email: parsed.data.email ?? null,
    path: parsed.data.path ?? null,
    user_agent: userAgent,
    user_id: user?.id ?? null,
  });

  if (error) {
    console.error("[feedback] insert error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
