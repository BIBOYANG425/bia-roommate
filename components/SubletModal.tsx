"use client";

import { useEffect, useRef, useState } from "react";
import { SubletListing } from "@/lib/types";
import { relativeTime, schoolAccent, schoolGold } from "@/lib/utils";

export default function SubletModal({
  listing,
  onClose,
}: {
  listing: SubletListing;
  onClose: () => void;
}) {
  const accent = schoolAccent(listing.school);
  const gold = schoolGold(listing.school);
  const photos = listing.photos ?? [];
  const [photoIdx, setPhotoIdx] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key === "ArrowLeft") setPhotoIdx((i) => (i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight")
        setPhotoIdx((i) => (i < photos.length - 1 ? i + 1 : i));
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [photos.length]);

  const infoParts = [
    listing.school,
    listing.room_type,
    listing.bathrooms,
    listing.gender_preference,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: "rgba(26,20,16,0.7)" }}
      />

      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up brutal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center border-[3px] border-[var(--black)] z-10 font-display text-lg hover:bg-[var(--gold)] transition-colors"
          style={{ background: "var(--cream)" }}
        >
          X
        </button>

        {/* Photo carousel */}
        {photos.length > 0 ? (
          <div
            className="relative w-full h-56 sm:h-64 border-b-[3px] border-[var(--black)] overflow-hidden"
            style={{ background: "var(--beige)" }}
          >
            <img
              src={photos[photoIdx]}
              alt={`Photo ${photoIdx + 1}`}
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setPhotoIdx((i) => (i > 0 ? i - 1 : photos.length - 1))
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center border-[3px] border-[var(--black)] font-display text-sm hover:bg-[var(--gold)] transition-colors"
                  style={{ background: "var(--cream)" }}
                >
                  ←
                </button>
                <button
                  onClick={() =>
                    setPhotoIdx((i) => (i < photos.length - 1 ? i + 1 : 0))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center border-[3px] border-[var(--black)] font-display text-sm hover:bg-[var(--gold)] transition-colors"
                  style={{ background: "var(--cream)" }}
                >
                  →
                </button>
                <span
                  className="absolute bottom-2 right-2 font-display text-[10px] tracking-wider px-2 py-1 border-[2px] border-[var(--black)]"
                  style={{ background: "var(--cream)" }}
                >
                  {photoIdx + 1}/{photos.length}
                </span>
              </>
            )}
          </div>
        ) : (
          <div
            className="w-full h-32 border-b-[3px] border-[var(--black)] flex items-center justify-center"
            style={{ background: "var(--beige)" }}
          >
            <span
              className="font-display text-2xl"
              style={{ color: "var(--mid)" }}
            >
              NO PHOTOS
            </span>
          </div>
        )}

        {/* Header info */}
        <div
          className="p-6 border-b-[3px] border-[var(--black)]"
          style={{ background: accent }}
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-display text-4xl text-white">
              ${listing.rent}
            </span>
            <span className="text-xs text-white/60">/月</span>
          </div>
          <h2 className="font-display text-2xl text-white leading-tight">
            {listing.title}
          </h2>
          <p className="text-xs text-white/70 mt-1">
            {listing.apartment_name} · {listing.address}
          </p>
          <p className="text-xs text-white/50 mt-1">{infoParts.join(" / ")}</p>
          <p className="text-[10px] text-white/40 mt-2 uppercase tracking-wider">
            {listing.poster_name} · {relativeTime(listing.created_at)}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact */}
          <div
            className="p-4 border-[3px] border-[var(--black)]"
            style={{ background: gold }}
          >
            <p
              className="text-[10px] uppercase tracking-wider font-display mb-1"
              style={{ color: "var(--black)" }}
            >
              CONTACT
            </p>
            <p
              className="font-display text-2xl"
              style={{ color: "var(--black)" }}
            >
              {listing.contact}
            </p>
          </div>

          {/* Dates */}
          {(listing.move_in_date || listing.move_out_date) && (
            <div>
              <h3
                className="font-display text-sm tracking-wider mb-2"
                style={{ color: "var(--mid)" }}
              >
                DATES
              </h3>
              <div className="flex gap-4">
                {listing.move_in_date && (
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--mid)" }}
                    >
                      入住
                    </p>
                    <p
                      className="font-display text-lg"
                      style={{ color: "var(--black)" }}
                    >
                      {listing.move_in_date}
                    </p>
                  </div>
                )}
                {listing.move_out_date && (
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--mid)" }}
                    >
                      结束
                    </p>
                    <p
                      className="font-display text-lg"
                      style={{ color: "var(--black)" }}
                    >
                      {listing.move_out_date}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div>
              <h3
                className="font-display text-sm tracking-wider mb-2"
                style={{ color: "var(--mid)" }}
              >
                AMENITIES
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {listing.amenities.map((a) => (
                  <span key={a} className="brutal-tag">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div>
              <h3
                className="font-display text-sm tracking-wider mb-1"
                style={{ color: "var(--mid)" }}
              >
                DESCRIPTION
              </h3>
              <p
                className="text-xs leading-relaxed whitespace-pre-line"
                style={{ color: "var(--black)" }}
              >
                {listing.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
