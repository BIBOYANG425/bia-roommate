import { createClient } from "@supabase/supabase-js";
import type { Article } from "@biboyang425/bia-shared";

export type PublishedArticleSummary = Pick<
  Article,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "language"
  | "published_at"
  | "cover_image_url"
>;

const ARTICLE_DETAIL_SELECT =
  "id, slug, title, html_clean, excerpt, cover_image_url, language, tags, author_id, status, submitted_at, submitted_by, published_at, published_by, unpublished_at, unpublished_by, created_at, updated_at";

// Public reader uses a plain anon client (no cookies / no user session).
// RLS policy `articles_public_read_published` allows anon SELECT on
// status='published' rows, which is all this surface needs. Using the
// cookie-bound server client made /blog/[slug] flaky: metadata's call
// would succeed but the page-body's identical call would intermittently
// return null, producing a metadata-correct title + not-found body.
let anonClient: ReturnType<typeof createClient> | null = null;
function articlesClient() {
  if (anonClient) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  anonClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonClient;
}

export async function getPublishedArticles(): Promise<
  PublishedArticleSummary[]
> {
  const { data, error } = await articlesClient()
    .from("articles")
    .select("id, slug, title, excerpt, language, published_at, cover_image_url")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []) as PublishedArticleSummary[];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  // Next.js 16 dynamic segments deliver URL-encoded path params (e.g. CJK
  // slugs arrive as "bia-%E6%89%8B%E7%BB%98..." not "bia-手绘食记..."). The
  // DB stores decoded UTF-8, so we have to decode before querying.
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch { /* keep raw on malformed input */ }

  const { data, error } = await articlesClient()
    .from("articles")
    .select(ARTICLE_DETAIL_SELECT)
    .eq("slug", decoded)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as Article | null;
}
