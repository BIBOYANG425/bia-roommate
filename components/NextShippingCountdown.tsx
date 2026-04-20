"use client";

// Prominent "next departure" section for the shipping dashboard. Sea + Air
// render as the two primary columns (matches the user's spec). Sensitive
// appears as a secondary row below when its route row exists. Ticks once a
// minute — seconds would feel noisy for days-away dates.

import { useEffect, useState } from "react";
import {
  SHIPPING_METHOD_META,
  type ShippingRoute,
} from "@/lib/types";

interface Props {
  routes: ShippingRoute[];
  onApply: () => void;
}

function useNowMinute() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatCountdown(target: number, now: number) {
  const diff = target - now;
  if (diff <= 0) return { expired: true, parts: [] as { label: string; value: number }[] };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return {
    expired: false,
    parts: [
      { label: "天", value: days },
      { label: "时", value: hours },
      { label: "分", value: minutes },
    ],
  };
}

function formatDate(dStr: string) {
  const d = new Date(dStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function RouteCountdown({
  route,
  now,
  prominent,
}: {
  route: ShippingRoute;
  now: number;
  prominent?: boolean;
}) {
  const meta = SHIPPING_METHOD_META[route.method];
  const hasDate = !!route.next_departure_date;
  // next_departure_date is YYYY-MM-DD; target the end of that day so we don't
  // prematurely show "expired" at midnight UTC for an admin-set local date.
  const target = hasDate
    ? new Date(`${route.next_departure_date}T23:59:59`).getTime()
    : 0;
  const countdown = hasDate ? formatCountdown(target, now) : null;

  return (
    <div
      className="brutal-container p-5 flex flex-col"
      style={{
        background: prominent ? "var(--cream)" : "var(--beige)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={prominent ? "text-2xl" : "text-lg"}>{meta.icon}</span>
        <h3
          className={`font-display tracking-[0.1em] ${prominent ? "text-xl" : "text-base"}`}
          style={{ color: "var(--black)" }}
        >
          {route.label}
        </h3>
        {route.frequency_label && (
          <span
            className="font-display text-[10px] tracking-wider ml-auto px-2 py-0.5 border-[2px] border-[var(--black)]"
            style={{ background: "var(--gold)", color: "var(--black)" }}
          >
            {route.frequency_label}
          </span>
        )}
      </div>

      {hasDate ? (
        <>
          <p
            className="font-display text-sm mt-1"
            style={{ color: "var(--black)" }}
          >
            {formatDate(route.next_departure_date!)}
          </p>
          {countdown && !countdown.expired ? (
            <div className="flex items-baseline gap-3 mt-3">
              {countdown.parts.map((p) => (
                <div key={p.label} className="flex items-baseline gap-1">
                  <span
                    className={`font-display ${prominent ? "text-[40px] sm:text-[56px]" : "text-[32px]"} leading-none`}
                    style={{ color: "var(--cardinal)" }}
                  >
                    {String(p.value).padStart(2, "0")}
                  </span>
                  <span
                    className="font-display text-xs tracking-wider"
                    style={{ color: "var(--mid)" }}
                  >
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="font-display text-xs tracking-wider mt-3 px-2 py-1 border-[2px] border-[var(--black)] w-fit"
              style={{ background: "var(--cardinal)", color: "white" }}
            >
              已发车 / 等待下一班公布
            </p>
          )}
          {route.cutoff_note && (
            <p
              className="text-[11px] mt-3"
              style={{ color: "var(--mid)" }}
            >
              {route.cutoff_note}
            </p>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col justify-center py-3">
          <p
            className="font-display text-sm tracking-wider"
            style={{ color: "var(--mid)" }}
          >
            暂无发货日程
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--mid)" }}>
            下一班发车时间待公布
          </p>
        </div>
      )}

      {route.price_per_kg_cny && (
        <p
          className="text-[10px] mt-auto pt-3 uppercase tracking-wider"
          style={{ color: "var(--mid)" }}
        >
          参考价 ¥{route.price_per_kg_cny}/kg
        </p>
      )}
    </div>
  );
}

export default function NextShippingCountdown({ routes, onApply }: Props) {
  const now = useNowMinute();

  if (routes.length === 0) return null;

  const sea = routes.find((r) => r.method === "sea");
  const air = routes.find((r) => r.method === "air");
  const sensitive = routes.find((r) => r.method === "sensitive");

  return (
    <section className="relative">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2
            className="font-display text-[24px] sm:text-[32px] leading-none"
            style={{ color: "var(--black)" }}
          >
            NEXT SHIPPING
          </h2>
          <p
            className="font-display text-sm tracking-[0.15em] mt-1"
            style={{ color: "var(--mid)" }}
          >
            下一班发货
          </p>
        </div>
        <button
          type="button"
          onClick={onApply}
          className="brutal-btn"
          style={{ background: "var(--cardinal)", color: "white" }}
        >
          申请专属急件（加急 · 独享）→
        </button>
      </div>

      {/* Primary: sea + air side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {sea && <RouteCountdown route={sea} now={now} prominent />}
        {air && <RouteCountdown route={air} now={now} prominent />}
      </div>

      {/* Secondary: sensitive, if present */}
      {sensitive && (
        <RouteCountdown route={sensitive} now={now} />
      )}
    </section>
  );
}
