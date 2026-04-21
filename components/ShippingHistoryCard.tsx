"use client";

// Public history of completed shipping batches — trust signal showing
// weight, transit duration, and method for each past run.

import {
  SHIPPING_METHOD_META,
  type ShipmentHistoryEntry,
} from "@/lib/types";

interface Props {
  entries: ShipmentHistoryEntry[];
}

function formatDate(dStr: string | null): string {
  if (!dStr) return "—";
  return new Date(dStr).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

export default function ShippingHistoryCard({ entries }: Props) {
  if (entries.length === 0) return null;

  // Roll-up totals across the whole list for a little hero row
  const totalParcels = entries.reduce((n, e) => n + e.parcel_count, 0);
  const totalWeightKg =
    entries.reduce((n, e) => n + e.total_weight_grams, 0) / 1000;

  return (
    <section className="relative">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2
            className="font-display text-[24px] sm:text-[32px] leading-none"
            style={{ color: "var(--black)" }}
          >
            HISTORY
          </h2>
          <p
            className="font-display text-sm tracking-[0.15em] mt-1"
            style={{ color: "var(--mid)" }}
          >
            历史集运
          </p>
        </div>
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]"
          style={{ color: "var(--mid)" }}
        >
          <span>
            <span
              className="font-display text-base"
              style={{ color: "var(--cardinal)" }}
            >
              {entries.length}
            </span>{" "}
            批次
          </span>
          <span>
            <span
              className="font-display text-base"
              style={{ color: "var(--cardinal)" }}
            >
              {totalParcels}
            </span>{" "}
            个包裹
          </span>
          <span>
            <span
              className="font-display text-base"
              style={{ color: "var(--cardinal)" }}
            >
              {totalWeightKg.toFixed(1)}
            </span>{" "}
            kg
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map((entry) => {
          const methodMeta = entry.dominant_method
            ? SHIPPING_METHOD_META[entry.dominant_method]
            : null;
          const weightKg = (entry.total_weight_grams / 1000).toFixed(1);
          return (
            <div
              key={entry.id}
              className="brutal-container p-4 flex flex-col"
              style={{ background: "var(--cream)" }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3
                  className="font-display text-base tracking-[0.08em] leading-tight"
                  style={{ color: "var(--black)" }}
                >
                  {entry.name}
                </h3>
                {methodMeta && (
                  <span
                    className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)] shrink-0"
                    style={{ background: "var(--gold)", color: "var(--black)" }}
                  >
                    {methodMeta.icon} {methodMeta.label}
                  </span>
                )}
              </div>

              <p
                className="text-[11px] mb-3"
                style={{ color: "var(--mid)" }}
              >
                {formatDate(entry.departed_cn_at)} →{" "}
                {formatDate(entry.arrived_us_at)}
                {entry.carrier && <> · {entry.carrier}</>}
              </p>

              <dl className="grid grid-cols-3 gap-2 text-center mt-auto">
                <Stat
                  value={entry.transit_days !== null ? `${entry.transit_days}` : "—"}
                  unit={entry.transit_days !== null ? "天" : ""}
                  label="运输时长"
                />
                <Stat value={weightKg} unit="kg" label="总重量" />
                <Stat
                  value={String(entry.parcel_count)}
                  unit="件"
                  label="包裹数"
                />
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({
  value,
  unit,
  label,
}: {
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div
      className="border-[2px] border-[var(--black)] py-2 px-1"
      style={{ background: "var(--beige)" }}
    >
      <p
        className="font-display text-xl sm:text-2xl leading-none"
        style={{ color: "var(--black)" }}
      >
        {value}
        {unit && (
          <span
            className="text-[10px] tracking-wider ml-0.5"
            style={{ color: "var(--mid)" }}
          >
            {unit}
          </span>
        )}
      </p>
      <p
        className="text-[9px] uppercase tracking-wider mt-1"
        style={{ color: "var(--mid)" }}
      >
        {label}
      </p>
    </div>
  );
}
