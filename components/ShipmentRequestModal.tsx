"use client";

// Modal form — authenticated users request a special consolidation
// arrangement (unusual size, urgent timeline, sensitive items outside
// the regular batches, etc). POSTs to /api/shipping/requests.

import { useEffect, useState } from "react";
import {
  SHIPPING_METHOD_VALUES,
  SHIPPING_METHOD_META,
  type ShippingMethod,
} from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShipmentRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [method, setMethod] = useState<ShippingMethod | "">("");
  const [urgency, setUrgency] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const canSubmit = description.trim().length >= 5 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/shipping/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim(),
        expected_weight_grams: weight.trim() || null,
        preferred_method: method || null,
        urgency_note: urgency.trim() || null,
        contact: contact.trim() || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        setError("请先登录后再申请");
      } else {
        setError(err.error ?? "提交失败，请重试");
      }
      return;
    }
    onSuccess();
    setDescription("");
    setWeight("");
    setMethod("");
    setUrgency("");
    setContact("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: "rgba(26,20,16,0.7)" }}
      />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto brutal-container"
        style={{ background: "var(--cream)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
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
            EXPRESS REQUEST · 专属急件
          </span>
          <h2 className="font-display text-[28px] sm:text-[36px] text-white leading-[0.9] mt-1">
            申请专属急件
          </h2>
          <p className="text-xs text-white/70 mt-3">
            <strong>加急 · 独享 · 1v1 服务，价格更高。</strong>
            <br />
            不用等其他用户拼车，单独为你走特快专递。想走常规拼单的话，用下方的「打包申请」即可。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              className="font-display text-xs tracking-wider block mb-1"
              style={{ color: "var(--mid)" }}
            >
              急件说明 <span style={{ color: "var(--cardinal)" }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="如：3 天内送达 / 超大件独立打包 / 价值较高需要特别照看"
              maxLength={1000}
              className="brutal-input resize-none"
              required
            />
            <p
              className="text-[10px] mt-1 text-right uppercase tracking-wider"
              style={{ color: "var(--mid)" }}
            >
              {description.length}/1000
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="font-display text-xs tracking-wider block mb-1"
                style={{ color: "var(--mid)" }}
              >
                预估重量 (克)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="如 3000"
                min="0"
                max="500000"
                className="brutal-input"
              />
            </div>
            <div>
              <label
                className="font-display text-xs tracking-wider block mb-1"
                style={{ color: "var(--mid)" }}
              >
                优先线路
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as ShippingMethod)}
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
          </div>

          <div>
            <label
              className="font-display text-xs tracking-wider block mb-1"
              style={{ color: "var(--mid)" }}
            >
              时效要求 (可选)
            </label>
            <input
              type="text"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              placeholder="如：希望 10 天内送达 / 不急，下个月也行"
              maxLength={200}
              className="brutal-input"
            />
          </div>

          <div>
            <label
              className="font-display text-xs tracking-wider block mb-1"
              style={{ color: "var(--mid)" }}
            >
              联系方式 (可选)
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="微信号 / 邮箱 — 留空则用账号邮箱联系"
              maxLength={200}
              className="brutal-input"
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
            type="submit"
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
            {submitting ? "提交中..." : "提交申请"}
          </button>
        </form>
      </div>
    </div>
  );
}
