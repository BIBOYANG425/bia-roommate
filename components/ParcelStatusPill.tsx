"use client";

import { PARCEL_STATUS_META, type ParcelStatus } from "@/lib/types";

const TONE_STYLES: Record<
  (typeof PARCEL_STATUS_META)[ParcelStatus]["tone"],
  { bg: string; fg: string }
> = {
  pending: { bg: "var(--beige)", fg: "var(--mid)" },
  active: { bg: "var(--gold)", fg: "var(--black)" },
  good: { bg: "#1c6f3d", fg: "white" },
  bad: { bg: "var(--cardinal)", fg: "white" },
};

export default function ParcelStatusPill({
  status,
  size = "md",
}: {
  status: ParcelStatus;
  size?: "sm" | "md";
}) {
  const meta = PARCEL_STATUS_META[status];
  const tone = TONE_STYLES[meta.tone];
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`font-display inline-block border-[2px] border-[var(--black)] tracking-[0.1em] ${pad}`}
      style={{ background: tone.bg, color: tone.fg }}
    >
      {meta.label}
    </span>
  );
}
