// app/george/api/code/route.ts
// Mints a 6-char alphanumeric onboarding code and inserts a pending_users row.
// Called server-side from /george landing on first visit.
//
// pending_users.code is the primary key; we retry on the rare collision.
// Header last reviewed: 2026-06-08
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateCode(): string {
  let c = "";
  for (let i = 0; i < 6; i++)
    c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}

export async function POST() {
  const supabase = createAdminSupabaseClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    const { error } = await supabase
      .from("pending_users")
      .insert({ code, status: "pending" });
    if (!error) return NextResponse.json({ code });
    if (!error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json(
    { error: "code collision after 3 attempts" },
    { status: 500 },
  );
}
