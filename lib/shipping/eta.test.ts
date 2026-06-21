import { describe, expect, it } from "vitest";
import { deriveEta } from "./eta";
import type { Parcel, Shipment, ShippingRoute } from "@/lib/types";

// Fixed clock so windows are deterministic.
const NOW = Date.parse("2026-06-20T12:00:00Z");

const p = (status: Parcel["status"]) => ({ status });
const ship = (departed_cn_at: string | null): Pick<Shipment, "departed_cn_at"> => ({
  departed_cn_at,
});
const route = (
  transit_days_estimate: number | null,
  estimated_arrival_date: string | null = null,
): Pick<ShippingRoute, "transit_days_estimate" | "estimated_arrival_date"> => ({
  transit_days_estimate,
  estimated_arrival_date,
});

describe("deriveEta", () => {
  it("renders nothing for non-transit statuses", () => {
    for (const s of ["expected", "arrived_us", "picked_up", "lost", "returned", "disputed"] as const) {
      const r = deriveEta(p(s), ship("2026-06-15"), route(10), NOW);
      expect(r.kind).toBe("none");
      expect(r.label).toBe("");
    }
  });

  it("departed + transit days → a future ±2-day window", () => {
    // 2026-06-15 + 10d = 06-25; window 06-23 — 06-27 (future vs NOW).
    const r = deriveEta(p("in_transit"), ship("2026-06-15T00:00:00Z"), route(10), NOW);
    expect(r.kind).toBe("estimate");
    expect(r.label).toContain("预计到达");
    expect(r.label).toContain("—");
    expect(r.sub).toBe("预计时间，以实际到件为准");
  });

  it("departed + transit but whole window already passed → overdue, not a stale date", () => {
    const r = deriveEta(p("in_transit"), ship("2026-05-01T00:00:00Z"), route(10), NOW);
    expect(r.kind).toBe("estimate");
    expect(r.label).toBe("预计到达时间已过，等待到件更新");
  });

  it("no departure date → falls back to route's future estimated_arrival_date", () => {
    const r = deriveEta(p("in_transit"), ship(null), route(null, "2026-06-25"), NOW);
    expect(r.kind).toBe("estimate");
    expect(r.label).toContain("按本线路公告");
  });

  it("route arrival date in the past is ignored", () => {
    // Past route date + a transit estimate → drops to the range branch.
    const r = deriveEta(p("in_transit"), ship(null), route(12, "2026-06-01"), NOW);
    expect(r.kind).toBe("range");
    expect(r.label).toContain("~12 天");
  });

  it("received_cn with only a transit estimate → honest 'clock not started' range", () => {
    const r = deriveEta(p("received_cn"), null, route(14), NOW);
    expect(r.kind).toBe("range");
    expect(r.label).toContain("发车后开始计算");
  });

  it("in_transit with no usable data → honest fallback, never a fake countdown", () => {
    const r = deriveEta(p("in_transit"), null, undefined, NOW);
    expect(r.kind).toBe("none");
    expect(r.label).toBe("到达时间待线路公布");
  });

  it("ignores a zero/negative transit estimate", () => {
    const r = deriveEta(p("in_transit"), ship("2026-06-15"), route(0), NOW);
    // transit unusable, no route date → fallback
    expect(r.kind).toBe("none");
    expect(r.label).toBe("到达时间待线路公布");
  });
});
