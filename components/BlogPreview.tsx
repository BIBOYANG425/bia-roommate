"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Lang } from "@/lib/i18n";

interface BlogPreviewArticle {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
}

interface BlogPreviewProps {
  lang: Lang;
  heading: string;
  byline: string;
}

const TILTS = [
  { tilt: "-2deg", offset: "0px" },
  { tilt: "1.5deg", offset: "-8px" },
  { tilt: "-1deg", offset: "4px" },
];

export function BlogPreview({ lang, heading, byline }: BlogPreviewProps) {
  const [articles, setArticles] = useState<BlogPreviewArticle[] | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadArticles() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase
          .from("articles")
          .select("id, slug, title, cover_image_url")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(3);

        if (isMounted) {
          setArticles((data ?? []) as BlogPreviewArticle[]);
        }
      } catch {
        if (isMounted) setArticles([]);
      }
    }

    loadArticles();

    return () => {
      isMounted = false;
    };
  }, []);

  if (articles === null || articles.length === 0) return null;

  return (
    <section
      className="mx-auto max-w-7xl px-6 py-24 sm:px-16 sm:py-32"
      aria-label={lang === "zh" ? "BIA 最新动态" : "BIA latest dispatches"}
    >
      <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="heading-serif text-4xl text-[#171717] sm:text-5xl">
          {heading}
        </h2>
        <Link
          href="/blog"
          className="text-sm font-semibold uppercase tracking-[0.16em] text-[#A0D7D1] transition-colors hover:text-[#6CB7AF]"
        >
          {lang === "zh" ? "查看全部" : "View all"}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
        {articles.map((article, index) => {
          const tilt = TILTS[index] ?? TILTS[0];

          return (
            <Link
              key={article.id}
              href={`/blog/${article.slug}`}
              className="group flex flex-col tilted-card"
              style={
                {
                  "--tilt": tilt.tilt,
                  "--offset": tilt.offset,
                  transform: "rotate(var(--tilt)) translateY(var(--offset))",
                } as CSSProperties
              }
            >
              <div className="relative mb-6 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-black/5 bg-gray-100 shadow-lg">
                {article.cover_image_url ? (
                  <Image
                    src={article.cover_image_url}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 33vw, calc(100vw - 48px)"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F5F1EA] to-[#DDEDEA] p-8">
                    <span className="heading-serif text-center text-2xl font-medium leading-snug text-[#4FAFA6]">
                      {article.title}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="heading-serif mb-3 text-2xl font-medium leading-snug text-[#2C2C2C] transition-colors group-hover:text-[#A0D7D1]">
                {article.title}
              </h3>
              <p className="mt-auto text-sm font-medium uppercase tracking-wide text-[#A0D7D1]">
                {byline}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
