"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  VALID_TAGS,
  SLEEP_OPTIONS,
  CLEAN_OPTIONS,
  NOISE_OPTIONS,
  MUSIC_OPTIONS,
  STUDY_OPTIONS,
  SCHOOL_OPTIONS,
  YEAR_OPTIONS,
  ENROLLMENT_OPTIONS,
} from "@/lib/types";
import { schoolAccent } from "@/lib/utils";

/* ── Habit config ── */
const HABITS = [
  { key: "sleep_habit", label: "SLEEP", options: SLEEP_OPTIONS },
  { key: "clean_level", label: "CLEAN", options: CLEAN_OPTIONS },
  { key: "noise_level", label: "NOISE", options: NOISE_OPTIONS },
  { key: "music_habit", label: "MUSIC", options: MUSIC_OPTIONS },
  { key: "study_style", label: "STUDY", options: STUDY_OPTIONS },
] as const;

type HabitKey = (typeof HABITS)[number]["key"];

interface FormData {
  name: string;
  school: string;
  year: string;
  major: string;
  enrollment_term: string;
  avatar_url: string;
  bio: string;
  contact: string;
  tags: string[];
  sleep_habit: string;
  clean_level: string;
  noise_level: string;
  music_habit: string;
  study_style: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  school: "",
  year: "",
  major: "",
  enrollment_term: "",
  avatar_url: "",
  bio: "",
  contact: "",
  tags: [],
  sleep_habit: "",
  clean_level: "",
  noise_level: "",
  music_habit: "",
  study_style: "",
};

const TOTAL_STEPS = 4;

export default function OnboardingFlow() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

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
        setForm({
          name: data.name || "",
          school: data.school || "",
          year: data.year || "",
          major: data.major || "",
          enrollment_term: data.enrollment_term || "",
          avatar_url: data.avatar_url || "",
          bio: data.bio || "",
          contact: data.contact || "",
          tags: data.tags || [],
          sleep_habit: data.sleep_habit || "",
          clean_level: data.clean_level || "",
          noise_level: data.noise_level || "",
          music_habit: data.music_habit || "",
          study_style: data.study_style || "",
        });
      }

      setProfileLoading(false);
    }

    loadProfile();
  }, [user]);

  /* ── Field updater ── */
  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Tag toggle ── */
  function toggleTag(tag: string) {
    setForm((prev) => {
      const has = prev.tags.includes(tag);
      if (has) return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
      if (prev.tags.length >= 6) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });
  }

  /* ── Habit toggle (click again to deselect) ── */
  function toggleHabit(key: HabitKey, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key] === value ? "" : value,
    }));
  }

  /* ── Validation ── */
  function canProceed(): boolean {
    if (step === 1)
      return (
        form.name.trim() !== "" &&
        form.school !== "" &&
        form.year !== "" &&
        form.major.trim() !== ""
      );
    if (step === 2) return form.contact.trim() !== "";
    return true;
  }

  /* ── Submit ── */
  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);

    const supabase = createBrowserSupabaseClient();

    const payload = {
      name: form.name.trim(),
      school: form.school || null,
      year: form.year || null,
      major: form.major.trim() || null,
      enrollment_term:
        form.year === "新生" && form.enrollment_term
          ? form.enrollment_term
          : null,
      avatar_url: form.avatar_url.trim() || null,
      bio: form.bio.trim() || null,
      contact: form.contact.trim(),
      tags: form.tags.length > 0 ? form.tags : null,
      sleep_habit: form.sleep_habit || null,
      clean_level: form.clean_level || null,
      noise_level: form.noise_level || null,
      music_habit: form.music_habit || null,
      study_style: form.study_style || null,
      visible: form.year === "新生",
    };

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
      setSaveError(error.message);
      setSubmitting(false);
      return;
    }

    router.push("/account");
  }

  /* ── Dynamic accent color based on selected school ── */
  const accent = form.school ? schoolAccent(form.school) : "var(--cardinal)";

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
            ← HOME
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
                  value={form.name}
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
                        form.school === s
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
                        form.year === y
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
                        checked={form.year === y}
                        onChange={() => updateField("year", y)}
                        className="sr-only"
                      />
                      {y}
                    </label>
                  ))}
                </div>
              </div>

              {/* Enrollment Term (conditional) */}
              {form.year === "新生" && (
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
                        onClick={() => updateField("enrollment_term", t)}
                        className="brutal-btn text-sm px-5 py-2 transition-colors"
                        style={
                          form.enrollment_term === t
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
                  value={form.major}
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

              {/* Avatar URL */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  AVATAR URL
                </label>
                <input
                  type="text"
                  className="brutal-input"
                  placeholder="Paste image URL"
                  value={form.avatar_url}
                  onChange={(e) => updateField("avatar_url", e.target.value)}
                />
                {form.avatar_url && (
                  <div className="mt-3">
                    <img
                      src={form.avatar_url}
                      alt="Avatar preview"
                      className="w-16 h-16 object-cover border-[3px] border-[var(--black)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
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
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                />
                <div className="flex justify-end mt-1">
                  <span
                    className="text-[10px] font-display tracking-wider"
                    style={{
                      color:
                        form.bio.length >= 200
                          ? "var(--cardinal)"
                          : "var(--mid)",
                    }}
                  >
                    {form.bio.length}/200
                  </span>
                </div>
              </div>

              {/* Contact */}
              <div>
                <label
                  className="font-display text-xs tracking-wider block mb-2"
                  style={{ color: "var(--black)" }}
                >
                  CONTACT <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="brutal-input"
                  placeholder="WeChat / Instagram / Email"
                  value={form.contact}
                  onChange={(e) => updateField("contact", e.target.value)}
                />
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
                  {form.tags.length}/6
                </span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VALID_TAGS.map((tag) => {
                  const selected = form.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`brutal-tag text-xs py-2 px-3 text-center cursor-pointer transition-colors ${
                        selected ? "brutal-tag-filled" : ""
                      }`}
                      style={
                        selected
                          ? {}
                          : {
                              background: "var(--cream)",
                              color: "var(--black)",
                            }
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
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
                <div key={key}>
                  <label
                    className="font-display text-xs tracking-wider block mb-2"
                    style={{ color: "var(--black)" }}
                  >
                    {label}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt) => {
                      const selected = form[key] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleHabit(key, opt)}
                          className="border-[3px] border-[var(--black)] px-4 py-2 text-xs font-display tracking-wider cursor-pointer transition-colors"
                          style={
                            selected
                              ? { background: accent, color: "white" }
                              : {
                                  background: "var(--cream)",
                                  color: "var(--black)",
                                }
                          }
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                  ← BACK
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
                  NEXT →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="brutal-btn brutal-btn-gold text-sm disabled:opacity-40"
                >
                  {submitting ? "SAVING..." : "FINISH ✓"}
                </button>
              )}
            </div>
            {saveError && (
              <div
                className="mt-3 p-3 border-[2px] text-xs"
                style={{
                  borderColor: "var(--cardinal)",
                  color: "var(--cardinal)",
                  background: "color-mix(in srgb, var(--cardinal) 5%, white)",
                }}
              >
                SAVE FAILED: {saveError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
