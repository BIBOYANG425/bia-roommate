// lib/george/mint-code.ts
// Mint a pending_users code, optionally pre-linked to an iMessage handle.
// The Spectrum signup funnel knows the student's phone at signup time, so the
// pending row is born with imessage_handle set — george's by-handle handshake
// greets them on their first "Hi" without needing the code in the message.
// (The profile link still carries ?code= to bind the form to this row.)
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateCode(): string {
  let c = "";
  for (let i = 0; i < 6; i++) c += ALPHABET[randomInt(ALPHABET.length)];
  return c;
}

export async function mintPendingCode(
  admin: SupabaseClient,
  opts: { imessageHandle?: string } = {},
): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    const { error } = await admin.from("pending_users").insert({
      code,
      status: "pending",
      ...(opts.imessageHandle ? { imessage_handle: opts.imessageHandle } : {}),
    });
    if (!error) return code;
    if (!error.message.toLowerCase().includes("duplicate")) {
      throw new Error(`mintPendingCode failed: ${error.message}`);
    }
  }
  throw new Error("mintPendingCode failed: could not generate a unique code");
}

/** Reuse the newest pending row already linked to this handle, if any. */
export async function findPendingByHandle(
  admin: SupabaseClient,
  imessageHandle: string,
): Promise<{ code: string; status: string } | null> {
  const { data, error } = await admin
    .from("pending_users")
    .select("code,status")
    .eq("imessage_handle", imessageHandle)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`findPendingByHandle failed: ${error.message}`);
  return data?.[0] ?? null;
}
