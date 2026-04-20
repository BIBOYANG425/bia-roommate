"use client";

// Lifted from app/shipping/admin/page.tsx — routes half.
// Shell provides chrome (header, sidebar nav, admin gate), so this page
// only renders the editor content.

import { useEffect, useState } from "react";
import Field from "@/components/admin/Field";
import {
  SHIPPING_METHOD_META,
  SHIPPING_METHOD_ORDER,
  type ShippingRoute,
} from "@/lib/types";

type RouteDraft = Partial<ShippingRoute> & { id: string };

export default function AdminShippingRoutesPage() {
  const [routes, setRoutes] = useState<ShippingRoute[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RouteDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/shipping/admin/routes", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as ShippingRoute[];
        setRoutes(
          [...data].sort(
            (a, b) =>
              (SHIPPING_METHOD_ORDER[a.method] ?? 99) -
              (SHIPPING_METHOD_ORDER[b.method] ?? 99),
          ),
        );
      }
      setLoading(false);
    })();
  }, []);

  const patchRoute = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    const res = await fetch("/api/shipping/admin/routes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, id }),
    });
    setSavingId(null);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setToast(err.error ?? "保存失败");
      return;
    }
    const updated = (await res.json()) as ShippingRoute;
    setRoutes((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setToast("已保存");
    setTimeout(() => setToast(null), 1500);
  };

  const updateDraft = (id: string, patch: Partial<ShippingRoute>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { id }), ...patch },
    }));
  };

  const value = <K extends keyof ShippingRoute>(
    r: ShippingRoute,
    k: K,
  ): ShippingRoute[K] => {
    const draft = drafts[r.id];
    if (draft && k in draft) return draft[k] as ShippingRoute[K];
    return r[k];
  };

  if (loading) {
    return (
      <p
        className="font-display text-sm tracking-[0.2em]"
        style={{ color: "var(--mid)" }}
      >
        LOADING...
      </p>
    );
  }

  return (
    <>
      {toast && (
        <div
          className="fixed top-20 right-4 z-50 px-4 py-2 border-[3px] border-[var(--black)] font-display text-sm"
          style={{ background: "var(--gold)", color: "var(--black)" }}
        >
          {toast}
        </div>
      )}

      <h1
        className="font-display text-[32px] mb-5 border-b-[3px] border-[var(--black)] pb-2"
        style={{ color: "var(--black)" }}
      >
        ROUTES / 专线
      </h1>
      <p className="text-xs mb-5" style={{ color: "var(--mid)" }}>
        修改发货日程、价格和参考报价。保存后立即对用户可见。
      </p>

      <div className="space-y-4">
        {routes.map((r) => {
          const meta = SHIPPING_METHOD_META[r.method];
          const dirty = !!drafts[r.id];
          return (
            <div
              key={r.id}
              className="brutal-container p-5"
              style={{ background: "var(--beige)" }}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3
                  className="font-display text-xl tracking-[0.1em]"
                  style={{ color: "var(--black)" }}
                >
                  <span className="mr-2">{meta.icon}</span>
                  {r.label}
                  <span
                    className="text-xs tracking-wider ml-2"
                    style={{ color: "var(--mid)" }}
                  >
                    [{r.method}]
                  </span>
                </h3>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={value(r, "active")}
                    onChange={(e) =>
                      updateDraft(r.id, { active: e.target.checked })
                    }
                  />
                  active
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Field label="LABEL">
                  <input
                    type="text"
                    value={value(r, "label") ?? ""}
                    onChange={(e) =>
                      updateDraft(r.id, { label: e.target.value })
                    }
                    className="brutal-input"
                  />
                </Field>
                <Field label="PRICE PER KG (CNY)">
                  <input
                    type="number"
                    step="0.01"
                    value={value(r, "price_per_kg_cny") ?? ""}
                    onChange={(e) =>
                      updateDraft(r.id, {
                        price_per_kg_cny:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className="brutal-input"
                  />
                </Field>
                <Field label="NEXT DEPARTURE">
                  <input
                    type="date"
                    value={value(r, "next_departure_date") ?? ""}
                    onChange={(e) =>
                      updateDraft(r.id, {
                        next_departure_date: e.target.value || null,
                      })
                    }
                    className="brutal-input"
                  />
                </Field>
                <Field label="EST. ARRIVAL">
                  <input
                    type="date"
                    value={value(r, "estimated_arrival_date") ?? ""}
                    onChange={(e) =>
                      updateDraft(r.id, {
                        estimated_arrival_date: e.target.value || null,
                      })
                    }
                    className="brutal-input"
                  />
                </Field>
                <Field label="TRANSIT DAYS">
                  <input
                    type="number"
                    value={value(r, "transit_days_estimate") ?? ""}
                    onChange={(e) =>
                      updateDraft(r.id, {
                        transit_days_estimate:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className="brutal-input"
                  />
                </Field>
                <Field label="CUTOFF NOTE">
                  <input
                    type="text"
                    value={value(r, "cutoff_note") ?? ""}
                    onChange={(e) =>
                      updateDraft(r.id, {
                        cutoff_note: e.target.value || null,
                      })
                    }
                    placeholder="如：本周日截单"
                    className="brutal-input"
                  />
                </Field>
                <Field label="FREQUENCY LABEL">
                  <input
                    type="text"
                    value={value(r, "frequency_label") ?? ""}
                    onChange={(e) =>
                      updateDraft(r.id, {
                        frequency_label: e.target.value || null,
                      })
                    }
                    placeholder="如：每周发车 / 双周发车"
                    className="brutal-input"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="NOTES">
                    <textarea
                      value={value(r, "notes") ?? ""}
                      onChange={(e) =>
                        updateDraft(r.id, {
                          notes: e.target.value || null,
                        })
                      }
                      rows={2}
                      className="brutal-input resize-none"
                    />
                  </Field>
                </div>
              </div>

              <button
                type="button"
                onClick={() => patchRoute(r.id)}
                disabled={!dirty || savingId === r.id}
                className="brutal-btn mt-4"
                style={
                  dirty && savingId !== r.id
                    ? { background: "var(--cardinal)", color: "white" }
                    : {
                        background: "var(--cream)",
                        color: "var(--mid)",
                        cursor: "not-allowed",
                      }
                }
              >
                {savingId === r.id ? "保存中..." : dirty ? "保存" : "未修改"}
              </button>
            </div>
          );
        })}
        {routes.length === 0 && (
          <p className="text-sm" style={{ color: "var(--mid)" }}>
            还没有专线。请先跑 shipping_routes migration。
          </p>
        )}
      </div>
    </>
  );
}
