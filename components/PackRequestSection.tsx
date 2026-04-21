"use client";

// User-initiated pack request flow. Shows the user's received_cn parcels
// with checkboxes; clicking "申请打包发货" opens a modal for method +
// urgency + contact + notes. After submission, the parcels show a
// "已申请打包" badge via the parcelsInOpenRequest set passed by the parent.

import { useState } from "react";
import {
  SHIPPING_METHOD_VALUES,
  SHIPPING_METHOD_META,
  PACK_REQUEST_STATUS_LABELS,
  type Parcel,
  type ShippingMethod,
  type PackRequestWithParcels,
} from "@/lib/types";

interface Props {
  eligibleParcels: Parcel[];
  activeRequests: PackRequestWithParcels[];
  onSubmitted: () => void;
  onCancelled: () => void;
}

const OPEN_STATUSES = new Set(["pending", "contacted", "approved"]);

export default function PackRequestSection({
  eligibleParcels,
  activeRequests,
  onSubmitted,
  onCancelled,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState<ShippingMethod | "">("");
  const [urgency, setUrgency] = useState("");
  const [contact, setContact] = useState("");
  const [userNote, setUserNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Parcels that are already locked into a pending/in-progress request
  const lockedIds = new Set<string>();
  for (const r of activeRequests) {
    if (OPEN_STATUSES.has(r.status)) {
      for (const p of r.parcels ?? []) lockedIds.add(p.id);
    }
  }

  const pickable = eligibleParcels.filter((p) => !lockedIds.has(p.id));
  const canSubmit = selected.size > 0 && !submitting;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/shipping/pack-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parcel_ids: Array.from(selected),
        preferred_method: method || null,
        urgency_note: urgency.trim() || null,
        contact: contact.trim() || null,
        user_note: userNote.trim() || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setError(err.error ?? "提交失败，请重试");
      return;
    }
    setSelected(new Set());
    setMethod("");
    setUrgency("");
    setContact("");
    setUserNote("");
    setShowModal(false);
    onSubmitted();
  };

  const cancel = async (id: string) => {
    if (!confirm("确定取消这个打包申请？")) return;
    setCancellingId(id);
    const res = await fetch(`/api/shipping/pack-requests/${id}`, {
      method: "DELETE",
    });
    setCancellingId(null);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      alert(err.error ?? "取消失败");
      return;
    }
    onCancelled();
  };

  return (
    <section className="relative">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2
            className="font-display text-[24px] sm:text-[32px] leading-none"
            style={{ color: "var(--black)" }}
          >
            PACK REQUEST
          </h2>
          <p
            className="font-display text-sm tracking-[0.15em] mt-1"
            style={{ color: "var(--mid)" }}
          >
            打包申请 · 选仓库里的包裹拼单发货
          </p>
        </div>
      </div>

      {/* Active requests */}
      {activeRequests.length > 0 && (
        <div className="space-y-3 mb-5">
          {activeRequests.map((r) => {
            const isOpen = OPEN_STATUSES.has(r.status);
            const isTerminal = !isOpen;
            return (
              <div
                key={r.id}
                className="brutal-container p-4"
                style={{ background: isTerminal ? "var(--beige)" : "var(--gold)" }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <span
                      className="font-display text-[11px] tracking-[0.2em] px-2 py-0.5 border-[2px] border-[var(--black)]"
                      style={{ background: "var(--cream)", color: "var(--black)" }}
                    >
                      {PACK_REQUEST_STATUS_LABELS[r.status]}
                    </span>
                    {r.preferred_method && (
                      <span
                        className="ml-2 text-xs"
                        style={{ color: "var(--black)" }}
                      >
                        {SHIPPING_METHOD_META[r.preferred_method].icon}{" "}
                        {SHIPPING_METHOD_META[r.preferred_method].label}
                      </span>
                    )}
                  </div>
                  {r.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => cancel(r.id)}
                      disabled={cancellingId === r.id}
                      className="font-display text-[10px] tracking-wider underline"
                      style={{ color: "var(--cardinal)" }}
                    >
                      {cancellingId === r.id ? "取消中..." : "取消申请"}
                    </button>
                  )}
                </div>
                <p className="text-xs mb-2" style={{ color: "var(--black)" }}>
                  <strong>{r.parcels?.length ?? 0}</strong> 个包裹等待打包
                </p>
                {r.parcels && r.parcels.length > 0 && (
                  <div
                    className="flex flex-wrap gap-1 text-[11px]"
                    style={{ color: "var(--black)" }}
                  >
                    {r.parcels.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 border-[2px] border-[var(--black)]"
                        style={{ background: "var(--cream)" }}
                      >
                        {p.description.length > 20
                          ? p.description.slice(0, 20) + "…"
                          : p.description}
                      </span>
                    ))}
                  </div>
                )}
                {r.admin_note && (
                  <p
                    className="text-[11px] mt-2 pt-2 border-t-[2px] border-[var(--black)]"
                    style={{ color: "var(--black)" }}
                  >
                    <strong>运营回复：</strong>
                    {r.admin_note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Picker */}
      {pickable.length === 0 ? (
        <div
          className="brutal-container p-4 text-center"
          style={{ background: "var(--beige)" }}
        >
          <p className="text-sm" style={{ color: "var(--mid)" }}>
            {eligibleParcels.length === 0
              ? "仓库里还没有你的包裹 — 等国内快递签收后就能申请打包了。"
              : "你的仓库包裹都已经在申请中。等运营处理完就会进入下一班发货。"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs mb-3" style={{ color: "var(--mid)" }}>
            以下是仓库已签收、可以申请打包的包裹。勾选要一起打包的，然后提交 — 运营会私信你安排发货。
          </p>
          <div className="space-y-2 mb-4">
            {pickable.map((p) => {
              const active = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-3 border-[3px] border-[var(--black)] cursor-pointer transition-colors"
                  style={{
                    background: active ? "var(--gold)" : "var(--cream)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(p.id)}
                    className="shrink-0"
                  />
                  <span
                    className="font-display text-[10px] tracking-wider shrink-0"
                    style={{ color: "var(--black)" }}
                  >
                    {p.member_id}
                  </span>
                  <span
                    className="flex-1 min-w-0 text-sm truncate"
                    style={{ color: "var(--black)" }}
                  >
                    {p.description}
                  </span>
                  {p.weight_grams && (
                    <span
                      className="text-[11px] shrink-0"
                      style={{ color: "var(--mid)" }}
                    >
                      {(p.weight_grams / 1000).toFixed(1)} kg
                    </span>
                  )}
                  {p.shipping_method && (
                    <span
                      className="text-xs shrink-0"
                      style={{ color: "var(--mid)" }}
                    >
                      {SHIPPING_METHOD_META[p.shipping_method].icon}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            disabled={selected.size === 0}
            className="brutal-btn"
            style={
              selected.size > 0
                ? { background: "var(--cardinal)", color: "white" }
                : {
                    background: "var(--beige)",
                    color: "var(--mid)",
                    cursor: "not-allowed",
                  }
            }
          >
            申请打包发货（已选 {selected.size} 件）→
          </button>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(26,20,16,0.7)" }}
          />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto brutal-container"
            style={{ background: "var(--cream)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={submitting}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center border-[3px] border-[var(--black)] font-display text-lg hover:bg-[var(--gold)] transition-colors z-10"
              style={{ background: "var(--cream)" }}
            >
              X
            </button>

            <div
              className="p-6 border-b-[3px] border-[var(--black)]"
              style={{ background: "var(--cardinal)" }}
            >
              <span className="font-display text-[11px] tracking-[0.2em] text-white/60">
                PACK REQUEST · 打包申请
              </span>
              <h2 className="font-display text-[28px] sm:text-[36px] text-white leading-[0.9] mt-1">
                申请打包发货
              </h2>
              <p className="text-xs text-white/70 mt-3">
                选中了 <strong>{selected.size}</strong> 个包裹。提交后 BIA
                运营会通过你留的联系方式私信安排打包发货。
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  优先线路
                </label>
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as ShippingMethod | "")
                  }
                  className="brutal-input"
                >
                  <option value="">由 BIA 推荐</option>
                  {SHIPPING_METHOD_VALUES.map((m) => (
                    <option key={m} value={m}>
                      {SHIPPING_METHOD_META[m].icon}{" "}
                      {SHIPPING_METHOD_META[m].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  时效要求（可选）
                </label>
                <input
                  type="text"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  placeholder="如：希望两周内送达 / 不急，下一班就好"
                  maxLength={200}
                  className="brutal-input"
                />
              </div>

              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  联系方式（可选，留空用账号邮箱）
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="微信号 / 邮箱"
                  maxLength={200}
                  className="brutal-input"
                />
              </div>

              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  给运营的备注（可选）
                </label>
                <textarea
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  rows={2}
                  placeholder="如：某件包装坏了请检查、两个要分开发等"
                  maxLength={500}
                  className="brutal-input resize-none"
                />
              </div>

              {error && (
                <div
                  className="p-3 border-[3px]"
                  style={{
                    borderColor: "var(--cardinal)",
                    background: "var(--cardinal)",
                    color: "white",
                  }}
                >
                  <span className="font-display text-sm tracking-wider">
                    {error}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="brutal-btn w-full text-center"
                style={
                  canSubmit
                    ? { background: "var(--cardinal)", color: "white" }
                    : {
                        background: "var(--beige)",
                        color: "var(--mid)",
                        cursor: "not-allowed",
                      }
                }
              >
                {submitting ? "提交中..." : "提交打包申请"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
