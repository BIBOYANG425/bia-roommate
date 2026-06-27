"use client";

// Client wrapper for the blog index so the page chrome (kicker, title, subtitle,
// date + language labels) responds to the language toggle. Article titles and
// excerpts come straight from the DB in whatever language they were written.
import Image from "next/image";
import Link from "next/link";
import type { PublishedArticleSummary } from "@/lib/articles";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";

export default function BlogIndex({ articles }: { articles: PublishedArticleSummary[] }) {
  const { language: lang } = useLanguage();
  const b = t.blog;

  const formatDate = (value: string | null) => {
    if (!value) return "";
    return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  };
  const languageLabel = (articleLang: string) =>
    articleLang === "zh" ? b.langZh[lang] : b.langEn[lang];

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
      {/* ─── Header ─── */}
      <div className="mb-16 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#4F938C]">
          {b.kicker[lang]}
        </p>
        <h1 className="heading-serif text-5xl leading-[1.05] text-[#171717] sm:text-6xl">
          {b.title[lang]}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#3a3a3a]">
          {b.subtitle[lang]}
        </p>
      </div>

      {/* ─── Posts ─── */}
      {articles.length === 0 ? (
        <p className="text-center text-base text-[#3a3a3a]">{b.empty[lang]}</p>
      ) : (
        <ul className="space-y-8">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                href={`/blog/${article.slug}`}
                className="group block overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_44px_rgba(0,0,0,0.10)] transition-shadow duration-300 hover:shadow-[0_18px_56px_rgba(0,0,0,0.14)]"
              >
                {article.cover_image_url && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                    <Image
                      src={article.cover_image_url}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 768px, calc(100vw - 48px)"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="p-8 sm:p-10">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#4F938C]">
                    {[formatDate(article.published_at), languageLabel(article.language)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <h2 className="heading-serif text-3xl font-medium leading-snug text-[#171717] transition-colors group-hover:text-[#6CB7AF] sm:text-4xl">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#3a3a3a]">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
