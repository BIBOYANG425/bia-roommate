// Admin gating helpers — consolidated-shipping feature + future admin surfaces.
// ADMIN_EMAILS (comma-separated, lowercased) is the allowlist. Routes under
// /api/shipping/admin/* and /shipping/admin pages call requireAdmin() /
// getAuthContext() to gate access. No role table; matches existing posture.
// Header last reviewed: 2026-04-19

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.toLowerCase());
}

export type AuthContext = {
  user: User;
  supabase: SupabaseClient;
  isAdmin: boolean;
};

/**
 * Returns the auth context for the current request, or null if unauthenticated.
 * Use this in server components / API routes that accept both signed-in users
 * and admins (and branch on `isAdmin`).
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, supabase, isAdmin: isAdminEmail(user.email) };
}

/**
 * Admin gate for API routes. Use at the top of a handler:
 *
 *   const gate = await requireAdmin();
 *   if (gate.error) return gate.error;
 *   const { ctx } = gate;
 *
 * Returns either { error: NextResponse } on failure or { ctx: AuthContext }
 * on success. Never returns both.
 */
export async function requireAdmin(): Promise<
  { error: NextResponse; ctx?: never } | { error?: never; ctx: AuthContext }
> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!ctx.isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ctx };
}
