"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { TagPicker, HabitSelector } from "@/components/form";
import { useProfileForm } from "@/hooks/useProfileForm";
import {
  SLEEP_OPTIONS,
  CLEAN_OPTIONS,
  NOISE_OPTIONS,
  MUSIC_OPTIONS,
  STUDY_OPTIONS,
  SCHOOL_OPTIONS,
  YEAR_OPTIONS,
  ENROLLMENT_OPTIONS,
  CONTACT_PLATFORM_VALUES,
  CONTACT_PLATFORM_META,
  type ContactChannel,
  type ContactPlatform,
} from "@/lib/types";
import { schoolAccent } from "@/lib/utils";

/* ── Habit config ── */
const HABITS = [
  { key: "sleepHabit" as const, label: "SLEEP", options: SLEEP_OPTIONS },
  { key: "cleanLevel" as const, label: "CLEAN", options: CLEAN_OPTIONS },
  { key: "noiseLevel" as const, label: "NOISE", options: NOISE_OPTIONS },
  { key: "musicHabit" as const, label: "MUSIC", options: MUSIC_OPTIONS },
  { key: "studyStyle" as const, label: "STUDY", options: STUDY_OPTIONS },
];

const TOTAL_STEPS = 4;

export default function OnboardingFlow() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const {
    formData,
    updateField,
    toggleTag,
    errors,
    setError,
    submitting,
    setSubmitting,
    setForm,
    buildPayload,
    uploadAvatar,
    addContactChannel,
    updateContactChannel,
    removeContactChannel,
  } = useProfileForm({ maxTags: 6 });

  const [step, setStep] = useState(1);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);

  /* ── Redirect if not authenticated ── */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/roommates");
    }
  }, [authLoading, user, router]);

  /* ── Load existing profile ── */
  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from("roommate_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (data) {
        setExistingId(data.id);
        // Prefer structured channels; fall back to wrapping the old `contact`
        // text as a single "other" channel so edit mode never starts empty.
        const channels: ContactChannel[] = Array.isArray(data.contact_channels)
          ? data.contact_channels
          : [];
        const fallbackChannels =
          channels.length === 0 && data.contact
            ? [{ platform: "other" as ContactPlatform, value: data.contact }]
            : channels;
        setForm({
          name: data.name || "",
          school: data.school || "",
          gender: "",
          year: data.year || "",
          major: data.major || "",
          enrollmentTerm: data.enrollment_term || "",
          avatarUrl: data.avatar_url || "",
          bio: data.bio || "",
          contact: data.contact || "",
          contactChannels: fallbackChannels,
          tags: data.tags || [],
          sleepHabit: data.sleep_habit || "",
          customSleep: "",
          cleanLevel: data.clean_level || "",
          noiseLevel: data.noise_level || "",
          musicHabit: data.music_habit || "",
          studyStyle: data.study_style || "",
          hobbies: "",
        });
      }

      setProfileLoading(false);
    }

    loadProfile();
  }, [user, setForm]);

  /* ── Validation ── */
  function canProceed(): boolean {
    if (step === 1)
      return (
        formData.name.trim() !== "" &&
        formData.school !== "" &&
        formData.year !== "" &&
        formData.major.trim() !== ""
      );
    if (step === 2)
      return formData.contactChannels.some((c) => c.value.trim() !== "");
    return true;
  }

  async function handleAvatarFile(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("AVATAR 最大 5MB");
      return;
    }
    setError(null);
    setAvatarUploading(true);
    const url = await uploadAvatar(file);
    setAvatarUploading(false);
    if (url) updateField("avatarUrl", url);
  }

  /* ── Submit ── */
  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);

    const supabase = createBrowserSupabaseClient();
    const payload = buildPayload(null);

    const { error } = existingId
      ? await supabase
          .from("roommate_profiles")
          .update(payload)
          .eq("id", existingId)
          .eq("user_id", user!.id)
      : await supabase
          .from("roommate_profiles")
          .insert({ ...payload, user_id: user!.id });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    router.push("/account");
  }

  /* ── Dynamic accent color based on selected school ── */
  const accent = formData.school
    ? schoolAccent(formData.school)
    : "var(--cardinal)";

  /* ── Loading state ── */
  if (authLoading || profileLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "var(--beige)" }}
      >
        <div
          className="font-display text-xl tracking-wider"
          style={{ color: "var(--mid)" }}
        >
          LOADING...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--beige)" }}>
      {/* ── Header bar ── */}
      <div
        className="relative overflow-hidden border-b-[3px] border-[var(--black)]"
        style={{ background: accent }}
      >
        <div
          className="ghost-text right-4 -top-4 text-[120px]"
          style={{ color: "white", opacity: 0.06 }}
        >
          BIA
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <button
            onClick={() => router.push("/roommates")}
            className="font-display text-xs tracking-wider text-white/70 hover:text-white transition-colors"
          >
            &larr; HOME
          </button>
          <span className="font-display text-sm tracking-[0.15em] text-white">
            STEP {step} OF {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="flex border-b-[3px] border-[var(--black)]">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className="flex-1 h-2 border-r-[3px] border-[var(--black)] last:border-r-0 transition-colors duration-300"
            style={{
              background: i < step ? accent : "var(--cream)",
            }}
          />
        ))}
      </div>

      {/* ── Form container ── */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="brutal-container p-6 sm:p-8 relative">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 reveal">
              <h2
                className="font-display text-3xl sm:text-4xl"
                style={{ color: "var(--black)" }}
              >
                BASIC INFO
              </h2>
              <p className="text-xs" style={{ color: "var(--mid)" }}>
                Tell us who you are.
              </p>

              {/* Name */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  NAME <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="brutal-input"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              {/* School */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  SCHOOL <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SCHOOL_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateField("school", s)}
                      className="brutal-btn text-sm px-5 py-2 transition-colors"
                      style={
                        formData.school === s
                          ? {
                              background: schoolAccent(s),
                              color: "white",
                              borderColor: "var(--black)",
                            }
                          : {
                              background: "var(--cream)",
                              color: "var(--black)",
                              borderColor: "var(--black)",
                            }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  YEAR <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {YEAR_OPTIONS.map((y) => (
                    <label
                      key={y}
                      className="flex items-center gap-2 cursor-pointer border-[3px] border-[var(--black)] px-4 py-2 text-xs font-display tracking-wider transition-colors"
                      style={
                        formData.year === y
                          ? { background: accent, color: "white" }
                          : {
                              background: "var(--cream)",
                              color: "var(--black)",
                            }
                      }
                    >
                      <input
                        type="radio"
                        name="year"
                        value={y}
                        checked={formData.year === y}
                        onChange={() => updateField("year", y)}
                        className="sr-only"
                      />
                      {y}
                    </label>
                  ))}
                </div>
              </div>

              {/* Enrollment Term (conditional) */}
              {formData.year === "新生" && (
                <div className="reveal">
                  <label
                    className="font-display text-xs tracking-wider block mb-2"
                    style={{ color: "var(--black)" }}
                  >
                    ENROLLMENT TERM
                  </label>
                  <div className="flex gap-2">
                    {ENROLLMENT_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateField("enrollmentTerm", t)}
                        className="brutal-btn text-sm px-5 py-2 transition-colors"
                        style={
                          formData.enrollmentTerm === t
                            ? {
                                background: accent,
                                color: "white",
                                borderColor: "var(--black)",
                              }
                            : {
                                background: "var(--cream)",
                                color: "var(--black)",
                                borderColor: "var(--black)",
                              }
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Major */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  MAJOR <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="brutal-input"
                  placeholder="e.g. Computer Science"
                  value={formData.major}
                  onChange={(e) => updateField("major", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div className="space-y-6 reveal">
              <h2
                className="font-display text-3xl sm:text-4xl"
                style={{ color: "var(--black)" }}
              >
                YOUR PROFILE
              </h2>
              <p className="text-xs" style={{ color: "var(--mid)" }}>
                Let others get to know you.
              </p>

              {/* Avatar upload */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  AVATAR
                </label>
                <div className="flex items-start gap-3">
                  {formData.avatarUrl ? (
                    <Image
                      src={formData.avatarUrl}
                      alt="Avatar preview"
                      width={72}
                      height={72}
                      className="w-18 h-18 object-cover border-[3px] border-[var(--black)] shrink-0"
                      style={{ width: 72, height: 72 }}
                      unoptimized
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="shrink-0 border-[3px] border-dashed border-[var(--black)] flex items-center justify-center font-display text-xs tracking-wider"
                      style={{
                        width: 72,
                        height: 72,
                        background: "var(--beige)",
                        color: "var(--mid)",
                      }}
                    >
                      EMPTY
                    </div>
                  )}
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <span
                        className="brutal-btn inline-block text-xs"
                        style={{
                          background: avatarUploading
                            ? "var(--beige)"
                            : "var(--cardinal)",
                          color: avatarUploading ? "var(--mid)" : "white",
                          cursor: avatarUploading ? "not-allowed" : "pointer",
                        }}
                      >
                        {avatarUploading
                          ? "上传中..."
                          : formData.avatarUrl
                            ? "REPLACE"
                            : "UPLOAD IMAGE"}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        disabled={avatarUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleAvatarFile(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => updateField("avatarUrl", "")}
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
                      PNG / JPG / WEBP / GIF · 最大 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  BIO
                </label>
                <textarea
                  className="brutal-input resize-none"
                  rows={4}
                  maxLength={200}
                  placeholder="A short intro about yourself..."
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                />
                <div className="flex justify-end mt-1">
                  <span
                    className="text-[10px] font-display tracking-wider"
                    style={{
                      color:
                        formData.bio.length >= 200
                          ? "var(--cardinal)"
                          : "var(--mid)",
                    }}
                  >
                    {formData.bio.length}/200
                  </span>
                </div>
              </div>

              {/* Contact channels */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  CONTACT <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <p
                  className="text-[11px] mb-2"
                  style={{ color: "var(--mid)" }}
                >
                  添加一个或多个联系方式，至少留一个。
                </p>

                {formData.contactChannels.length === 0 && (
                  <p
                    className="text-[11px] mb-2"
                    style={{ color: "var(--cardinal)" }}
                  >
                    还没添加联系方式 — 从下面选一个平台
                  </p>
                )}

                <div className="space-y-3 mb-3">
                  {formData.contactChannels.map((ch, i) => {
                    const meta = CONTACT_PLATFORM_META[ch.platform];
                    return (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row gap-2 sm:items-stretch"
                      >
                        {/* Platform picker — fixed width on desktop, full width
                            on mobile. Inline style beats brutal-input's width:100%. */}
                        <select
                          value={ch.platform}
                          onChange={(e) =>
                            updateContactChannel(i, {
                              platform: e.target.value as ContactPlatform,
                            })
                          }
                          className="brutal-input"
                          style={{ flex: "0 0 9.5rem" }}
                        >
                          {CONTACT_PLATFORM_VALUES.map((p) => (
                            <option key={p} value={p}>
                              {CONTACT_PLATFORM_META[p].icon}{" "}
                              {CONTACT_PLATFORM_META[p].label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            className="brutal-input"
                            style={{ flex: "1 1 auto", minWidth: 0 }}
                            placeholder={meta.placeholder}
                            value={ch.value}
                            onChange={(e) =>
                              updateContactChannel(i, {
                                value: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeContactChannel(i)}
                            className="border-[3px] border-[var(--black)] font-display text-sm hover:bg-[var(--cardinal)] hover:text-white transition-colors"
                            style={{
                              flex: "0 0 2.5rem",
                              background: "var(--cream)",
                            }}
                            aria-label="删除"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  {CONTACT_PLATFORM_VALUES.filter(
                    (p) =>
                      !formData.contactChannels.some((c) => c.platform === p),
                  ).map((p) => {
                    const meta = CONTACT_PLATFORM_META[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => addContactChannel(p)}
                        className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors hover:bg-[var(--gold)]"
                      >
                        + {meta.icon} {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Tags */}
          {step === 3 && (
            <div className="space-y-6 reveal">
              <h2
                className="font-display text-3xl sm:text-4xl"
                style={{ color: "var(--black)" }}
              >
                INTEREST TAGS
              </h2>
              <p className="text-xs" style={{ color: "var(--mid)" }}>
                Pick up to 6 tags that describe you.
                <span
                  className="ml-2 font-display tracking-wider"
                  style={{ color: accent }}
                >
                  {formData.tags.length}/6
                </span>
              </p>

              <TagPicker
                selectedTags={formData.tags}
                maxTags={6}
                onToggle={toggleTag}
                accent={accent}
                layout="grid"
              />
            </div>
          )}

          {/* Step 4: Habits */}
          {step === 4 && (
            <div className="space-y-6 reveal">
              <h2
                className="font-display text-3xl sm:text-4xl"
                style={{ color: "var(--black)" }}
              >
                LIVING HABITS
              </h2>
              <p className="text-xs" style={{ color: "var(--mid)" }}>
                All optional — helps match you with compatible roommates.
              </p>

              {HABITS.map(({ key, label, options }) => (
                <HabitSelector
                  key={key}
                  label={label}
                  options={options}
                  value={formData[key]}
                  onChange={(v) => updateField(key, v)}
                  accent={accent}
                  mode="toggle"
                />
              ))}
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t-[3px] border-[var(--black)]">
            {/* Left side: Back */}
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="brutal-btn brutal-btn-ghost text-sm"
                >
                  &larr; BACK
                </button>
              )}
            </div>

            {/* Right side: Skip + Next/Finish */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="font-display text-xs tracking-wider px-4 py-2 hover:opacity-60 transition-opacity"
                style={{ color: "var(--mid)" }}
              >
                SKIP
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  disabled={!canProceed()}
                  onClick={() => setStep((s) => s + 1)}
                  className="brutal-btn brutal-btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                >
                  NEXT &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="brutal-btn brutal-btn-gold text-sm disabled:opacity-40"
                >
                  {submitting ? "SAVING..." : "FINISH \u2713"}
                </button>
              )}
            </div>
            {errors.general && (
              <div
                className="mt-3 p-3 border-[2px] text-xs"
                style={{
                  borderColor: "var(--cardinal)",
                  color: "var(--cardinal)",
                  background: "color-mix(in srgb, var(--cardinal) 5%, white)",
                }}
              >
                SAVE FAILED: {errors.general}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
