import { ArticleRenderer } from "@biboyang425/bia-shared/react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/articles";
import { SITE } from "@/lib/seo";

// Render at request time so CI's placeholder Supabase env doesn't trip
// build-time prerender. Production response is fast — one anon query
// against an indexed `slug` column.
export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function languageLabel(language: string) {
  return language === "zh" ? "中文" : "English";
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Not found · BIA Blog",
    };
  }

  return {
    title: `${article.title} · BIA Blog`,
    description: article.excerpt ?? undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      images: article.cover_image_url
        ? [{ url: article.cover_image_url, alt: article.title }]
        : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  return (
    <main className="min-h-screen bg-[#F9FAF7] text-[#171717]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            ...(article.excerpt ? { description: article.excerpt } : {}),
            ...(article.cover_image_url ? { image: article.cover_image_url } : {}),
            datePublished: article.published_at,
            inLanguage: article.language,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE.url}/blog/${slug}`,
            },
            author: { "@type": "Organization", name: SITE.fullName, url: SITE.url },
            publisher: {
              "@type": "Organization",
              name: SITE.fullName,
              logo: { "@type": "ImageObject", url: `${SITE.url}/icon.png` },
            },
          }),
        }}
      />
      <article className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <Link
          href="/blog"
          className="mb-10 inline-flex text-sm font-medium text-[#646464] transition-colors hover:text-[#171717]"
        >
          Back to Blog
        </Link>

        <header className="mb-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#A0D7D1]">
            {[formatDate(article.published_at), languageLabel(article.language)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1 className="heading-serif text-5xl leading-tight text-[#171717] sm:text-6xl">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#646464]">
              {article.excerpt}
            </p>
          )}
          {article.cover_image_url && (
            <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-black/5 bg-gray-100">
              <Image
                src={article.cover_image_url}
                alt=""
                fill
                priority
                sizes="(min-width: 768px) 768px, calc(100vw - 48px)"
                className="object-cover"
              />
            </div>
          )}
        </header>

        <ArticleRenderer
          html={article.html_clean}
          className="prose prose-neutral max-w-none prose-headings:heading-serif prose-headings:text-[#171717] prose-a:text-[#0081C0]"
        />
      </article>
    </main>
  );
}
