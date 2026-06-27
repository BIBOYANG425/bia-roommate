"use client";
import Image from "next/image";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";

// Experience · Create · Future — gold / teal / wine.
const CATEGORY_ACCENTS = ["#C9A96E", "#A0D7D1", "#71031f"];

export default function EventsPage() {
  const { language: lang } = useLanguage();
  const e = t.events;

  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
      <SiteNav />

      {/* ─── Hero (dark band, image) ─── */}
      <section className="relative overflow-hidden bg-[#1F1F29] text-white px-6 sm:px-16 pt-36 sm:pt-44 pb-20 sm:pb-28">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hackathon/full-room.jpg"
            alt="A full room of students at a BIA event"
            fill
            className="object-cover opacity-[0.28]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1F1F29]/82 via-[#1F1F29]/85 to-[#1F1F29]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[#E0C089] text-xs uppercase tracking-[0.2em] font-semibold">
            {e.hero.kicker[lang]}
          </p>
          <h1 className="heading-serif mt-5 text-4xl sm:text-6xl leading-[1.05] text-white">
            {e.hero.title[lang]}
          </h1>
          <div className="mt-7 max-w-2xl space-y-5 text-lg leading-8 text-white/85">
            <p>{e.hero.desc1[lang]}</p>
            <p>{e.hero.desc2[lang]}</p>
            <p>{e.hero.desc3[lang]}</p>
          </div>
        </div>
      </section>

      {/* ─── Three kinds of moments: Experience · Create · Future ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white/40 border-y border-black/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8a8a8a]">
            {e.categoriesLabel[lang]}
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {e.categories.map((c, i) => (
              <div
                key={c.title.en}
                className="flex flex-col rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_12px_44px_rgba(0,0,0,0.10)]"
              >
                <span
                  className="h-1.5 w-12 rounded-full"
                  style={{ backgroundColor: CATEGORY_ACCENTS[i] }}
                />
                <h3 className="heading-serif mt-5 text-3xl text-[#171717]">{c.title[lang]}</h3>
                <p className="heading-serif mt-3 text-lg leading-7 text-[#71031f]">
                  {c.tagline[lang]}
                </p>
                <p className="mt-4 text-base leading-7 text-[#4a4a4a]">{c.body[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Upcoming ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C9A96E]" />
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#C9A96E]">
              {e.upcoming.label[lang]}
            </p>
          </div>
          <h2 className="heading-serif mt-3 text-4xl sm:text-5xl leading-tight text-[#171717]">
            {e.upcoming.title[lang]}
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#3a3a3a]">
            {e.upcoming.blurb[lang]}
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {e.upcoming.perks.map((p) => (
              <span
                key={p.en}
                className="rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-1.5 text-sm font-medium text-[#171717]"
              >
                {p[lang]}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {e.upcoming.sessions.map((s) => (
              <div
                key={s.city}
                className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_12px_44px_rgba(0,0,0,0.10)]"
              >
                <p className="heading-serif text-2xl text-[#171717]">{s.city}</p>
                <p className="mt-1.5 text-sm uppercase tracking-wide font-semibold text-[#71031f]">
                  {s.when[lang]}
                </p>
                <p className="mt-2 text-base leading-6 text-[#3a3a3a]">
                  {s.venue[lang] || e.upcoming.venueTBA[lang]}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-12 text-xs uppercase tracking-[0.2em] font-semibold text-[#C9A96E]">
            {e.upcoming.alsoLabel[lang]}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_12px_44px_rgba(0,0,0,0.10)]">
            <div>
              <p className="heading-serif text-2xl text-[#171717]">{e.upcoming.hush.title}</p>
              <p className="mt-1 text-base text-[#3a3a3a]">{e.upcoming.hush.venue[lang]}</p>
            </div>
            <p className="shrink-0 text-sm uppercase tracking-wide font-semibold text-[#71031f]">
              {e.upcoming.hush.date[lang]}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Featured ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white/40 border-y border-black/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8a8a8a]">
            {e.featuredLabel[lang]}
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {e.featured.map((f) => (
              <div
                key={f.image}
                className="flex flex-col overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_44px_rgba(0,0,0,0.10)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={f.image}
                    alt={f.title[lang]}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs uppercase tracking-[0.12em] font-semibold text-[#71031f]">
                    {f.when[lang]}
                  </p>
                  <h3 className="heading-serif mt-2 text-xl leading-7 text-[#171717]">
                    {f.title[lang]}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-[#3a3a3a]">{f.body[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Full archive ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8a8a8a]">
            {e.archiveLabel[lang]}
          </p>
          {e.terms.map((term) => (
            <div key={term.term.en} className="mt-12 first:mt-8">
              <h3 className="heading-serif text-3xl leading-tight text-[#171717]">
                {term.term[lang]}
              </h3>
              <div className="mt-4 border-t border-black/10">
                {term.events.map((ev) => (
                  <div
                    key={ev.title.en}
                    className="flex items-baseline gap-3 border-b border-black/10 py-4 sm:gap-4"
                  >
                    <span className="w-[72px] shrink-0 text-sm uppercase tracking-wide font-semibold text-[#71031f] sm:w-20">
                      {ev.date[lang]}
                    </span>
                    <div className="flex-1">
                      <span className="text-lg leading-snug font-medium text-[#171717]">
                        {ev.title[lang]}
                      </span>
                      <span className="ml-2 text-base text-[#3a3a3a]">— {ev.detail[lang]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Closing: every event is a doorway ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="heading-serif text-2xl sm:text-[32px] leading-[1.4] text-[#171717]">
            {e.more.statement[lang]}
          </p>
          <p className="mt-8 text-base leading-7 text-[#4a4a4a]">
            {e.more.pre[lang]}
            <a
              href="https://www.instagram.com/bia_usc/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#71031f] underline underline-offset-2"
            >
              @bia_usc
            </a>
            {e.more.post[lang]}
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
