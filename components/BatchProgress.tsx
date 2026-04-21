"use client";

// Stacked horizontal bar + legend showing count per status across a group
// of parcels. Used on the admin shipment detail and dashboard home.

import {
  PARCEL_STATUS_META,
  type Parcel,
  type ParcelStatus,
} from "@/lib/types";

interface Props {
  parcels: Pick<Parcel, "status">[];
}

const TONE_COLORS: Record<
  (typeof PARCEL_STATUS_META)[ParcelStatus]["tone"],
  string
> = {
  pending: "var(--beige)",
  active: "var(--gold)",
  good: "#1c6f3d",
  bad: "var(--cardinal)",
};

export default function BatchProgress({ parcels }: Props) {
  const counts = {} as Record<ParcelStatus, number>;
  for (const p of parcels) {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
  }
  const total = parcels.length;

  if (total === 0) {
    return (
      <p
        className="text-xs"
        style={{ color: "var(--mid)" }}
      >
        暂无已关联的包裹
      </p>
    );
  }

  const segments = (Object.keys(counts) as ParcelStatus[])
    .filter((s) => counts[s] > 0)
    .sort((a, b) => counts[b] - counts[a]);

  return (
    <div>
      <div
        className="flex w-full h-5 border-[3px] border-[var(--black)] overflow-hidden"
        style={{ background: "var(--cream)" }}
      >
        {segments.map((s) => {
          const tone = PARCEL_STATUS_META[s].tone;
          const pct = (counts[s] / total) * 100;
          return (
            <div
              key={s}
              title={`${PARCEL_STATUS_META[s].label}: ${counts[s]}`}
              style={{
                width: `${pct}%`,
                background: TONE_COLORS[tone],
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        {segments.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 border-[2px] border-[var(--black)]"
              style={{ background: TONE_COLORS[PARCEL_STATUS_META[s].tone] }}
            />
            <span style={{ color: "var(--black)" }}>
              {PARCEL_STATUS_META[s].label}
            </span>
            <span style={{ color: "var(--mid)" }}>· {counts[s]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
