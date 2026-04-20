"use client";

import {
  SHIPPING_METHOD_VALUES,
  SHIPPING_METHOD_META,
  type ShippingMethod,
  type ShippingRoute,
} from "@/lib/types";

interface Props {
  value: ShippingMethod | null;
  onChange: (method: ShippingMethod | null) => void;
  routes: ShippingRoute[];
}

export default function ShippingMethodPicker({
  value,
  onChange,
  routes,
}: Props) {
  const routeMap = Object.fromEntries(routes.map((r) => [r.method, r]));

  return (
    <div className="space-y-3">
      <div className="flex gap-0">
        {SHIPPING_METHOD_VALUES.map((m) => {
          const active = value === m;
          const meta = SHIPPING_METHOD_META[m];
          const route = routeMap[m];
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(active ? null : m)}
              className="flex-1 font-display text-[11px] sm:text-base tracking-[0.08em] sm:tracking-[0.1em] px-2 sm:px-4 py-3 border-[3px] border-[var(--black)] -mr-[3px] first:mr-0 transition-colors leading-tight"
              style={{
                background: active ? "var(--cardinal)" : "var(--cream)",
                color: active ? "white" : "var(--mid)",
              }}
            >
              <span className="mr-1">{meta.icon}</span>
              <span className="whitespace-nowrap">{meta.label}</span>
              {route?.transit_days_estimate && (
                <span className="block text-[9px] sm:text-[10px] tracking-wider mt-0.5 opacity-80">
                  ~{route.transit_days_estimate} 天
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Reference price hint */}
      {value && routeMap[value]?.price_per_kg_cny ? (
        <p
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "var(--mid)" }}
        >
          参考价 ¥{routeMap[value]!.price_per_kg_cny}/kg · 价格以每批报价为准
        </p>
      ) : (
        <p
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "var(--mid)" }}
        >
          价格以每批报价为准
        </p>
      )}
    </div>
  );
}
