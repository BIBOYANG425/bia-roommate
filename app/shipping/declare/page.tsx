"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import ShippingMethodPicker from "@/components/ShippingMethodPicker";
import {
  PARCEL_CATEGORY_OPTIONS,
  CN_CARRIER_OPTIONS,
  type Parcel,
  type ShippingMethod,
  type ShippingRoute,
} from "@/lib/types";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function DeclareParcelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { user, loading: authLoading } = useAuth();

  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(!!editId);

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | null>(
    null,
  );
  const [routes, setRoutes] = useState<ShippingRoute[]>([]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [carrier, setCarrier] = useState<string>("");
  const [trackingCn, setTrackingCn] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  // existingPhotos stores storage paths (submitted back on save). existingPhotoUrls
  // holds signed display URLs for the private parcel-photos bucket; the two arrays
  // stay index-aligned.
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [prohibitedAck, setProhibitedAck] = useState(false);

  // Fetch routes for price/schedule hints (public, no auth needed)
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/shipping/routes");
      if (res.ok) {
        const data = (await res.json()) as { routes: ShippingRoute[] };
        setRoutes(data.routes);
      }
    })();
  }, []);

  // Load existing parcel into form if ?edit=<id>
  useEffect(() => {
    if (!editId || !user) return;
    (async () => {
      const res = await fetch(`/api/shipping/parcels/${editId}`);
      if (!res.ok) {
        setError("无法加载包裹");
        setLoadingExisting(false);
        return;
      }
      const data = (await res.json()) as { parcel: Parcel };
      const p = data.parcel;
      if (p.status !== "expected") {
        setError("包裹已入库，不能再修改");
      }
      setShippingMethod(p.shipping_method ?? null);
      setDescription(p.description ?? "");
      setCategory(p.category ?? "");
      setCarrier(p.carrier_cn ?? "");
      setTrackingCn(p.tracking_cn ?? "");
      setDeclaredValue(
        p.declared_value_cny !== null ? String(p.declared_value_cny) : "",
      );
      setUserNotes(p.user_notes ?? "");
      const paths = p.photos ?? [];
      setExistingPhotos(paths);
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("parcel-photos")
          .createSignedUrls(paths, 60 * 60);
        setExistingPhotoUrls(
          (signed ?? []).map(
            (s: { signedUrl: string | null }) => s?.signedUrl ?? "",
          ),
        );
      }
      setProhibitedAck(true); // they already acknowledged when declaring
      setLoadingExisting(false);
    })();
  }, [editId, user]);

  // Clean up blob URLs on unmount. Ref-mirrored so the unmount effect
  // captures the latest array (the naive empty-deps effect would capture
  // the initial empty value and leak any blobs created after mount).
  // The mirror happens inside a dep-less effect to satisfy
  // react-hooks/refs (no ref writes during render).
  const photoPreviewsRef = useRef(photoPreviews);
  useEffect(() => {
    photoPreviewsRef.current = photoPreviews;
  });
  useEffect(() => {
    return () => photoPreviewsRef.current.forEach(URL.revokeObjectURL);
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - (existingPhotos.length + photoFiles.length);
    if (remaining <= 0) return;
    const toAdd = files.slice(0, remaining);
    for (const f of toAdd) {
      if (f.size > MAX_PHOTO_BYTES) {
        setError("图片过大 — 每张最大 2MB");
        return;
      }
    }
    setPhotoFiles((prev) => [...prev, ...toAdd]);
    setPhotoPreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removeNewPhoto = (idx: number) => {
    URL.revokeObjectURL(photoPreviews[idx]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSubmit =
    description.trim().length > 0 &&
    prohibitedAck &&
    !submitting &&
    !loadingExisting;

  const uploadPhotos = async (): Promise<string[]> => {
    if (photoFiles.length === 0 || !user) return [];
    const uploaded: string[] = [];
    for (const file of photoFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("parcel-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;
      uploaded.push(path);
    }
    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    let newPhotoPaths: string[] = [];
    try {
      newPhotoPaths = await uploadPhotos();
    } catch (err) {
      setError(
        "图片上传失败 — " + (err instanceof Error ? err.message : "unknown"),
      );
      setSubmitting(false);
      return;
    }

    const payload = {
      description: description.trim(),
      category: category || null,
      carrier_cn: carrier || null,
      tracking_cn: trackingCn.trim() || null,
      declared_value_cny: declaredValue.trim() || null,
      user_notes: userNotes.trim() || null,
      photos: [...existingPhotos, ...newPhotoPaths],
      shipping_method: shippingMethod || null,
    };

    const res = editId
      ? await fetch(`/api/shipping/parcels/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/shipping/parcels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setError(err.error ?? "保存失败，请重试");
      setSubmitting(false);
      return;
    }

    router.push(editId ? "/shipping?updated=true" : "/shipping?declared=true");
  };

  return (
    <main className="min-h-screen" style={{ background: "var(--beige)" }}>
      {/* Header */}
      <div
        className="border-b-[3px] border-[var(--black)]"
        style={{ background: "var(--cardinal)" }}
      >
        <div className="max-w-2xl mx-auto px-6 py-10 relative">
          <div
            className="ghost-text right-0 top-0 text-[140px]"
            style={{ color: "white", opacity: 0.06 }}
          >
            {editId ? "EDIT" : "DECLARE"}
          </div>
          <Link
            href="/shipping"
            className="font-display text-xs tracking-[0.2em] text-white/60 hover:text-white mb-4 inline-block"
          >
            ← BACK
          </Link>
          <h1 className="font-display text-[48px] sm:text-[64px] text-white leading-[0.85]">
            {editId ? "EDIT PARCEL" : "PRE-DECLARE"}
            <br />
            {editId ? "UPDATE DETAILS" : "包裹预报"}
          </h1>
          <p className="text-xs text-white/60 mt-3">
            {editId
              ? "包裹还未入库，可以修改所有字段。"
              : "Taobao 下单后先预报一下，仓库签收更快、你能收到通知。"}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="brutal-container p-6 sm:p-8 space-y-8"
        >
          {/* 01 — Shipping method */}
          <div className="relative">
            <span className="section-number text-[80px]">01</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              SHIPPING METHOD
              <span
                className="block text-base tracking-wider mt-1"
                style={{ color: "var(--mid)" }}
              >
                运输方式
              </span>
            </h2>
            <ShippingMethodPicker
              value={shippingMethod}
              onChange={setShippingMethod}
              routes={routes}
            />
          </div>

          {/* 02 — What's inside */}
          <div className="relative">
            <span className="section-number text-[80px]">02</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              ITEM
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  DESCRIPTION{" "}
                  <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="如：Uniqlo 羽绒服一件 + 小米耳机"
                  maxLength={500}
                  rows={3}
                  className="brutal-input resize-none"
                  required
                />
                <p
                  className="text-[10px] mt-1 text-right uppercase tracking-wider"
                  style={{ color: "var(--mid)" }}
                >
                  {description.length}/500
                </p>
              </div>

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-2"
                  style={{ color: "var(--mid)" }}
                >
                  CATEGORY
                </label>
                <div className="flex flex-wrap gap-2">
                  {PARCEL_CATEGORY_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(category === c ? "" : c)}
                      className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                      style={
                        category === c
                          ? {
                              background: "var(--cardinal)",
                              color: "white",
                              borderColor: "var(--cardinal)",
                            }
                          : {}
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  DECLARED VALUE (CNY)
                </label>
                <input
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  placeholder="如：800"
                  min="0"
                  max="50000"
                  className="brutal-input"
                />
                <p
                  className="text-[10px] mt-1 uppercase tracking-wider"
                  style={{ color: "var(--mid)" }}
                >
                  单件上限 ¥50000 · 美国清关建议单件 ¥800 以下
                </p>
              </div>
            </div>
          </div>

          {/* 03 — Domestic tracking */}
          <div className="relative">
            <span className="section-number text-[80px]">03</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              国内物流
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--mid)" }}>
              没发货可以先空着，发货后记得回来填。
            </p>

            <div className="space-y-4">
              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-2"
                  style={{ color: "var(--mid)" }}
                >
                  CARRIER
                </label>
                <div className="flex flex-wrap gap-2">
                  {CN_CARRIER_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCarrier(carrier === c ? "" : c)}
                      className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                      style={
                        carrier === c
                          ? {
                              background: "var(--cardinal)",
                              color: "white",
                              borderColor: "var(--cardinal)",
                            }
                          : {}
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  TRACKING NUMBER
                </label>
                <input
                  type="text"
                  value={trackingCn}
                  onChange={(e) => setTrackingCn(e.target.value)}
                  placeholder="如：SF1234567890"
                  className="brutal-input"
                />
              </div>
            </div>
          </div>

          {/* 04 — Photos */}
          <div className="relative">
            <span className="section-number text-[80px]">04</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              PHOTOS
            </h2>
            <p className="text-xs mb-3" style={{ color: "var(--mid)" }}>
              可以上传商品截图（可选）。仓库收货后会另外拍实物照。
            </p>

            <div className="grid grid-cols-3 gap-3 mb-3">
              {existingPhotos.map((_path, idx) => (
                <div key={`existing-${idx}`} className="relative">
                  <Image
                    src={existingPhotoUrls[idx] ?? ""}
                    alt={`Photo ${idx + 1}`}
                    width={200}
                    height={96}
                    unoptimized
                    className="w-full h-24 object-cover border-[3px] border-[var(--black)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setExistingPhotos((prev) =>
                        prev.filter((_, i) => i !== idx),
                      );
                      setExistingPhotoUrls((prev) =>
                        prev.filter((_, i) => i !== idx),
                      );
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center border-[2px] border-[var(--black)] font-display text-[10px] hover:bg-[var(--gold)] transition-colors"
                    style={{ background: "var(--cream)" }}
                  >
                    X
                  </button>
                </div>
              ))}
              {photoPreviews.map((src, idx) => (
                <div key={idx} className="relative">
                  <Image
                    src={src}
                    alt={`New photo ${idx + 1}`}
                    width={200}
                    height={96}
                    unoptimized
                    className="w-full h-24 object-cover border-[3px] border-[var(--black)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewPhoto(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center border-[2px] border-[var(--black)] font-display text-[10px] hover:bg-[var(--gold)] transition-colors"
                    style={{ background: "var(--cream)" }}
                  >
                    X
                  </button>
                </div>
              ))}
              {existingPhotos.length + photoFiles.length < MAX_PHOTOS && (
                <label className="cursor-pointer">
                  <div
                    className="w-full h-24 border-[3px] border-[var(--black)] border-dashed flex items-center justify-center hover:shadow-[4px_4px_0_var(--gold)] transition-all"
                    style={{ background: "var(--beige)" }}
                  >
                    <span
                      className="font-display text-2xl"
                      style={{ color: "var(--mid)" }}
                    >
                      +
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--mid)" }}
            >
              {existingPhotos.length + photoFiles.length}/{MAX_PHOTOS} PHOTOS —
              每张最多 2MB
            </p>
          </div>

          {/* 05 — Notes */}
          <div className="relative">
            <span className="section-number text-[80px]">05</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              NOTES
            </h2>
            <div>
              <label
                className="font-display text-sm tracking-wider block mb-1"
                style={{ color: "var(--mid)" }}
              >
                给仓库的备注（可选）
              </label>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="如：请代拆后扔掉外包装、怕挤压、需要称重给我看"
                rows={3}
                maxLength={300}
                className="brutal-input resize-none"
              />
              <p
                className="text-[10px] mt-1 text-right uppercase tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                {userNotes.length}/300
              </p>
            </div>
          </div>

          {/* 06 — Prohibited items ack */}
          <div className="relative">
            <span className="section-number text-[80px]">06</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              合规确认
            </h2>

            {shippingMethod === "sensitive" ? (
              <div
                className="p-4 border-[3px] border-[var(--black)] mb-3"
                style={{ background: "var(--gold)" }}
              >
                <p className="text-xs mb-2" style={{ color: "var(--black)" }}>
                  敏感货专线<strong>可以收</strong>：
                </p>
                <ul
                  className="text-xs list-disc pl-5 space-y-1 mb-3"
                  style={{ color: "var(--black)" }}
                >
                  <li>含电池的电子产品（充电宝、蓝牙耳机、手机等）</li>
                  <li>化妆品 / 液体（化妆水、香水、乳液）</li>
                  <li>粉末类（蛋白粉、咖啡粉等）</li>
                  <li>其他需特殊申报的物品</li>
                </ul>
                <p className="text-[11px]" style={{ color: "var(--black)" }}>
                  仍<strong>不允许</strong>：明火 / 易燃物（打火机、喷雾）、仿冒 / 违禁物品。
                </p>
              </div>
            ) : (
              <div
                className="p-4 border-[3px] border-[var(--black)] mb-3"
                style={{ background: "var(--beige)" }}
              >
                <p className="text-xs mb-2" style={{ color: "var(--black)" }}>
                  普通专线不允许：
                </p>
                <ul
                  className="text-xs list-disc pl-5 space-y-1 mb-3"
                  style={{ color: "var(--mid)" }}
                >
                  <li>锂电池 / 含电池的电子产品（充电宝、蓝牙耳机单独邮寄也不行）</li>
                  <li>液体（化妆水、酒精、香水）</li>
                  <li>粉末 / 食品（不同线路有限制，请先问）</li>
                  <li>明火 / 易燃（打火机、喷雾）</li>
                  <li>仿冒 / 违禁物品</li>
                </ul>
                <p className="text-[11px]" style={{ color: "var(--mid)" }}>
                  含电池电子 / 化妆品 / 粉末请改选「敏感货专线」。
                </p>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prohibitedAck}
                onChange={(e) => setProhibitedAck(e.target.checked)}
                className="mt-1"
              />
              <span className="text-xs" style={{ color: "var(--black)" }}>
                {shippingMethod === "sensitive" ? (
                  <>
                    我确认已选对专线，且包裹<strong>不含</strong>明火 / 易燃 / 违禁物品。
                  </>
                ) : (
                  <>
                    我确认包裹<strong>不含</strong>上述禁运物品。如仓库发现违禁品，可能被退回或销毁，BIA 不承担损失。
                  </>
                )}
              </span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div
              className="p-4 border-[3px]"
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

          {/* Auth prompt */}
          {!authLoading && !user && (
            <div
              className="p-4 border-[3px] border-[var(--black)] text-center"
              style={{ background: "var(--gold)" }}
            >
              <p
                className="font-display text-sm tracking-wider mb-2"
                style={{ color: "var(--black)" }}
              >
                登录后才能预报包裹
              </p>
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="brutal-btn brutal-btn-primary text-xs"
              >
                SIGN IN
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || !user}
            className={`brutal-btn w-full text-center ${canSubmit && user ? "brutal-btn-primary" : ""}`}
            style={
              !canSubmit || !user
                ? {
                    background: "var(--beige)",
                    color: "var(--mid)",
                    cursor: "not-allowed",
                  }
                : {}
            }
          >
            {submitting
              ? editId
                ? "保存中..."
                : "提交中..."
              : editId
                ? "保存更新"
                : "提交预报"}
          </button>
        </form>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </main>
  );
}

export default function DeclareParcelPage() {
  return (
    <Suspense>
      <DeclareParcelContent />
    </Suspense>
  );
}
