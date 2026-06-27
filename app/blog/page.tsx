import Image from "next/image";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { getPublishedArticles } from "@/lib/articles";

// Render at request time so CI's placeholder Supabase env doesn't trip
// build-time prerender. Production response is still cheap (one anon
// query) and the public client memoizes the connection.
export const dynamic = "force-dynamic";

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

export default async function BlogIndexPage() {
  const articles = await getPublishedArticles();

  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
      <SiteNav />

      <section className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
        {/* ─── Header ─── */}
        <div className="mb-16 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#4F938C]">
            BIA Editorial
          </p>
          <h1 className="heading-serif text-5xl leading-[1.05] text-[#171717] sm:text-6xl">
            Latest Dispatches
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#3a3a3a]">
            Stories, notes, and updates from the BIA community.
          </p>
        </div>

        {/* ─── Posts ─── */}
        {articles.length === 0 ? (
          <p className="text-center text-base text-[#3a3a3a]">No posts yet.</p>
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

      <SiteFooter />
    </div>
  );
}
