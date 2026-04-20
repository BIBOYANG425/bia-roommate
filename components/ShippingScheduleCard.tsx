"use client";

import {
  SHIPPING_METHOD_META,
  SHIPPING_METHOD_ORDER,
  type ShippingRoute,
} from "@/lib/types";

interface Props {
  routes: ShippingRoute[];
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function RouteColumn({ route }: { route: ShippingRoute | undefined }) {
  if (!route) return null;
  const meta = SHIPPING_METHOD_META[route.method];
  const hasSchedule = route.next_departure_date;

  return (
    <div
      className="flex-1 p-4 border-[3px] border-[var(--black)]"
      style={{ background: "var(--cream)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{meta.icon}</span>
        <h3
          className="font-display text-base tracking-[0.1em]"
          style={{ color: "var(--black)" }}
        >
          {route.label}
        </h3>
      </div>

      {hasSchedule ? (
        <dl className="space-y-2 text-sm">
          <div>
            <dt
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--mid)" }}
            >
              下一班发货
            </dt>
            <dd style={{ color: "var(--black)" }}>
              {formatDate(route.next_departure_date)}
            </dd>
          </div>
          {route.estimated_arrival_date && (
            <div>
              <dt
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                预计到达
              </dt>
              <dd style={{ color: "var(--black)" }}>
                {formatDate(route.estimated_arrival_date)}
              </dd>
            </div>
          )}
          {route.transit_days_estimate && (
            <div>
              <dt
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                时效
              </dt>
              <dd style={{ color: "var(--black)" }}>
                ~{route.transit_days_estimate} 天
              </dd>
            </div>
          )}
          {route.price_per_kg_cny && (
            <div>
              <dt
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                参考价
              </dt>
              <dd style={{ color: "var(--black)" }}>
                ¥{route.price_per_kg_cny}/kg
              </dd>
            </div>
          )}
          {route.cutoff_note && (
            <p className="text-[10px] mt-2" style={{ color: "var(--mid)" }}>
              {route.cutoff_note}
            </p>
          )}
        </dl>
      ) : (
        <p
          className="text-xs"
          style={{ color: "var(--mid)" }}
        >
          发货日程待公布
          {route.transit_days_estimate && (
            <span className="block mt-1">
              预计时效 ~{route.transit_days_estimate} 天
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export default function ShippingScheduleCard({ routes }: Props) {
  if (routes.length === 0) return null;

  const ordered = [...routes].sort(
    (a, b) =>
      (SHIPPING_METHOD_ORDER[a.method] ?? 99) -
      (SHIPPING_METHOD_ORDER[b.method] ?? 99),
  );

  return (
    <section className="relative">
      <h2
        className="font-display text-lg tracking-[0.15em] mb-3"
        style={{ color: "var(--black)" }}
      >
        SCHEDULE / 发货日程
      </h2>
      <div className="flex flex-col sm:flex-row gap-3">
        {ordered.map((r) => (
          <RouteColumn key={r.id} route={r} />
        ))}
      </div>
    </section>
  );
}
