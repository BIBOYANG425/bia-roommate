"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import { schoolAccent } from "@/lib/utils";
import {
  SubletListing,
  ROOM_TYPE_OPTIONS,
  BATHROOM_OPTIONS,
  GENDER_PREF_OPTIONS,
  AMENITY_OPTIONS,
  SCHOOL_OPTIONS,
} from "@/lib/types";

function SubletSubmitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { user, loading: authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLoadingEdit] = useState(!!editId);

  const [title, setTitle] = useState("");
  const [apartmentName, setApartmentName] = useState("");
  const [address, setAddress] = useState("");
  const [school, setSchool] = useState("");
  const [rent, setRent] = useState("");
  const [roomType, setRoomType] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [genderPref, setGenderPref] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [posterName, setPosterName] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!editId) return;
    async function loadListing() {
      const { data } = await supabase
        .from("sublets")
        .select("*")
        .eq("id", editId)
        .single();
      if (data) {
        const d = data as SubletListing;
        setTitle(d.title);
        setApartmentName(d.apartment_name);
        setAddress(d.address);
        setSchool(d.school ?? "");
        setRent(String(d.rent));
        setRoomType(d.room_type ?? "");
        setBathrooms(d.bathrooms ?? "");
        setMoveInDate(d.move_in_date ?? "");
        setMoveOutDate(d.move_out_date ?? "");
        setGenderPref(d.gender_preference ?? "");
        setAmenities(d.amenities ?? []);
        setDescription(d.description ?? "");
        setContact(d.contact);
        setPosterName(d.poster_name);
        setExistingPhotos(d.photos ?? []);
      }
      setLoadingEdit(false);
    }
    loadListing();
  }, [editId]);

  const toggleAmenity = (a: string) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 6 - photoFiles.length;
    if (remaining <= 0) return;

    const toAdd = files.slice(0, remaining);
    for (const f of toAdd) {
      if (f.size > 2 * 1024 * 1024) {
        setError("IMAGE TOO LARGE — MAX 2MB EACH");
        return;
      }
    }
    setPhotoFiles((prev) => [...prev, ...toAdd]);
    setPhotoPreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photoPreviews[idx]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    return () => photoPreviews.forEach(URL.revokeObjectURL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    let photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      try {
        photoUrls = await Promise.all(
          photoFiles.map(async (file) => {
            const ext = file.name.split(".").pop();
            const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { data, error: uploadErr } = await supabase.storage
              .from("sublet-photos")
              .upload(filePath, file, { cacheControl: "3600", upsert: true });
            if (uploadErr) throw uploadErr;
            return supabase.storage
              .from("sublet-photos")
              .getPublicUrl(data.path).data.publicUrl;
          }),
        );
      } catch {
        setError("PHOTO UPLOAD FAILED — TRY AGAIN");
        setSubmitting(false);
        return;
      }
    }

    const allPhotos = [...existingPhotos, ...photoUrls];
    const formData = {
      title: title.trim(),
      apartment_name: apartmentName.trim(),
      address: address.trim(),
      school: school || null,
      rent: parseInt(rent, 10),
      room_type: roomType || null,
      bathrooms: bathrooms || null,
      move_in_date: moveInDate || null,
      move_out_date: moveOutDate || null,
      gender_preference: genderPref || null,
      description: description.trim() || null,
      amenities: amenities.length > 0 ? amenities : null,
      photos: allPhotos.length > 0 ? allPhotos : null,
      contact: contact.trim(),
      poster_name: posterName.trim(),
      user_id: user.id,
    };

    const { error: err } = editId
      ? await supabase
          .from("sublets")
          .update(formData)
          .eq("id", editId)
          .eq("user_id", user.id)
      : await supabase.from("sublets").insert([formData]);

    if (err) {
      setError(`SUBMISSION FAILED: ${err.message}`);
      setSubmitting(false);
      return;
    }

    router.push(editId ? "/sublet?updated=true" : "/sublet?submitted=true");
  };

  const canSubmit =
    title.trim() &&
    apartmentName.trim() &&
    address.trim() &&
    rent &&
    !isNaN(parseInt(rent, 10)) &&
    contact.trim() &&
    posterName.trim() &&
    school &&
    !submitting;
  const headerBg = schoolAccent(school);

  return (
    <main className="min-h-screen" style={{ background: "var(--beige)" }}>
      {/* Header */}
      <div
        className="border-b-[3px] border-[var(--black)] transition-colors duration-300"
        style={{ background: headerBg }}
      >
        <div className="max-w-2xl mx-auto px-6 py-10 relative">
          <div
            className="ghost-text right-0 top-0 text-[140px]"
            style={{ color: "white", opacity: 0.06 }}
          >
            {editId ? "EDIT" : "POST"}
          </div>
          <Link
            href={editId ? "/account" : "/sublet"}
            className="font-display text-xs tracking-[0.2em] text-white/60 hover:text-white mb-4 inline-block"
          >
            ← BACK
          </Link>
          <h1 className="font-display text-[48px] sm:text-[64px] text-white leading-[0.85]">
            {editId ? "EDIT YOUR" : "POST YOUR"}
            <br />
            SUBLET
          </h1>
          <p className="text-xs text-white/60 mt-3">
            {editId
              ? "Update your listing details."
              : "List your apartment. Find your tenant."}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="brutal-container p-6 sm:p-8 space-y-8"
        >
          {/* Section 01: Apartment Info */}
          <div className="relative">
            <span className="section-number text-[80px]">01</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              APARTMENT INFO
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  LISTING TITLE{" "}
                  <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="如：Lorenzo 单间转租 8月-12月"
                  className="brutal-input"
                  required
                />
              </div>

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  APARTMENT NAME{" "}
                  <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={apartmentName}
                  onChange={(e) => setApartmentName(e.target.value)}
                  placeholder="如：Lorenzo, The Gateway, Figueroa"
                  className="brutal-input"
                  required
                />
              </div>

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  ADDRESS <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="如：325 W Adams Blvd, Los Angeles"
                  className="brutal-input"
                  required
                />
              </div>

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-2"
                  style={{ color: "var(--mid)" }}
                >
                  SCHOOL <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SCHOOL_OPTIONS.map((s) => {
                    const accent = schoolAccent(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSchool(school === s ? "" : s)}
                        className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                        style={
                          school === s
                            ? {
                                background: accent,
                                color: "white",
                                borderColor: accent,
                              }
                            : {}
                        }
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="font-display text-sm tracking-wider block mb-2"
                    style={{ color: "var(--mid)" }}
                  >
                    ROOM TYPE
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_TYPE_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoomType(roomType === r ? "" : r)}
                        className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                        style={
                          roomType === r
                            ? {
                                background: "var(--cardinal)",
                                color: "white",
                                borderColor: "var(--cardinal)",
                              }
                            : {}
                        }
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    className="font-display text-sm tracking-wider block mb-2"
                    style={{ color: "var(--mid)" }}
                  >
                    BATHROOM
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BATHROOM_OPTIONS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBathrooms(bathrooms === b ? "" : b)}
                        className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                        style={
                          bathrooms === b
                            ? {
                                background: "var(--cardinal)",
                                color: "white",
                                borderColor: "var(--cardinal)",
                              }
                            : {}
                        }
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 02: Price & Dates */}
          <div className="relative">
            <span className="section-number text-[80px]">02</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              PRICE & DATES
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  MONTHLY RENT (USD){" "}
                  <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="number"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  placeholder="如：1200"
                  className="brutal-input"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="font-display text-sm tracking-wider block mb-1"
                    style={{ color: "var(--mid)" }}
                  >
                    MOVE-IN DATE
                  </label>
                  <input
                    type="date"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    className="brutal-input"
                  />
                </div>
                <div>
                  <label
                    className="font-display text-sm tracking-wider block mb-1"
                    style={{ color: "var(--mid)" }}
                  >
                    MOVE-OUT DATE
                  </label>
                  <input
                    type="date"
                    value={moveOutDate}
                    onChange={(e) => setMoveOutDate(e.target.value)}
                    className="brutal-input"
                  />
                </div>
              </div>

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-2"
                  style={{ color: "var(--mid)" }}
                >
                  GENDER PREFERENCE
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_PREF_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenderPref(genderPref === g ? "" : g)}
                      className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                      style={
                        genderPref === g
                          ? {
                              background: "var(--cardinal)",
                              color: "white",
                              borderColor: "var(--cardinal)",
                            }
                          : {}
                      }
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 03: Amenities */}
          <div className="relative">
            <span className="section-number text-[80px]">03</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              AMENITIES
            </h2>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                  style={
                    amenities.includes(a)
                      ? {
                          background: "var(--cardinal)",
                          color: "white",
                          borderColor: "var(--cardinal)",
                        }
                      : {}
                  }
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Section 04: Photos */}
          <div className="relative">
            <span className="section-number text-[80px]">04</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              PHOTOS
            </h2>

            <div className="grid grid-cols-3 gap-3 mb-3">
              {existingPhotos.map((src, idx) => (
                <div key={`existing-${idx}`} className="relative">
                  <Image
                    src={src}
                    alt={`Existing ${idx + 1}`}
                    width={200}
                    height={96}
                    className="w-full h-24 object-cover border-[3px] border-[var(--black)]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingPhotos((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
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
                    alt={`Photo ${idx + 1}`}
                    width={200}
                    height={96}
                    unoptimized
                    className="w-full h-24 object-cover border-[3px] border-[var(--black)]"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center border-[2px] border-[var(--black)] font-display text-[10px] hover:bg-[var(--gold)] transition-colors"
                    style={{ background: "var(--cream)" }}
                  >
                    X
                  </button>
                </div>
              ))}
              {existingPhotos.length + photoFiles.length < 6 && (
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
              {photoFiles.length}/6 PHOTOS — JPG / PNG — MAX 2MB EACH
            </p>
          </div>

          {/* Section 05: Description & Contact */}
          <div className="relative">
            <span className="section-number text-[80px]">05</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              DESCRIPTION & CONTACT
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  DESCRIPTION
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="详细描述你的房源（设施、周边、交通等）"
                  maxLength={500}
                  rows={4}
                  className="brutal-input resize-none"
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
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  YOUR NAME <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={posterName}
                  onChange={(e) => setPosterName(e.target.value)}
                  placeholder="你的姓名或昵称"
                  className="brutal-input"
                  required
                />
              </div>

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  CONTACT (WECHAT / PHONE){" "}
                  <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="微信号或手机号"
                  className="brutal-input"
                  required
                />
              </div>
            </div>
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
                SIGN IN REQUIRED TO POST
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
                ? "UPDATING..."
                : "POSTING..."
              : editId
                ? "UPDATE LISTING"
                : "POST MY SUBLET"}
          </button>
        </form>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </main>
  );
}

export default function SubletSubmitPage() {
  return (
    <Suspense>
      <SubletSubmitContent />
    </Suspense>
  );
}
