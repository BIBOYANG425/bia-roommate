"use client";
import Image from "next/image";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";

const LENS_IMAGES = [
  "/cultural-bridge.jpg",
  "/tech-innovation.jpg",
  "/career-development.jpg",
];

export default function AboutPage() {
  const { language: lang } = useLanguage();
  const a = t.about;

  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
      <SiteNav />

      {/* ─── Hero (dark band, image) ─── */}
      <section className="relative overflow-hidden bg-[#1F1F29] text-white px-6 sm:px-16 pt-40 pb-24 sm:pt-48 sm:pb-32">
        <div className="absolute inset-0 z-0">
          <Image
            src="/globe-community.jpg"
            alt="Hand holding a glowing globe — bridging global communities"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1F1F29] via-[#1F1F29]/80 to-[#1F1F29]" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-[13px] uppercase tracking-[0.2em] text-[#E0C089] font-semibold">
            {a.hero.kicker[lang]}
          </p>
          <h1 className="heading-serif mt-6 text-white text-[40px] sm:text-6xl leading-[1.05] tracking-tight">
            {a.hero.title[lang]}
          </h1>
          <p className="mt-7 max-w-3xl text-lg sm:text-xl leading-8 text-white/85">
            {a.hero.desc[lang]}
          </p>
        </div>
      </section>

      {/* ─── The entry point ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-[13px] uppercase tracking-[0.2em] text-[#8a8a8a] font-semibold">
            {a.entry.kicker[lang]}
          </p>
          <div className="mt-7 space-y-7 text-lg leading-8 text-[#3a3a3a]">
            <p>{a.entry.p1[lang]}</p>
            <p className="heading-serif border-l-[3px] border-[#71031f] pl-6 text-2xl sm:text-[28px] leading-9 text-[#171717]">
              {a.entry.quote[lang]}
            </p>
            <p className="heading-serif text-3xl sm:text-4xl text-[#71031f]">
              {a.entry.statement[lang]}
            </p>
            <p>{a.entry.p2[lang]}</p>
            <p>{a.entry.p3[lang]}</p>
          </div>
        </div>
      </section>

      {/* ─── Three lenses ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white border-y border-black/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-[13px] uppercase tracking-[0.2em] text-[#8a8a8a] font-semibold">
            {a.lenses.kicker[lang]}
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#3a3a3a]">
            {a.lenses.intro[lang]}
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {a.lenses.items.map((l, i) => (
              <div
                key={l.n.en}
                className="overflow-hidden rounded-[28px] border border-black/5 bg-[#F9FAF7] shadow-[0_12px_44px_rgba(0,0,0,0.10)]"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={LENS_IMAGES[i]}
                    alt={l.n[lang]}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-8">
                  <h3 className="heading-serif text-3xl text-[#171717]">{l.n[lang]}</h3>
                  <p className="mt-2 text-[12px] uppercase tracking-[0.12em] text-[#71031f] font-semibold">
                    {l.role[lang]}
                  </p>
                  <p className="mt-4 text-base leading-7 text-[#4a4a4a]">{l.body[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The bigger questions ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-[13px] uppercase tracking-[0.2em] text-[#8a8a8a] font-semibold">
            {a.questions.kicker[lang]}
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#3a3a3a]">
            {a.questions.intro[lang]}
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {a.questions.items.map((q) => (
              <div
                key={q.en}
                className="rounded-[28px] border border-black/5 bg-white shadow-[0_12px_44px_rgba(0,0,0,0.10)] p-8 heading-serif text-xl sm:text-2xl leading-8 text-[#171717]"
              >
                {q[lang]}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── By the numbers ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white border-y border-black/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-[13px] uppercase tracking-[0.2em] text-[#8a8a8a] font-semibold">
            {a.numbers.kicker[lang]}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {a.numbers.items.map((s) => (
              <div
                key={s.label.en}
                className="rounded-[28px] border border-black/5 bg-[#F9FAF7] shadow-[0_12px_44px_rgba(0,0,0,0.10)] p-8"
              >
                <p className="heading-serif text-5xl text-[#71031f]">{s.value}</p>
                <p className="mt-3 text-base leading-6 text-[#4a4a4a]">{s.label[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Closing / CTA (dark band) ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-[#1F1F29] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="heading-serif text-2xl sm:text-3xl md:text-4xl leading-[1.3] text-white">
            {a.closing.statement[lang]}
          </p>
          <Link
            href="/join"
            className="mt-10 inline-flex items-center gap-2 bg-white text-[#1F1F29] px-10 py-4 rounded-[12px] text-sm font-bold uppercase tracking-wide hover:bg-white/90 transition-all duration-200 min-h-[52px]"
          >
            {a.closing.cta[lang]}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
