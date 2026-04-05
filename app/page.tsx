"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SERVICES_DATA } from "@/lib/services";
import CardSwap, { Card } from "@/components/CardSwap";
import ScrollFloat from "@/components/ScrollFloat";
import GlassSurface from "@/components/GlassSurface";
import BorderGlow from "@/components/BorderGlow";
import ScrollStack, { ScrollStackItem } from "@/components/ScrollStack";
import { t, type Lang } from "@/lib/i18n";

function ArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="inline ml-1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 6H11M11 6L6 1M11 6L6 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  const [time, setTime] = useState("");
  const [lang, setLang] = useState<Lang>("en");

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

  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
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
                <Link
                  href="/join"
                  className="bg-white/90 text-[#171717] hover:bg-white px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center shadow-lg font-semibold text-sm tracking-wide min-h-[44px]"
                >
                  {t.nav.joinUs[lang]}
                </Link>
              </div>
            </nav>
          </GlassSurface>
        </div>

        {/* ─── Hero Section (sticky, gets covered by content) ─── */}
        <section className="sticky top-0 z-10 h-[95vh] w-full flex items-center justify-center overflow-hidden bg-[#1F1F29]">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/hero-usc-anime.jpg"
              alt="USC Campus Golden Hour Anime Style"
              className="w-full h-full object-cover opacity-75 hover:scale-105 transition-transform duration-[10s] ease-in-out bg-[#1F1F29]"
            />
          </div>

          {/* Title */}
          <div className="relative z-10 text-center w-full px-4">
            <ScrollFloat
              animateOnMount
              mountDelay={0.3}
              animationDuration={0.8}
              ease="back.out(1.7)"
              stagger={0.05}
              textClassName="heading-serif text-white text-[16vw] sm:text-[120px] leading-none"
            >
              {"BIA at "}
              <span
                style={{
                  fontFamily: "var(--font-playlist)",
                  color: "#71031f",
                  textShadow:
                    "0 4px 20px rgba(113,3,31,0.4), 0 2px 6px rgba(0,0,0,0.5)",
                }}
              >
                USC
              </span>
            </ScrollFloat>
          </div>

          {/* Bottom Left CTA */}
          <div className="absolute bottom-10 sm:bottom-16 left-6 sm:left-16 z-20 max-w-md">
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={16}
              brightness={25}
              opacity={0.9}
              blur={16}
              displace={0.4}
              className="shadow-2xl"
            >
              <div className="p-6 text-white text-left w-full">
                <p className="text-[#A0D7D1] text-xs uppercase tracking-widest font-semibold mb-2 drop-shadow-md">
                  Starter · {t.hero.subtitle[lang]}
                </p>
                <p className="text-sm mb-5 leading-relaxed font-light">
                  {t.hero.desc[lang]}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
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
                    <Link
                      href="/roommates"
                      className="group bg-white/95 text-[#171717] px-8 py-3.5 rounded-[10px] text-sm font-bold tracking-wide uppercase hover:bg-white transition-all duration-200 inline-flex items-center gap-2.5 min-h-[48px]"
                    >
                      {t.hero.cta[lang]}
                      <svg
                        width="14"
                        height="14"
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
                    </Link>
                  </BorderGlow>
                  <span className="text-xs text-white/60">
                    {t.hero.ctaSub[lang]}
                  </span>
                </div>
              </div>
            </GlassSurface>
          </div>
        </section>

        {/* ─── Main Content Overlay (scrolls over hero, reveals footer) ─── */}
        <div className="relative z-20 bg-[#F9FAF7] rounded-t-[2.5rem] -mt-10 shadow-[0_-8px_40px_rgba(0,0,0,0.2)]">
          {/* ─── Mission Section ─── */}
          <section
            id="mission"
            className="py-24 sm:py-32 px-6 sm:px-16 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative"
          >
            <div className="w-full md:w-1/2 rounded-3xl overflow-hidden aspect-square md:aspect-[4/3] bg-[#1F1F29] shadow-xl border border-black/5 relative group">
              <Image
                src="/globe-community.jpg"
                alt="Hand holding glowing globe — bridging global communities"
                width={800}
                height={600}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]"
              />
            </div>
            <div className="w-full md:w-1/2">
              <h2 className="heading-serif text-[#171717] text-4xl sm:text-5xl mb-6 leading-tight">
                {t.mission.heading[lang]}
              </h2>
              <p className="text-[#646464] text-lg leading-relaxed max-w-lg mb-8">
                {t.mission.desc[lang]}
              </p>
              <div className="h-px w-24 bg-[#A0D7D1]"></div>
            </div>
          </section>

          {/* ─── 新生服务 — ScrollStack ─── */}
          <section className="relative bg-[#F9FAF7] pt-24 sm:pt-32 px-6 sm:px-16 pb-8">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2
                className="heading-serif text-4xl sm:text-5xl mb-2 text-[#171717]"
                style={{ fontFamily: "var(--font-display-zh)" }}
              >
                {t.services.heading[lang]}
              </h2>
              <p className="text-[#999] text-sm uppercase tracking-widest mb-4">
                {t.services.subtitle[lang]}
              </p>
              <p className="text-[#646464] text-sm">
                {t.services.builtBy[lang]}
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <ScrollStack
                itemDistance={80}
                itemScale={0.04}
                itemStackDistance={20}
                stackPosition="25%"
                scaleEndPosition="15%"
                baseScale={0.88}
                blurAmount={2}
              >
                {(() => {
                  const hrefs = [
                    "/roommates",
                    "/course-planner",
                    "/course-rating",
                    "/sublet",
                    "/usc-group",
                  ];
                  const previews = [
                    "/previews/roommates.png",
                    "/previews/course-planner.png",
                    "/previews/course-rating.png",
                    "/previews/sublet.png",
                    "/previews/usc-group.png",
                  ];
                  return t.services.items.map((svc, idx) => (
                    <ScrollStackItem key={svc.title.en}>
                      <Link
                        href={hrefs[idx]}
                        className="block bg-white rounded-2xl overflow-hidden border border-black/8 shadow-lg hover:shadow-xl transition-shadow duration-300"
                      >
                        <div className="relative w-full h-48 sm:h-56">
                          <img
                            src={previews[idx]}
                            alt={svc.sub[lang]}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="p-6 sm:p-8">
                          <div className="flex items-center gap-3 mb-2">
                            <h3
                              className="text-2xl font-semibold text-[#171717]"
                              style={{ fontFamily: "var(--font-display-zh)" }}
                            >
                              {svc.title[lang]}
                            </h3>
                            <span className="text-xs text-[#999] uppercase tracking-wider">
                              {svc.sub[lang]}
                            </span>
                          </div>
                          <p className="text-[#646464] text-sm leading-relaxed mb-3">
                            {svc.desc[lang]}
                          </p>
                          <span className="text-[#A0D7D1] text-sm font-medium inline-flex items-center gap-1">
                            {t.services.open[lang]} <ArrowIcon />
                          </span>
                        </div>
                      </Link>
                    </ScrollStackItem>
                  ));
                })()}
              </ScrollStack>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>

          {/* ─── Three Pillars ─── */}
          <section className="py-24 sm:py-32 px-6 sm:px-16">
            <h2 className="heading-serif text-4xl sm:text-5xl mb-4 text-[#171717]">
              {t.pillars.heading[lang]}
            </h2>
            <p className="text-[#999] text-sm uppercase tracking-widest mb-16">
              {t.pillars.subtitle[lang]}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { image: "/cultural-bridge.jpg", idx: 0 },
                { image: "/tech-innovation.jpg", idx: 1 },
                { image: "/career-development.jpg", idx: 2 },
              ].map((pillar) => (
                <div
                  key={pillar.idx}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer"
                >
                  <Image
                    src={pillar.image}
                    alt={t.pillars.items[pillar.idx].title[lang]}
                    width={600}
                    height={800}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white text-lg sm:text-xl font-medium leading-snug mb-1">
                      {t.pillars.items[pillar.idx].title[lang]}
                    </h3>
                    <p
                      className="text-white/60 text-sm"
                      style={{ fontFamily: "var(--font-display-zh)" }}
                    >
                      {t.pillars.items[pillar.idx].titleZh[lang]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Featured Product/Event Section ─── */}
          <section className="relative w-full h-[85vh] flex items-center px-6 sm:px-16 overflow-hidden bg-[#1F1F29]">
            <img
              src="/hackathon-anime.jpg"
              alt="BIA Hackathon — students coding at USC"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-60 hover:scale-105 transition-transform duration-[10s]"
            />
            <div className="relative z-10 max-w-2xl text-white">
              <span className="inline-block px-4 py-1.5 border border-white/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 glass-panel">
                {t.hackathon.badge[lang]}
              </span>
              <h2 className="heading-serif text-5xl sm:text-6xl mb-6 leading-tight drop-shadow-md">
                {t.hackathon.title[lang]}
              </h2>
              <p className="text-lg opacity-90 mb-8 max-w-lg font-light leading-relaxed">
                {t.hackathon.desc[lang]}
              </p>
              <div className="inline-block">
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
                  <Link
                    href="/hackathon"
                    className="group bg-white/95 text-[#1F1F29] px-8 py-3.5 rounded-[10px] hover:bg-white transition-all duration-200 font-bold text-sm tracking-wide uppercase inline-flex items-center gap-2.5 min-h-[48px]"
                  >
                    {t.hackathon.cta[lang]}
                    <svg
                      width="14"
                      height="14"
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
                  </Link>
                </BorderGlow>
              </div>
            </div>
          </section>

          {/* ─── Blog/Articles ─── */}
          <section className="py-24 sm:py-32 px-6 sm:px-16 max-w-7xl mx-auto">
            <h2 className="heading-serif text-4xl sm:text-5xl mb-12 text-[#171717]">
              {t.blog.heading[lang]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
              {[
                {
                  href: "#",
                  tilt: "-2deg",
                  offset: "0px",
                  image: "/blog-mihoyo.jpg",
                  idx: 0,
                },
                {
                  href: "#",
                  tilt: "1.5deg",
                  offset: "-8px",
                  image: "/blog-yc-china.jpg",
                  idx: 1,
                },
                {
                  href: "/usc-group",
                  tilt: "-1deg",
                  offset: "4px",
                  image: "/blog-class-2030.jpg",
                  idx: 2,
                },
              ].map((post) => (
                <Link
                  key={post.idx}
                  href={post.href}
                  className="group flex flex-col tilted-card"
                  style={
                    {
                      "--tilt": post.tilt,
                      "--offset": post.offset,
                      transform: `rotate(var(--tilt)) translateY(var(--offset))`,
                    } as React.CSSProperties
                  }
                >
                  <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-6 border border-black/5 shadow-lg">
                    <img
                      src={post.image}
                      alt={t.blog.posts[post.idx][lang]}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <h3 className="text-2xl font-medium text-[#2C2C2C] mb-3 group-hover:text-[#A0D7D1] transition-colors heading-serif leading-snug">
                    {t.blog.posts[post.idx][lang]}
                  </h3>
                  <p className="text-sm text-[#A0D7D1] font-medium tracking-wide mt-auto uppercase">
                    {t.blog.byline[lang]}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* ─── CTA/Closing ─── */}
          <section className="py-32 px-6 text-center border-t border-black/5 bg-[#FEFFFC] rounded-b-[2rem]">
            <h2 className="heading-serif text-4xl sm:text-5xl md:text-6xl max-w-4xl mx-auto text-[#171717] mb-10 leading-tight">
              {t.cta.heading[lang]}
            </h2>
            <div className="inline-block">
              <BorderGlow
                edgeSensitivity={5}
                glowColor="20 10 40"
                backgroundColor="transparent"
                borderRadius={12}
                glowRadius={40}
                glowIntensity={1.0}
                coneSpread={35}
                animated
                colors={["#334444", "#A0D7D1", "#1F1F29"]}
              >
                <Link
                  href="/join"
                  className="group bg-[#171717] text-white px-10 py-4 rounded-[12px] hover:bg-[#2C2C2C] transition-all duration-200 inline-flex items-center gap-3 font-bold text-base tracking-wide min-h-[52px]"
                >
                  {t.cta.link[lang]}
                  <svg
                    width="16"
                    height="16"
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
                </Link>
              </BorderGlow>
            </div>
          </section>
        </div>
        {/* end Main Content Overlay */}

        {/* ─── Footer Text Reveal Hole (Transparent) ─── */}
        <div
          className="relative w-full text-white flex flex-col justify-end pb-8 bg-transparent"
          style={{ height: "70vh", minHeight: "600px" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-16 w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-white/20 pb-12 mb-8">
              <div className="flex gap-6 text-sm font-medium">
                <Link
                  href="/"
                  className="hover:text-[#A0D7D1] transition-colors link-hover py-2"
                >
                  {t.footer.home[lang]}
                </Link>
                <Link
                  href="/about"
                  className="hover:text-[#A0D7D1] transition-colors link-hover py-2"
                >
                  {t.nav.about[lang]}
                </Link>
                <Link
                  href="/events"
                  className="hover:text-[#A0D7D1] transition-colors link-hover py-2"
                >
                  {t.nav.events[lang]}
                </Link>
                <Link
                  href="/roommates"
                  className="hover:text-[#A0D7D1] transition-colors link-hover py-2"
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
                    className="text-sm font-medium opacity-80 hover:opacity-100 hover:text-[#A0D7D1] transition-colors link-hover py-2 px-1 min-w-[44px] text-center"
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs opacity-60 font-light">
              <p>
                &copy; {new Date().getFullYear()} {t.footer.copyright[lang]}
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>{" "}
                Los Angeles, CA
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer Fixed Background ─── */}
      <footer
        className="fixed bottom-0 left-0 w-full z-0 bg-[#1F1F29]"
        style={{ height: "70vh", minHeight: "600px" }}
      >
        <div className="absolute inset-0 z-0">
          <img
            src="/footer-night.jpg"
            alt="USC Campus at Night — Pixel Art"
            loading="lazy"
            className="w-full h-full object-cover object-bottom opacity-40 hover:scale-105 transition-transform duration-[20s]"
          />
        </div>
      </footer>
    </div>
  );
}
