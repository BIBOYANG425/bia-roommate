import Image from "next/image";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/articles";

export const revalidate = 60;

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
    <main className="min-h-screen bg-[#F9FAF7] text-[#171717]">
      <section className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
        <div className="mb-14 border-b border-black/10 pb-10">
          <Link
            href="/"
            className="mb-8 inline-flex text-sm font-medium text-[#646464] transition-colors hover:text-[#171717]"
          >
            Back to BIA
          </Link>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#A0D7D1]">
            BIA Editorial
          </p>
          <h1 className="heading-serif max-w-2xl text-5xl leading-tight text-[#171717] sm:text-6xl">
            Latest Dispatches
          </h1>
        </div>

        {articles.length === 0 ? (
          <p className="text-base text-[#646464]">No posts yet.</p>
        ) : (
          <ul className="space-y-12">
            {articles.map((article) => (
              <li
                key={article.id}
                className="border-b border-black/10 pb-12 last:border-0"
              >
                <Link href={`/blog/${article.slug}`} className="group block">
                  {article.cover_image_url && (
                    <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-black/5 bg-gray-100">
                      <Image
                        src={article.cover_image_url}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 768px, calc(100vw - 48px)"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <h2 className="heading-serif text-3xl font-medium leading-snug text-[#2C2C2C] transition-colors group-hover:text-[#6CB7AF] sm:text-4xl">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#646464]">
                      {article.excerpt}
                    </p>
                  )}
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#A0D7D1]">
                    {[formatDate(article.published_at), languageLabel(article.language)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
