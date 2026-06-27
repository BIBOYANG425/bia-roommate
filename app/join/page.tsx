"use client";
import { useState } from "react";
import Image from "next/image";
import ScrollFloat from "@/components/ScrollFloat";
import BorderGlow from "@/components/BorderGlow";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";

// The BIA 2026 membership application (Google Form). Both Apply CTAs open it in
// a new tab; the navbar "Join Us" routes to this page (handled by SiteNav).
const APPLY_URL = "https://forms.gle/7U9PARWtecUoVFgF6";

const TIER_TAG = [
  "bg-black/5 text-[#646464]",
  "bg-[#A0D7D1] text-[#1F1F29]",
  "bg-[#C9A96E] text-[#1F1F29]",
];

function ArrowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className="transition-transform duration-200 group-hover:translate-x-1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 7H13M13 7L7 1M13 7L7 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mt-0.5 shrink-0"
    >
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="#71031f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressArrow() {
  return (
    <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
      <path d="M0 6H36M36 6L30 1M36 6L30 11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function JoinPage() {
  const { language: lang } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
      <SiteNav />

      {/* ─── Hero (dark band) ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-[#1F1F29] text-white">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hackathon/group-photo.jpg"
            alt="BIA members"
            fill
            className="object-cover opacity-25 bg-[#1F1F29]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1F1F29] via-[#1F1F29]/70 to-[#1F1F29]" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <p className="text-[#A0D7D1] text-xs uppercase tracking-[0.3em] font-semibold mb-8">
            {t.join.hero.badge[lang]}
          </p>
          <ScrollFloat
            animateOnMount
            mountDelay={0.3}
            animationDuration={0.8}
            ease="back.out(1.7)"
            stagger={0.05}
            textClassName="heading-serif text-white text-[15vw] sm:text-[120px] leading-[0.9] tracking-tight"
          >
            {t.join.hero.title[lang]}
          </ScrollFloat>
          <p className="text-white/60 text-lg sm:text-xl mt-8 max-w-xl mx-auto font-light leading-relaxed">
            {t.join.hero.desc[lang]}
          </p>
          <div className="mt-10 inline-block">
            <BorderGlow
              edgeSensitivity={5}
              glowColor="170 60 75"
              backgroundColor="transparent"
              borderRadius={10}
              glowRadius={35}
              glowIntensity={1.2}
              coneSpread={35}
              animated
              colors={["#A0D7D1", "#6DD4D4", "#ffffff"]}
            >
              <a
                href={APPLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white text-[#1F1F29] px-10 py-4 rounded-[10px] text-sm font-bold tracking-wide uppercase hover:bg-white/90 transition-all duration-200 inline-flex items-center gap-3 min-h-[52px]"
              >
                {t.join.hero.cta[lang]}
                <ArrowIcon />
              </a>
            </BorderGlow>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/60" />
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {t.join.stats.map((stat, i) => (
            <div key={i}>
              <p className="heading-serif text-4xl sm:text-5xl text-[#171717] mb-2">{stat.value}</p>
              <p className="text-sm text-[#999]">{stat.label[lang]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Structure / tiers ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-serif text-4xl sm:text-5xl text-[#171717] mb-4 leading-tight">
              {t.join.structure.heading[lang]}
            </h2>
            <p className="text-[#646464] text-base max-w-lg mx-auto">
              {t.join.structure.subtitle[lang]}
            </p>
          </div>

          <div className="hidden md:flex items-center justify-center gap-4 mb-12 text-[#999] text-sm">
            <span className="uppercase tracking-widest text-xs">Intern</span>
            <ProgressArrow />
            <span className="uppercase tracking-widest text-xs text-[#71031f]/80">Fellow</span>
            <ProgressArrow />
            <span className="uppercase tracking-widest text-xs text-[#C9A96E]">E-Board</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.join.tiers.map((tier, i) => (
              <div
                key={i}
                className="relative rounded-[28px] border border-black/5 bg-white shadow-[0_12px_44px_rgba(0,0,0,0.08)] p-8 flex flex-col"
              >
                <span
                  className={`inline-block self-start text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full mb-6 ${TIER_TAG[i]}`}
                >
                  {tier.tag[lang]}
                </span>

                <h3 className="heading-serif text-3xl text-[#171717] mb-3">{tier.name[lang]}</h3>
                <p className="text-[#646464] text-sm leading-relaxed mb-8">{tier.desc[lang]}</p>

                <div className="space-y-3 flex-1">
                  {tier.perks.map((perk, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <CheckIcon />
                      <span className="text-sm text-[#171717]/80">{perk[lang]}</span>
                    </div>
                  ))}
                </div>

                {tier.promotion[lang] && (
                  <div className="mt-8 pt-6 border-t border-black/5">
                    <p className="text-xs text-[#999] italic">{tier.promotion[lang]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The Process ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white/40 border-y border-black/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="heading-serif text-4xl sm:text-5xl text-[#171717] mb-16 leading-tight text-center">
            {t.join.process.heading[lang]}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
            {t.join.process.steps.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="w-14 h-14 rounded-full border border-black/10 flex items-center justify-center mx-auto mb-6 bg-white shadow-sm">
                  <span className="heading-serif text-xl text-[#71031f]">{i + 1}</span>
                </div>
                {i < t.join.process.steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+36px)] w-[calc(100%-72px)] h-px bg-black/10" />
                )}
                <h3 className="font-semibold text-[#171717] mb-2 text-sm uppercase tracking-wide">
                  {step.title[lang]}
                </h3>
                <p className="text-sm text-[#646464]">{step.desc[lang]}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[#999] mt-16 uppercase tracking-widest">
            {t.join.process.note[lang]}
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="heading-serif text-4xl sm:text-5xl text-[#171717] mb-16 leading-tight text-center">
            {t.join.faq.heading[lang]}
          </h2>
          <div className="divide-y divide-black/10">
            {t.join.faq.items.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left py-6 flex items-center justify-between gap-4 cursor-pointer min-h-[56px]"
                >
                  <span className="font-medium text-[#171717]">{item.q[lang]}</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`shrink-0 text-[#999] transition-transform duration-300 ${openFaq === i ? "rotate-45" : ""}`}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: openFaq === i ? "260px" : "0px",
                    opacity: openFaq === i ? 1 : 0,
                  }}
                >
                  <p className="pb-6 text-sm text-[#646464] leading-relaxed pr-8">{item.a[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Apply CTA (dark band) ─── */}
      <section id="apply" className="py-28 sm:py-36 px-6 text-center bg-[#1F1F29] text-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="heading-serif text-4xl sm:text-5xl md:text-6xl text-white mb-4 leading-tight">
            {t.join.apply.heading[lang]}
          </h2>
          <p className="text-white/50 mb-12 text-sm uppercase tracking-widest">
            {t.join.apply.subtitle[lang]}
          </p>
          <div className="inline-block">
            <BorderGlow
              edgeSensitivity={5}
              glowColor="170 60 75"
              backgroundColor="transparent"
              borderRadius={12}
              glowRadius={40}
              glowIntensity={1.2}
              coneSpread={35}
              animated
              colors={["#A0D7D1", "#6DD4D4", "#ffffff"]}
            >
              <a
                href={APPLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white text-[#1F1F29] px-12 py-4 rounded-[12px] hover:bg-white/90 transition-all duration-200 inline-flex items-center gap-3 font-bold text-base tracking-wide min-h-[56px]"
              >
                {t.join.apply.cta[lang]}
                <ArrowIcon size={16} />
              </a>
            </BorderGlow>
          </div>
          <p className="text-sm text-white/30 mt-10">{t.join.apply.contact[lang]}</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
