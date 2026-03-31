"use client";

import { SubletListing } from "@/lib/types";
import { relativeTime, schoolAccent, schoolCardClass } from "@/lib/utils";

export default function SubletCard({
  listing,
  onClick,
}: {
  listing: SubletListing;
  onClick: () => void;
}) {
  const accent = schoolAccent(listing.school);
  const cardClass = schoolCardClass(listing.school);
  const thumb = listing.photos?.[0];

  const infoParts = [
    listing.room_type,
    listing.bathrooms,
    listing.gender_preference,
  ].filter(Boolean);

  return (
    <div
      className={`brutal-card ${cardClass} cursor-pointer flex flex-col`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div
        className="w-full h-40 border-b-[3px] border-[var(--black)] flex items-center justify-center overflow-hidden"
        style={{ background: "var(--beige)" }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="font-display text-4xl"
            style={{ color: "var(--mid)" }}
          >
            NO PHOTO
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-2 flex-1">
        {/* Price */}
        <div className="flex items-baseline justify-between">
          <span className="font-display text-3xl" style={{ color: accent }}>
            ${listing.rent}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--mid)" }}
          >
            /月
          </span>
        </div>

        {/* Title & address */}
        <h3
          className="font-display text-lg leading-tight truncate"
          style={{ color: "var(--black)" }}
        >
          {listing.title}
        </h3>
        <p className="text-[11px] truncate" style={{ color: "var(--mid)" }}>
          {listing.apartment_name} · {listing.address}
        </p>

        {/* Info tags */}
        {infoParts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {infoParts.map((info) => (
              <span key={info} className="brutal-tag">
                {info}
              </span>
            ))}
          </div>
        )}

        {/* Dates */}
        {(listing.move_in_date || listing.move_out_date) && (
          <p
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--mid)" }}
          >
            {listing.move_in_date && `入住 ${listing.move_in_date}`}
            {listing.move_in_date && listing.move_out_date && " → "}
            {listing.move_out_date && `${listing.move_out_date}`}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t-[2px] border-[var(--black)] flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--mid)" }}
          >
            {relativeTime(listing.created_at)}
          </span>
          <span
            className="font-display text-xs tracking-wider"
            style={{ color: accent }}
          >
            VIEW DETAILS →
          </span>
        </div>
      </div>
    </div>
  );
}
