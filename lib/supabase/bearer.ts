// Bearer-token Supabase auth for non-cookie clients (the Chrome extension).
// The extension holds a Supabase access token and sends it as
// `Authorization: Bearer <jwt>`. createBearerSupabaseClient builds a stateless
// client whose requests carry that token so RLS auth.uid() resolves — the
// bearer counterpart of the cookie client used on the web.
//
// Header last reviewed: 2026-06-17

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Extract a Bearer token from the request's Authorization header, or null. */
export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** Stateless Supabase client whose requests carry the given user access token. */
export function createBearerSupabaseClient(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
