"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { SHIPPING_METHOD_META, type Parcel } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import ParcelStatusPill from "./ParcelStatusPill";

export default function ParcelCard({
  parcel,
  packRequested = false,
}: {
  parcel: Parcel;
  /** True when this parcel is part of an open pack_requests row. */
  packRequested?: boolean;
}) {
  const thumbPath = parcel.photos?.[0] ?? null;
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const weightKg = parcel.weight_grams
    ? (parcel.weight_grams / 1000).toFixed(1)
    : null;

  // parcel-photos is a private bucket, so paths need a signed URL.
  useEffect(() => {
    if (!thumbPath) {
      setThumbUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from("parcel-photos")
        .createSignedUrl(thumbPath, 60 * 60);
      if (!cancelled) setThumbUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [thumbPath]);

  return (
    <Link
      href={`/shipping/${parcel.id}`}
      className="brutal-card cursor-pointer flex flex-col hover:-translate-y-0.5 transition-transform"
    >
      {/* Thumbnail (or placeholder) */}
      <div
        className="relative w-full h-36 border-b-[3px] border-[var(--black)] flex items-center justify-center overflow-hidden"
        style={{ background: "var(--beige)" }}
      >
        {thumbUrl ? (
          <Image
            src={thumbUrl}
            alt={parcel.description}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span
            className="font-display text-4xl tracking-[0.15em]"
            style={{ color: "var(--mid)" }}
          >
            PARCEL
          </span>
        )}
        {/* Status pill pinned top-right */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <ParcelStatusPill status={parcel.status} size="sm" />
          {packRequested && (
            <span
              className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)]"
              style={{ background: "var(--gold)", color: "var(--black)" }}
            >
              已申请打包
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Member ID chip */}
        <span
          className="font-display text-[10px] tracking-[0.15em] inline-block w-fit px-2 py-0.5 border-[2px]"
          style={{
            borderColor: "var(--black)",
            background: "var(--cream)",
            color: "var(--black)",
          }}
        >
          {parcel.member_id}
        </span>

        {/* Description */}
        <h3
          className="font-display text-base leading-tight line-clamp-2"
          style={{ color: "var(--black)" }}
        >
          {parcel.description}
        </h3>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider">
          {parcel.shipping_method && (
            <span style={{ color: "var(--cardinal)" }}>
              {SHIPPING_METHOD_META[parcel.shipping_method].icon}{" "}
              {SHIPPING_METHOD_META[parcel.shipping_method].label}
            </span>
          )}
          {parcel.category && (
            <span style={{ color: "var(--mid)" }}>{parcel.category}</span>
          )}
          {parcel.carrier_cn && (
            <span style={{ color: "var(--mid)" }}>{parcel.carrier_cn}</span>
          )}
          {weightKg && (
            <span style={{ color: "var(--mid)" }}>{weightKg}kg</span>
          )}
          {parcel.declared_value_cny !== null && (
            <span style={{ color: "var(--mid)" }}>
              ¥{parcel.declared_value_cny}
            </span>
          )}
        </div>

        {/* Footer: created time + CTA */}
        <div className="mt-auto pt-3 border-t-[2px] border-[var(--black)] flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--mid)" }}
          >
            {relativeTime(parcel.created_at)}
          </span>
          <span
            className="font-display text-xs tracking-wider"
            style={{ color: "var(--cardinal)" }}
          >
            VIEW →
          </span>
        </div>
      </div>
    </Link>
  );
}
