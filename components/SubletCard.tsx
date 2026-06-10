"use client";

import Image from "next/image";
import { SubletListing } from "@/lib/types";
import { relativeTime, schoolAccent } from "@/lib/utils";

export default function SubletCard({
  listing,
  onClick,
}: {
  listing: SubletListing;
  onClick: () => void;
}) {
  const accent = schoolAccent(listing.school);
  const thumb = listing.photos?.[0];

  const infoParts = [
    listing.room_type,
    listing.bathrooms,
    listing.gender_preference,
  ].filter(Boolean);

  return (
    <div
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-lg shadow-black/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/[0.08]"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div
        className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-[#eef6f4]"
      >
        {thumb ? (
          <Image
            src={thumb}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <span className="heading-serif text-3xl text-[#9bb9b5]">
            No photo
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Price */}
        <div className="flex items-baseline justify-between">
          <span className="heading-serif text-4xl" style={{ color: accent }}>
            ${listing.rent}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#999]">
            /月
          </span>
        </div>

        {/* Title & address */}
        <h3
          className="truncate text-lg font-semibold leading-tight text-[#171717]"
          style={{ fontFamily: "var(--font-display-zh)" }}
        >
          {listing.title}
        </h3>
        <p className="truncate text-xs text-[#646464]">
          {listing.apartment_name} · {listing.address}
        </p>

        {/* Info tags */}
        {infoParts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {infoParts.map((info) => (
              <span
                key={info}
                className="rounded-full border border-black/5 bg-[#F9FAF7] px-2.5 py-1 text-[11px] font-medium text-[#646464]"
              >
                {info}
              </span>
            ))}
          </div>
        )}

        {/* Dates */}
        {(listing.move_in_date || listing.move_out_date) && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#999]">
            {listing.move_in_date && `入住 ${listing.move_in_date}`}
            {listing.move_in_date && listing.move_out_date && " → "}
            {listing.move_out_date && `${listing.move_out_date}`}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#999]">
            {relativeTime(listing.created_at)}
          </span>
          <span
            className="text-xs font-bold uppercase tracking-wide transition-transform duration-200 group-hover:translate-x-1"
            style={{ color: accent }}
          >
            View details →
          </span>
        </div>
      </div>
    </div>
  );
}
