// Resolve the requesting user from either a Supabase Bearer token (the Chrome
// extension) or the cookie session (the web), returning the user plus a
// Supabase client bound to that identity so RLS works on reads/writes.
//
// Header last reviewed: 2026-06-17

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBearerToken, createBearerSupabaseClient } from "@/lib/supabase/bearer";

export async function resolveAuth(
  request: Request,
): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const token = getBearerToken(request);
  if (token) {
    const supabase = createBearerSupabaseClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    return user ? { user, supabase } : null;
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { user, supabase } : null;
}
