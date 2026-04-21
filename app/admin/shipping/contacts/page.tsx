"use client";

// Lifted from app/shipping/admin/page.tsx — contacts half.
// Shell provides chrome; page renders just the editor content.

import { useEffect, useState } from "react";
import Image from "next/image";
import Field from "@/components/admin/Field";
import { supabase } from "@/lib/supabase";
import type {
  ShippingContact,
  ShippingContactType,
} from "@/lib/types";

type ContactDraft = Partial<ShippingContact> & { id: string };

const CONTACT_TYPE_LABELS: Record<ShippingContactType, string> = {
  wechat_group: "微信群",
  wechat_personal: "个人微信",
  email: "邮箱",
  george_bot: "George Bot",
};

export default function AdminShippingContactsPage() {
  const [contacts, setContacts] = useState<ShippingContact[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ContactDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/shipping/admin/contacts", {
        cache: "no-store",
      });
      if (res.ok) {
        setContacts((await res.json()) as ShippingContact[]);
      }
      setLoading(false);
    })();
  }, []);

  const patchContact = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    const res = await fetch("/api/shipping/admin/contacts", {
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
    const updated = (await res.json()) as ShippingContact;
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setToast("已保存");
    setTimeout(() => setToast(null), 1500);
  };

  const updateDraft = (id: string, patch: Partial<ShippingContact>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { id }), ...patch },
    }));
  };

  const uploadQr = async (id: string, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setToast("二维码最大 2MB");
      return;
    }
    setUploadingId(id);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `qr-${id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("shipping-contact-qr")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (upErr) {
      setUploadingId(null);
      setToast("上传失败：" + upErr.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("shipping-contact-qr").getPublicUrl(path);
    setUploadingId(null);
    updateDraft(id, { qr_code_url: publicUrl });
    setToast("二维码已上传，记得点保存");
    setTimeout(() => setToast(null), 2000);
  };

  const value = <K extends keyof ShippingContact>(
    c: ShippingContact,
    k: K,
  ): ShippingContact[K] => {
    const draft = drafts[c.id];
    if (draft && k in draft) return draft[k] as ShippingContact[K];
    return c[k];
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
        CONTACTS / 联系渠道
      </h1>
      <p className="text-xs mb-5" style={{ color: "var(--mid)" }}>
        微信群、个人微信、邮箱、George bot。值等于「待配置」的渠道不会显示给用户。
      </p>

      <div className="space-y-4">
        {contacts.map((c) => {
          const dirty = !!drafts[c.id];
          return (
            <div
              key={c.id}
              className="brutal-container p-5"
              style={{ background: "var(--beige)" }}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3
                  className="font-display text-lg tracking-[0.1em]"
                  style={{ color: "var(--black)" }}
                >
                  {CONTACT_TYPE_LABELS[c.type]}
                  <span
                    className="text-xs tracking-wider ml-2"
                    style={{ color: "var(--mid)" }}
                  >
                    [{c.type}]
                  </span>
                </h3>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={value(c, "active")}
                    onChange={(e) =>
                      updateDraft(c.id, { active: e.target.checked })
                    }
                  />
                  active
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Field label="LABEL (中文)">
                  <input
                    type="text"
                    value={value(c, "label") ?? ""}
                    onChange={(e) =>
                      updateDraft(c.id, { label: e.target.value })
                    }
                    className="brutal-input"
                  />
                </Field>
                <Field label="LABEL (EN)">
                  <input
                    type="text"
                    value={value(c, "label_en") ?? ""}
                    onChange={(e) =>
                      updateDraft(c.id, {
                        label_en: e.target.value || null,
                      })
                    }
                    className="brutal-input"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="VALUE (微信号 / 邮箱 / 链接)">
                    <input
                      type="text"
                      value={value(c, "value") ?? ""}
                      onChange={(e) =>
                        updateDraft(c.id, { value: e.target.value })
                      }
                      placeholder="待配置"
                      className="brutal-input"
                    />
                    <p
                      className="text-[10px] mt-1 uppercase tracking-wider"
                      style={{ color: "var(--mid)" }}
                    >
                      值等于「待配置」的联系方式不会向用户展示。
                    </p>
                  </Field>
                </div>
                <Field label="QR CODE (二维码图片 · 仅微信群需要)">
                  <div className="flex items-start gap-3">
                    {value(c, "qr_code_url") ? (
                      <Image
                        src={value(c, "qr_code_url") as string}
                        alt="QR code"
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover border-[3px] border-[var(--black)] shrink-0"
                        style={{ width: 80, height: 80 }}
                        unoptimized
                      />
                    ) : (
                      <div
                        className="shrink-0 border-[3px] border-dashed border-[var(--black)] flex items-center justify-center font-display text-[10px] tracking-wider"
                        style={{
                          width: 80,
                          height: 80,
                          background: "var(--beige)",
                          color: "var(--mid)",
                        }}
                      >
                        无
                      </div>
                    )}
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="cursor-pointer">
                        <span
                          className="brutal-btn inline-block text-xs"
                          style={{
                            background:
                              uploadingId === c.id
                                ? "var(--beige)"
                                : "var(--cardinal)",
                            color:
                              uploadingId === c.id ? "var(--mid)" : "white",
                            cursor:
                              uploadingId === c.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {uploadingId === c.id
                            ? "上传中..."
                            : value(c, "qr_code_url")
                              ? "REPLACE"
                              : "UPLOAD QR"}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={uploadingId === c.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadQr(c.id, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {value(c, "qr_code_url") && (
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(c.id, { qr_code_url: null })
                          }
                          className="font-display text-[10px] tracking-wider underline text-left"
                          style={{ color: "var(--mid)" }}
                        >
                          移除
                        </button>
                      )}
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--mid)" }}
                      >
                        PNG / JPG / WEBP · 最大 2MB
                      </p>
                    </div>
                  </div>
                </Field>
                <Field label="DISPLAY ORDER">
                  <input
                    type="number"
                    value={value(c, "display_order") ?? 0}
                    onChange={(e) =>
                      updateDraft(c.id, {
                        display_order: Number(e.target.value),
                      })
                    }
                    className="brutal-input"
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={() => patchContact(c.id)}
                disabled={!dirty || savingId === c.id}
                className="brutal-btn mt-4"
                style={
                  dirty && savingId !== c.id
                    ? { background: "var(--cardinal)", color: "white" }
                    : {
                        background: "var(--cream)",
                        color: "var(--mid)",
                        cursor: "not-allowed",
                      }
                }
              >
                {savingId === c.id ? "保存中..." : dirty ? "保存" : "未修改"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
