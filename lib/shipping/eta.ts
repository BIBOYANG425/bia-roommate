// Honest ETA derivation for a parcel's tracking page.
//
// The data to show a real arrival estimate already exists (shipment
// departed_cn_at + the route's transit_days_estimate / estimated_arrival_date)
// but was never rendered. This derives an arrival *window* — never a fake live
// countdown — and falls back to honest "no data" copy when inputs are missing.
//
// Only meaningful while the parcel is in_transit (primary) or received_cn
// (pre-departure estimate). Every other status returns kind "none" with an
// empty label so the caller renders nothing.

import type { Parcel, Shipment, ShippingRoute } from "@/lib/types";

export type EtaResult = {
  /**
   * "estimate" — a concrete date/window we trust enough to show.
   * "range"    — only a transit-days estimate, clock hasn't started.
   * "none"     — no usable data; `label` is honest fallback or empty.
   */
  kind: "estimate" | "range" | "none";
  /** Display string. Empty string ⇒ render nothing. */
  label: string;
  /** Optional muted sub-line, e.g. the "以实际到件为准" disclaimer. */
  sub?: string;
};

const DAY_MS = 86_400_000;

function parseTs(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : t;
}

// shipping_routes.estimated_arrival_date is a YYYY-MM-DD date. Anchor it to the
// end of that local day so we don't prematurely treat it as past at midnight
// UTC — same trick NextShippingCountdown uses for next_departure_date.
function parseDateEod(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = new Date(`${s}T23:59:59`).getTime();
  return Number.isNaN(t) ? null : t;
}

function fmtDay(ms: number): string {
  return new Date(ms).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

const DISCLAIMER = "预计时间，以实际到件为准";

/**
 * Derive an honest arrival estimate for one parcel.
 *
 * @param route the shipping_routes row matching parcel.shipping_method (or undefined)
 * @param now   injectable clock for tests (defaults to Date.now())
 */
export function deriveEta(
  parcel: Pick<Parcel, "status">,
  shipment: Pick<Shipment, "departed_cn_at"> | null,
  route: Pick<ShippingRoute, "transit_days_estimate" | "estimated_arrival_date"> | undefined,
  now: number = Date.now(),
): EtaResult {
  // ETA only makes sense before arrival. Anything else: render nothing.
  if (parcel.status !== "in_transit" && parcel.status !== "received_cn") {
    return { kind: "none", label: "" };
  }

  const departed = parseTs(shipment?.departed_cn_at);
  const transit =
    route?.transit_days_estimate && route.transit_days_estimate > 0
      ? route.transit_days_estimate
      : null;

  // 1) Departed + transit days → a ±2-day window (the real ETA for in_transit).
  if (departed && transit) {
    const eta = departed + transit * DAY_MS;
    const hi = eta + 2 * DAY_MS;
    if (hi < now) {
      // Overdue: don't show a stale past window.
      return {
        kind: "estimate",
        label: "预计到达时间已过，等待到件更新",
        sub: "以实际到件为准",
      };
    }
    const lo = eta - 2 * DAY_MS;
    return {
      kind: "estimate",
      label: `预计到达 · ETA：${fmtDay(lo)} — ${fmtDay(hi)}`,
      sub: DISCLAIMER,
    };
  }

  // 2) Route's published arrival date (future only).
  const routeEta = parseDateEod(route?.estimated_arrival_date);
  if (routeEta && routeEta >= now) {
    return {
      kind: "estimate",
      label: `预计到达：${fmtDay(routeEta)}（按本线路公告）`,
      sub: DISCLAIMER,
    };
  }

  // 3) Transit-days estimate only — no departure date yet (e.g. received_cn
  //    awaiting a batch). Be explicit that the clock hasn't started.
  if (transit) {
    return {
      kind: "range",
      label: `国际段一般 ~${transit} 天 · 发车后开始计算`,
    };
  }

  // 4) Honest no-data.
  return { kind: "none", label: "到达时间待线路公布" };
}
