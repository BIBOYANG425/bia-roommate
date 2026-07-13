"use client";

import { useState, useMemo, Suspense, useEffect, useCallback, useRef } from "react";
import ProductShell, { type ProductLanguage } from "@/components/ProductShell";
import {
  APARTMENTS,
  STATIC_RANKING,
  PRICE_OPTIONS,
  DISTANCE_OPTIONS,
  NEIGHBORHOOD_OPTIONS,
  AMENITY_OPTIONS,
  type Neighborhood,
} from "@/lib/apartments/data";
import { VoteTalliesProvider } from "./_components/VoteTalliesProvider";
import VoteButtons from "./_components/VoteButtons";
import DynamicLeaderboard from "./_components/DynamicLeaderboard";
import CommentsSection from "./_components/CommentsSection";
import ApartmentCard from "./_components/ApartmentCard";

// ─── Main Content ─────────────────────────────────────────────────────────────

function ApartmentsContent({ language }: { language: ProductLanguage }) {
  const [maxPrice, setMaxPrice] = useState(99999);
  const [maxDistance, setMaxDistance] = useState(99);
  const [neighborhood, setNeighborhood] = useState<Neighborhood | "">("");
  const [amenity, setAmenity] = useState("");
  const [minValue, setMinValue] = useState(0);
  const [minLuxury, setMinLuxury] = useState(0);
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [imgError, setImgError] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navGenRef = useRef(0);

  const filtered = useMemo(
    () =>
      APARTMENTS.filter((apt) => {
        if (apt.priceFrom > maxPrice) return false;
        if (apt.distanceFromUSC > maxDistance) return false;
        if (neighborhood && apt.neighborhood !== neighborhood) return false;
        if (amenity && !apt.amenities.includes(amenity)) return false;
        if (minValue && apt.valueScore < minValue) return false;
        if (minLuxury && apt.luxuryScore < minLuxury) return false;
        return true;
      }),
    [maxPrice, maxDistance, neighborhood, amenity, minValue, minLuxury],
  );

  // Invalidate any in-flight navigation when filters change (no setState in effect body)
  useEffect(() => {
    navGenRef.current += 1;
  }, [filtered]);

  useEffect(() => {
    return () => {
      navGenRef.current += 1; // invalidate on unmount
      if (navTimerRef.current !== null) clearTimeout(navTimerRef.current);
    };
  }, []);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      if (transitioning || filtered.length === 0) return;
      setTransitioning(true);
      setImgError(false);
      const gen = navGenRef.current;
      navTimerRef.current = setTimeout(() => {
        navTimerRef.current = null;
        if (navGenRef.current !== gen) {
          // Filter changed while animating — unblock navigation without updating current
          setTransitioning(false);
          return;
        }
        setCurrent((prev) => (prev + dir + filtered.length) % filtered.length);
        setTransitioning(false);
      }, 180);
    },
    [filtered.length, transitioning],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") navigate(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") navigate(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const apt = filtered[current] ?? null;

  return (
    <VoteTalliesProvider>
      <>
      {/* Header */}
      <section className="border-b-[3px] border-[var(--black)]" style={{ background: "var(--cream)" }}>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="font-display text-xs tracking-[0.16em] text-[var(--mid)]">
              {language === "zh" ? "住房 / 好公寓" : "Housing / Top Apts"}
            </p>
            <h1 className="mt-5 font-display text-[42px] leading-[0.95] text-[var(--black)] sm:text-[64px]">
              {language === "zh" ? "洛杉矶好公寓" : "LA TOP APARTMENTS"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--mid)] sm:text-base">
              {language === "zh"
                ? "USC周边精选25个高品质公寓，按距离、价格和区域筛选，附真实学生评价。"
                : "25 curated quality apartments near USC — filter by distance, price, and neighborhood."}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {(language === "zh"
                ? ["South Park · DTLA · Koreatown"]
                : ["South Park · DTLA · Koreatown"]
              ).map((item) => (
                <li key={item} className="border border-[rgba(26,20,16,0.18)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--mid)]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <a
              href="#browse"
              className="inline-flex min-h-11 items-center justify-center border-[3px] border-[var(--black)] bg-[var(--cardinal)] px-5 font-display text-sm tracking-[0.08em] text-white transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              {language === "zh" ? "浏览公寓" : "BROWSE"}
            </a>
          </div>
        </div>
      </section>

      {/* Leaderboard Strip */}
      <style>{`
        @keyframes lb-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .lb-track { animation: lb-scroll 30s linear infinite; }
        .lb-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="overflow-hidden border-b-[3px] border-[var(--black)]" style={{ background: "var(--black)" }}>
        <div className="flex items-center">
          <div className="shrink-0 border-r-[3px] border-white/20 px-4 py-2.5">
            <span className="font-display text-[10px] tracking-[0.2em] text-white/60">
              {language === "zh" ? "口碑榜" : "RANKING"}
            </span>
          </div>
          <div className="overflow-hidden flex-1">
            <div className="lb-track flex gap-0">
              {[...STATIC_RANKING, ...STATIC_RANKING].map((item, i) => (
                <div key={`${item.id}-${i}`} className="flex items-center gap-2 px-5 py-2.5 border-r border-white/10 shrink-0">
                  <span className="font-display text-[11px]" style={{ color: "#f0c040" }}>
                    #{(i % STATIC_RANKING.length) + 1}
                  </span>
                  <span className="font-display text-xs text-white whitespace-nowrap">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div id="browse" className="sticky top-16 z-30 border-b-[3px] border-[var(--black)]" style={{ background: "var(--cream)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <span className="font-display text-[10px] tracking-[0.15em] text-[var(--mid)] shrink-0">
            {language === "zh" ? "筛选" : "FILTER"}
          </span>
          <select value={maxPrice} onChange={(e) => { setMaxPrice(Number(e.target.value)); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 120 }}>
            {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label[language]}</option>)}
          </select>
          <select value={maxDistance} onChange={(e) => { setMaxDistance(Number(e.target.value)); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 160 }}>
            {DISTANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label[language]}</option>)}
          </select>
          <select value={neighborhood} onChange={(e) => { setNeighborhood(e.target.value as Neighborhood | ""); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 150 }}>
            {NEIGHBORHOOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label[language]}</option>)}
          </select>
          <select value={amenity} onChange={(e) => { setAmenity(e.target.value); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 130 }}>
            {AMENITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label[language]}</option>)}
          </select>
          <select value={minValue} onChange={(e) => { setMinValue(Number(e.target.value)); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 110 }}>
            <option value={0}>{language === "zh" ? "全部性价比" : "Any Value"}</option>
            <option value={4}>{language === "zh" ? "超值" : "Best Value"}</option>
            <option value={3}>{language === "zh" ? "好价+" : "Good+"}</option>
            <option value={2}>{language === "zh" ? "适中+" : "Fair+"}</option>
          </select>
          <select value={minLuxury} onChange={(e) => { setMinLuxury(Number(e.target.value)); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 110 }}>
            <option value={0}>{language === "zh" ? "全部奢华度" : "Any Luxury"}</option>
            <option value={4}>{language === "zh" ? "★★★★+" : "★★★★+"}</option>
            <option value={3}>{language === "zh" ? "★★★+" : "★★★+"}</option>
          </select>
          <span className="font-display text-xs tracking-[0.1em] shrink-0 sm:ml-auto" style={{ color: "var(--mid)" }}>
            {filtered.length} {language === "zh" ? "个公寓" : "apartments"}
          </span>
        </div>
      </div>

      {/* Apartment viewer */}
      {apt === null ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <h3 className="font-display text-3xl" style={{ color: "var(--black)" }}>
            {language === "zh" ? "暂无符合条件的公寓" : "NO MATCHES"}
          </h3>
          <p className="mt-2 text-sm" style={{ color: "var(--mid)" }}>
            {language === "zh" ? "试试放宽筛选条件" : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <>
          <div
            className="mx-auto max-w-6xl px-4 pt-8 sm:px-6"
            style={{ opacity: transitioning ? 0 : 1, transition: "opacity 0.18s ease" }}
          >
            <ApartmentCard apt={apt} language={language} imgError={imgError} onImgError={() => setImgError(true)} />

            {/* Navigation */}
            <div className="mt-5 flex items-center gap-3">
              <VoteButtons key={apt.id} aptId={apt.id} language={language} />
            </div>
            <div className="mt-3 flex items-center gap-3 pb-6">
              <button type="button" onClick={() => navigate(-1)} disabled={filtered.length <= 1} className="brutal-btn brutal-btn-ghost px-4 py-2 text-sm disabled:opacity-30">
                ← {language === "zh" ? "上一个" : "PREV"}
              </button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto">
                {filtered.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { if (!transitioning) { setTransitioning(true); setImgError(false); setTimeout(() => { setCurrent(i); setTransitioning(false); }, 180); } }}
                    className="shrink-0 border-[2px] border-[var(--black)] transition-all"
                    style={{ width: i === current ? 24 : 10, height: 10, background: i === current ? apt.accentColor : "var(--beige)" }}
                  />
                ))}
              </div>
              <span className="font-display text-xs tracking-[0.1em] shrink-0" style={{ color: "var(--mid)" }}>
                {current + 1} / {filtered.length}
              </span>
              <button type="button" onClick={() => navigate(1)} disabled={filtered.length <= 1} className="brutal-btn brutal-btn-primary px-4 py-2 text-sm disabled:opacity-30">
                {language === "zh" ? "下一个" : "NEXT"} →
              </button>
            </div>
          </div>

          {/* Comments */}
          <CommentsSection key={apt.id} aptId={apt.id} seeds={apt.redditSeeds} language={language} />
        </>
      )}

      {/* Dynamic Vote Leaderboard */}
      <DynamicLeaderboard language={language} />

      {/* Marquee */}
      <div className="overflow-hidden border-y-[3px] border-[var(--black)]" style={{ background: "var(--cardinal)", color: "white" }}>
        <div className="marquee-track py-2">
          {[0, 1].map((n) => (
            <span key={n} className="whitespace-nowrap px-4 font-display text-sm tracking-[0.15em]">
              {["好公寓", "South Park", "DTLA", "Koreatown", "USC周边精选", "BIA", "Find Your Home"].join("  //  ")}{"  //  "}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-[3px] border-[var(--black)] px-6 py-6 text-center">
        <p className="font-display text-xs tracking-[0.2em]" style={{ color: "var(--mid)" }}>
          {language === "zh" ? "BIA 好公寓 — 洛杉矶精选住房推荐" : "BIA TOP APARTMENTS — CURATED LA HOUSING"}
        </p>
      </footer>
      </>
    </VoteTalliesProvider>
  );
}

export default function ApartmentsPage() {
  return (
    <Suspense>
      <ProductShell group="housing" page="apartments">
        {({ language }) => <ApartmentsContent language={language} />}
      </ProductShell>
    </Suspense>
  );
}
