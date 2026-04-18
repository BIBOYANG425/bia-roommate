// Service-role Supabase client — BYPASSES Row-Level Security.
//
// USAGE RULE: Only import this inside API route handlers that have already
// called `requireAdmin()` from lib/admin.ts. Never import from a client
// component, a middleware, or any code path the browser can reach. The
// service-role key grants unrestricted access to every table and bucket.
//
// For ordinary user-scoped reads/writes, use createServerSupabaseClient()
// from lib/supabase/server.ts (goes through the user's anon JWT + RLS).
// Header last reviewed: 2026-04-19

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Returns a singleton service-role Supabase client. Cached per process.
 * Throws if SUPABASE_SERVICE_ROLE_KEY isn't set — this is intentional; an
 * admin route that can't build this client should 500, not silently
 * degrade to an anon client and look like it worked.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — required for admin routes",
    );
  }

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
