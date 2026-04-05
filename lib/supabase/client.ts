import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  client = createBrowserClient(url, key);
  return client;
}

// Lazy backward-compatible export — only creates client when accessed
export const supabase = new Proxy(
  {} as ReturnType<typeof createBrowserClient>,
  {
    get(_target, prop) {
      return (
        createBrowserSupabaseClient() as Record<string | symbol, unknown>
      )[prop];
    },
  },
);
