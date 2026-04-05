"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollFloat from "@/components/ScrollFloat";
import GlassSurface from "@/components/GlassSurface";
import BorderGlow from "@/components/BorderGlow";
import { t, type Lang } from "@/lib/i18n";

const APPLY_URL = "#apply";

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
      className="shrink-0"
    >
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="#A0D7D1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function JoinPage() {
  const [time, setTime] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tierAccents = [
    {
      border: "border-white/20",
      bg: "bg-white/5",
      tagBg: "bg-white/10 text-white/70",
    },
    {
      border: "border-[#A0D7D1]/40",
      bg: "bg-[#A0D7D1]/5",
      tagBg: "bg-[#A0D7D1]/15 text-[#A0D7D1]",
    },
    {
      border: "border-[#C9A96E]/40",
      bg: "bg-[#C9A96E]/5",
      tagBg: "bg-[#C9A96E]/15 text-[#C9A96E]",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#0D0D0F] text-white overflow-x-hidden font-sans">
      <main className="relative z-10 flex flex-col bg-transparent">
        {/* ─── Floating Navbar ─── */}
        <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={16}
            brightness={12}
            opacity={0.9}
            blur={14}
            displace={0.3}
            backgroundOpacity={0.45}
            className="text-white w-full max-w-4xl pointer-events-auto shadow-2xl transition-all duration-300"
          >
            <nav className="w-full py-3 px-6 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2">
                  <Image
                    src="/logo.png"
                    alt="BIA"
                    width={32}
                    height={26}
                    className="object-contain"
                    style={{ height: "auto" }}
                  />
                  <span className="heading-serif text-xl tracking-tight">
                    BIA
                  </span>
                </Link>
                <div className="hidden sm:flex gap-4 text-sm text-gray-200 items-center">
                  <Link href="/about" className="link-hover py-3 px-1">
                    {t.nav.about[lang]}
                  </Link>
                  <Link href="/events" className="link-hover py-3 px-1">
                    {t.nav.events[lang]}
                  </Link>
                  <Link
                    href="/roommates"
                    className="link-hover py-3 px-1"
                    style={{ fontFamily: "var(--font-display-zh)" }}
                  >
                    {t.nav.freshmanServices[lang]}
                  </Link>
                  <Link href="/join" className="link-hover py-3 px-1">
                    {t.nav.joinUs[lang]}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => setLang(lang === "en" ? "zh" : "en")}
                  className="hidden sm:flex items-center gap-1.5 border border-white/20 px-4 py-2.5 rounded-full text-xs text-white/80 hover:text-white hover:border-white/40 transition-colors cursor-pointer min-h-[44px]"
                >
                  {lang === "en" ? "中文" : "EN"}
                </button>
                <div className="hidden sm:flex items-center gap-2 opacity-80 border border-white/20 px-3 py-1 rounded-full text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                  LA {time || "..."}
                </div>
                <a
                  href={APPLY_URL}
                  className="bg-white/90 text-[#171717] hover:bg-white px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center shadow-lg font-semibold text-sm tracking-wide min-h-[44px]"
                >
                  {t.join.apply.cta[lang]}
                </a>
              </div>
            </nav>
          </GlassSurface>
        </div>

        {/* ─── Hero ─── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              src="/hackathon/group-photo.jpg"
              alt="BIA Members"
              className="w-full h-full object-cover opacity-20 bg-[#0D0D0F]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0F] via-[#0D0D0F]/60 to-[#0D0D0F]" />
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
            <p className="text-white/50 text-lg sm:text-xl mt-8 max-w-xl mx-auto font-light leading-relaxed">
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
                  className="group bg-white text-[#0D0D0F] px-10 py-4 rounded-[10px] text-sm font-bold tracking-wide uppercase hover:bg-white/90 transition-all duration-200 inline-flex items-center gap-3 min-h-[52px]"
                >
                  {t.join.hero.cta[lang]}
                  <ArrowIcon />
                </a>
              </BorderGlow>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-40">
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/60" />
          </div>
        </section>

        {/* ─── Stats ─── */}
        <section className="py-20 px-6 border-t border-white/10">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            {t.join.stats.map((stat, i) => (
              <div key={i}>
                <p className="heading-serif text-4xl sm:text-5xl text-white mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-white/40">{stat.label[lang]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Membership Tiers ─── */}
        <section className="py-24 sm:py-32 px-6 sm:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="heading-serif text-4xl sm:text-5xl md:text-6xl text-white mb-4 leading-tight">
                {t.join.structure.heading[lang]}
              </h2>
              <p className="text-white/40 text-base max-w-lg mx-auto">
                {t.join.structure.subtitle[lang]}
              </p>
            </div>

            {/* Progression arrow */}
            <div className="hidden md:flex items-center justify-center gap-4 mb-12 text-white/30 text-sm">
              <span className="uppercase tracking-widest text-xs">Intern</span>
              <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
                <path
                  d="M0 6H36M36 6L30 1M36 6L30 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="uppercase tracking-widest text-xs text-[#A0D7D1]/60">
                Fellow
              </span>
              <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
                <path
                  d="M0 6H36M36 6L30 1M36 6L30 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="uppercase tracking-widest text-xs text-[#C9A96E]/60">
                E-Board
              </span>
            </div>

            {/* Tier cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.join.tiers.map((tier, i) => (
                <div
                  key={i}
                  className={`relative rounded-2xl ${tierAccents[i].border} border ${tierAccents[i].bg} p-8 flex flex-col backdrop-blur-sm`}
                >
                  {/* Tag */}
                  <span
                    className={`inline-block self-start text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full mb-6 ${tierAccents[i].tagBg}`}
                  >
                    {tier.tag[lang]}
                  </span>

                  <h3 className="heading-serif text-3xl text-white mb-3">
                    {tier.name[lang]}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-8">
                    {tier.desc[lang]}
                  </p>

                  {/* Perks */}
                  <div className="space-y-3 flex-1">
                    {tier.perks.map((perk, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <CheckIcon />
                        <span className="text-sm text-white/70">
                          {perk[lang]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Promotion note */}
                  {tier.promotion[lang] && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <p className="text-xs text-white/40 italic">
                        {tier.promotion[lang]}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── The Process ─── */}
        <section className="py-24 sm:py-32 px-6 sm:px-16 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <h2 className="heading-serif text-4xl sm:text-5xl text-white mb-20 leading-tight text-center">
              {t.join.process.heading[lang]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
              {t.join.process.steps.map((step, i) => (
                <div key={i} className="relative text-center">
                  {/* Number */}
                  <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-6 bg-white/5">
                    <span className="heading-serif text-xl text-white/60">
                      {i + 1}
                    </span>
                  </div>
                  {/* Connector */}
                  {i < t.join.process.steps.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-[calc(50%+36px)] w-[calc(100%-72px)] h-px bg-white/10" />
                  )}
                  <h3 className="font-semibold text-white mb-2 text-sm uppercase tracking-wide">
                    {step.title[lang]}
                  </h3>
                  <p className="text-sm text-white/40">{step.desc[lang]}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-white/30 mt-16 uppercase tracking-widest">
              {t.join.process.note[lang]}
            </p>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-24 sm:py-32 px-6 sm:px-16 border-t border-white/10">
          <div className="max-w-3xl mx-auto">
            <h2 className="heading-serif text-4xl sm:text-5xl text-white mb-16 leading-tight text-center">
              {t.join.faq.heading[lang]}
            </h2>
            <div className="divide-y divide-white/10">
              {t.join.faq.items.map((item, i) => (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left py-6 flex items-center justify-between gap-4 cursor-pointer min-h-[56px]"
                  >
                    <span className="font-medium text-white/90">
                      {item.q[lang]}
                    </span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      className={`shrink-0 text-white/30 transition-transform duration-300 ${openFaq === i ? "rotate-45" : ""}`}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 4V16M4 10H16"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: openFaq === i ? "200px" : "0px",
                      opacity: openFaq === i ? 1 : 0,
                    }}
                  >
                    <p className="pb-6 text-sm text-white/40 leading-relaxed pr-8">
                      {item.a[lang]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Apply CTA ─── */}
        <section
          id="apply"
          className="py-32 sm:py-40 px-6 text-center border-t border-white/10"
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="heading-serif text-4xl sm:text-5xl md:text-6xl text-white mb-4 leading-tight">
              {t.join.apply.heading[lang]}
            </h2>
            <p className="text-white/40 mb-12 text-sm uppercase tracking-widest">
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
                  className="group bg-white text-[#0D0D0F] px-12 py-4.5 rounded-[12px] hover:bg-white/90 transition-all duration-200 inline-flex items-center gap-3 font-bold text-base tracking-wide min-h-[56px]"
                >
                  {t.join.apply.cta[lang]}
                  <ArrowIcon size={16} />
                </a>
              </BorderGlow>
            </div>
            <p className="text-sm text-white/25 mt-10">
              {t.join.apply.contact[lang]}
            </p>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-white/10 py-16 px-6 sm:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-white/10 pb-12 mb-8">
              <div className="flex gap-6 text-sm font-medium">
                <Link
                  href="/"
                  className="text-white/50 hover:text-[#A0D7D1] transition-colors link-hover py-2"
                >
                  {t.footer.home[lang]}
                </Link>
                <Link
                  href="/about"
                  className="text-white/50 hover:text-[#A0D7D1] transition-colors link-hover py-2"
                >
                  {t.nav.about[lang]}
                </Link>
                <Link
                  href="/events"
                  className="text-white/50 hover:text-[#A0D7D1] transition-colors link-hover py-2"
                >
                  {t.nav.events[lang]}
                </Link>
                <Link
                  href="/roommates"
                  className="text-white/50 hover:text-[#A0D7D1] transition-colors link-hover py-2"
                  style={{ fontFamily: "var(--font-display-zh)" }}
                >
                  {t.nav.freshmanServices[lang]}
                </Link>
              </div>
              <div className="flex gap-6">
                {["Insta", "X", "LinkedIn", "Discord"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="text-sm font-medium text-white/30 hover:text-white/70 transition-colors link-hover py-2 px-1 min-w-[44px] text-center"
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-white/20 font-light">
              <p>
                &copy; {new Date().getFullYear()} {t.footer.copyright[lang]}
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400/50"></span>{" "}
                Los Angeles, CA
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
