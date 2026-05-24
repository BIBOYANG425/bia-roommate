import { createServerSupabaseClient } from "@/lib/supabase/server";
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

export async function getPublishedArticles(): Promise<
  PublishedArticleSummary[]
> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, slug, title, excerpt, language, published_at, cover_image_url",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []) as PublishedArticleSummary[];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as Article | null;
}
