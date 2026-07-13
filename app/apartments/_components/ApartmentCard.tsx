"use client";

import Image from "next/image";
import type { ProductLanguage } from "@/components/ProductShell";
import {
  type Apartment,
  type Neighborhood,
  VALUE_LABELS,
  LUXURY_STARS,
} from "@/lib/apartments/data";

// ─── Apartment Card ───────────────────────────────────────────────────────────
// The photo + details card for the currently-selected apartment. Extracted from
// the page so the page stays focused on filter/navigation state.

const neighborhoodBadgeColor: Record<Neighborhood, string> = {
  "South Park": "var(--cardinal)",
  "DTLA": "var(--black)",
  "Koreatown": "#7030a0",
};

export default function ApartmentCard({
  apt,
  language,
  imgError,
  onImgError,
}: {
  apt: Apartment;
  language: ProductLanguage;
  imgError: boolean;
  onImgError: () => void;
}) {
  return (
    <div className="border-[3px] border-[var(--black)]" style={{ background: "var(--cream)" }}>
      <div className="grid lg:grid-cols-[1fr_420px]">
        {/* Photo */}
        <div
          className="relative flex min-h-[280px] flex-col items-start justify-end overflow-hidden border-b-[3px] border-[var(--black)] lg:min-h-[540px] lg:border-b-0 lg:border-r-[3px]"
          style={{ background: apt.gradient }}
        >
          {apt.photoUrl && !imgError && (
            <Image
              key={apt.id}
              src={apt.photoUrl}
              alt={apt.name}
              onError={onImgError}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          )}
          {/* Darken overlay when photo loaded */}
          {apt.photoUrl && !imgError && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          )}
          {/* Ghost name */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
            <span style={{ fontFamily: "var(--font-display), Impact, sans-serif", textTransform: "uppercase", fontSize: "clamp(60px, 10vw, 160px)", lineHeight: 0.85, color: "white", opacity: 0.07, letterSpacing: "0.02em", whiteSpace: "nowrap", userSelect: "none" }}>
              {apt.name}
            </span>
          </div>
          {/* Bottom info */}
          <div className="relative z-10 w-full border-t-[3px] border-[var(--black)] bg-black/70 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-display text-[10px] tracking-[0.2em] px-2 py-0.5"
                style={{ background: neighborhoodBadgeColor[apt.neighborhood], color: "white" }}
              >
                {apt.neighborhood}
              </span>
              <span className="font-display text-[10px] tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.5)" }}>
                {apt.address}
              </span>
            </div>
            <h2 className="font-display text-[36px] leading-[0.9] text-white sm:text-[52px]">{apt.name}</h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{apt.taglineZh}</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {/* Distance + Price */}
          <div className="grid grid-cols-2 border-b-[3px] border-[var(--black)] p-5">
            <div>
              <p className="font-display text-[10px] tracking-[0.15em]" style={{ color: "var(--mid)" }}>
                {language === "zh" ? "距USC" : "FROM USC"}
              </p>
              <p className="mt-1 font-display text-2xl" style={{ color: "var(--black)" }}>
                {apt.distanceFromUSC}<span className="text-base"> mi</span>
              </p>
            </div>
            <div>
              <p className="font-display text-[10px] tracking-[0.15em]" style={{ color: "var(--mid)" }}>
                {language === "zh" ? "月租起价" : "STARTING FROM"}
              </p>
              <p className="mt-1 font-display text-2xl" style={{ color: apt.accentColor }}>
                ${apt.priceFrom.toLocaleString()}<span className="text-base">+</span>
              </p>
            </div>
          </div>

          {/* Year + Shuttle */}
          <div className="grid grid-cols-2 border-b-[3px] border-[var(--black)] p-5">
            <div>
              <p className="font-display text-[10px] tracking-[0.15em]" style={{ color: "var(--mid)" }}>
                {language === "zh" ? "建造年份" : "BUILT"}
              </p>
              <p className="mt-1 font-display text-xl" style={{ color: "var(--black)" }}>
                {apt.buildYear ?? "—"}
                {apt.buildYear && apt.buildYear >= 2022 && (
                  <span className="ml-1.5 text-[10px] font-bold tracking-wider px-1.5 py-0.5" style={{ background: "#1a7a46", color: "white" }}>NEW</span>
                )}
              </p>
            </div>
            <div>
              <p className="font-display text-[10px] tracking-[0.15em]" style={{ color: "var(--mid)" }}>
                {language === "zh" ? "USC校车站" : "USC SHUTTLE"}
              </p>
              <p className="mt-1 font-display text-xl" style={{ color: apt.shuttleMinutes && apt.shuttleMinutes <= 8 ? "#1a7a46" : apt.shuttleMinutes && apt.shuttleMinutes <= 15 ? apt.accentColor : "var(--mid)" }}>
                {apt.shuttleMinutes ? `${apt.shuttleMinutes}min` : "—"}
                {apt.shuttleMinutes && apt.shuttleMinutes <= 8 && (
                  <span className="ml-1.5 text-[10px] font-bold tracking-wider px-1.5 py-0.5" style={{ background: "#1a7a46", color: "white" }}>
                    {language === "zh" ? "超近" : "CLOSE"}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="border-b-[3px] border-[var(--black)] p-4">
            <div className="flex flex-wrap gap-1.5">
              {apt.tags.map((tag) => (
                <span key={tag} className="brutal-tag">{tag}</span>
              ))}
              {apt.funTags.map((tag) => (
                <span key={tag} className="brutal-tag" style={{ background: "var(--black)", color: "white" }}>{tag}</span>
              ))}
            </div>
            {(() => {
              const vl = VALUE_LABELS[apt.valueScore];
              return (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider border-[2px]" style={{ borderColor: vl.color, color: vl.color }}>
                    {language === "zh" ? `性价比 ${vl.zh}` : `VALUE: ${vl.en}`}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider border-[2px] border-[var(--mid)]" style={{ color: "var(--mid)" }}>
                    {language === "zh" ? "奢华度 " : "LUXURY "}{LUXURY_STARS[apt.luxuryScore]}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Notes */}
          {apt.notes.length > 0 && (
            <div className="border-b-[3px] border-[var(--black)] p-4">
              <p className="font-display text-[10px] tracking-[0.15em] mb-2" style={{ color: "var(--mid)" }}>
                {language === "zh" ? "特别说明" : "NOTES"}
              </p>
              <ul className="flex flex-col gap-1">
                {[
                  ...apt.notes,
                  ...(apt.parkingNote ? [`停车: ${apt.parkingNote}`] : []),
                  ...(apt.utilityNote ? [`水电: ${apt.utilityNote}`] : []),
                ].map((note) => (
                  <li key={note} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--black)" }}>
                    <span style={{ color: "var(--cardinal)", flexShrink: 0 }}>📌</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Room types */}
          <div className="border-b-[3px] border-[var(--black)] p-4">
            <p className="font-display text-[10px] tracking-[0.15em] mb-2" style={{ color: "var(--mid)" }}>
              {language === "zh" ? "推荐房型" : "ROOM TYPES"}
            </p>
            <div className="flex flex-col gap-2">
              {apt.roomTypes.map((rt) => (
                <div key={rt.name} className="flex items-center justify-between border-[2px] border-[var(--black)] px-3 py-2" style={{ background: "var(--beige)" }}>
                  <div>
                    <span className="font-display text-sm" style={{ color: "var(--black)" }}>
                      {language === "zh" ? rt.nameZh : rt.name}
                    </span>
                    {rt.sqft && (
                      <span className="ml-2 text-[10px]" style={{ color: "var(--mid)" }}>
                        {rt.sqft} sqft
                      </span>
                    )}
                  </div>
                  <span className="font-display text-sm" style={{ color: apt.accentColor }}>
                    ${rt.priceFrom.toLocaleString()}{rt.priceTo ? `–$${rt.priceTo.toLocaleString()}` : "+"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="border-b-[3px] border-[var(--black)] p-4">
            <p className="font-display text-[10px] tracking-[0.15em] mb-2" style={{ color: "var(--mid)" }}>
              {language === "zh" ? "设施配套" : "AMENITIES"}
            </p>
            <div className="flex flex-wrap gap-1">
              {apt.amenities.map((am) => (
                <span key={am} className="border border-[var(--black)] px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ background: "white", color: "var(--black)" }}>
                  {am}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="border-b-[3px] border-[var(--black)] p-4">
            <p className="text-[13px] leading-6" style={{ color: "var(--mid)" }}>
              {apt.descriptionZh}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-auto grid grid-cols-2">
            <a
              href={apt.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center border-r-[3px] border-[var(--black)] px-4 py-4 font-display text-[12px] tracking-[0.1em] text-white transition-opacity hover:opacity-85"
              style={{ background: apt.accentColor }}
            >
              {language === "zh" ? "预约看房" : "SCHEDULE TOUR"}
            </a>
            <a
              href={apt.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-4 py-4 font-display text-[12px] tracking-[0.1em] transition-colors hover:bg-[var(--gold)]"
              style={{ color: "var(--black)", background: "var(--cream)" }}
            >
              {language === "zh" ? "查看官网 →" : "VISIT SITE →"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
