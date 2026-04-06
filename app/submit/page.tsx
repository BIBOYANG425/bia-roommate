"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import { RadioGroup, TagPicker, AvatarUpload } from "@/components/form";
import { useProfileForm } from "@/hooks/useProfileForm";
import {
  SLEEP_OPTIONS,
  CLEAN_OPTIONS,
  NOISE_OPTIONS,
  MUSIC_OPTIONS,
  STUDY_OPTIONS,
  GENDER_OPTIONS,
  YEAR_OPTIONS,
  ENROLLMENT_OPTIONS,
  SCHOOL_OPTIONS,
} from "@/lib/types";

export default function SubmitPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    formData,
    updateField,
    toggleTag,
    errors,
    setError,
    submitting,
    setSubmitting,
    validate,
    uploadAvatar,
    buildPayload,
  } = useProfileForm();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submittedProfileId, setSubmittedProfileId] = useState<string | null>(
    null,
  );
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (user) {
      const checkProfile = async () => {
        const { createBrowserSupabaseClient } =
          await import("@/lib/supabase/client");
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase
          .from("roommate_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          router.push("/account");
        }
      };
      checkProfile();
    }
  }, [user, router]);

  const handleAvatarChange = (file: File | null) => {
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(["name", "contact"])) return;

    setSubmitting(true);
    setError(null);

    let avatarUrl: string | null = null;
    if (avatarFile) {
      avatarUrl = await uploadAvatar(avatarFile);
      if (!avatarUrl) {
        setSubmitting(false);
        return;
      }
    }

    const payload = buildPayload(avatarUrl);

    const { data: inserted, error: err } = await supabase
      .from("roommate_profiles")
      .insert([{ ...payload, user_id: user?.id ?? null }])
      .select("id")
      .single();

    if (err) {
      setError(`SUBMISSION FAILED: ${err.message}`);
      setSubmitting(false);
      return;
    }

    // If already logged in, go straight home
    if (user) {
      router.push("/roommates?submitted=true");
      return;
    }

    // Show account creation interstitial
    setSubmittedProfileId(inserted.id);
    setSubmitting(false);
  };

  const canSubmit =
    formData.name.trim() &&
    formData.contact.trim() &&
    formData.school &&
    !submitting;
  const headerBg =
    formData.school === "UC Berkeley"
      ? "var(--berkeley-blue)"
      : formData.school === "Stanford"
        ? "var(--stanford-cardinal)"
        : "var(--cardinal)";
  const accent = headerBg;

  // Post-submit interstitial — prompt account creation
  if (submittedProfileId) {
    // After sign-up succeeds, link the profile to the new user
    const handleAuthSuccess = async () => {
      await new Promise((r) => setTimeout(r, 500));
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/roommates?submitted=true");
        return;
      }
      const { error } = await supabase
        .from("roommate_profiles")
        .update({ user_id: authUser.id })
        .eq("id", submittedProfileId)
        .is("user_id", null);
      router.push(
        error
          ? "/roommates?submitted=true"
          : "/roommates?submitted=true&linked=true",
      );
    };

    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--beige)" }}
      >
        <div
          className="w-full max-w-md border-[3px] border-[var(--black)] p-8 text-center"
          style={{ background: "#FAF6EC", boxShadow: "8px 8px 0 var(--black)" }}
        >
          <div className="text-5xl mb-4">&#10003;</div>
          <h2
            className="font-display text-3xl tracking-wider mb-2"
            style={{ color: "var(--black)" }}
          >
            PROFILE DROPPED
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--mid)" }}>
            Create an account to edit your profile later and save course
            schedules.
          </p>

          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full py-3 font-display text-sm tracking-wider text-white border-[3px] border-[var(--black)] mb-3 transition-all hover:translate-y-[-2px]"
            style={{
              background: "var(--cardinal)",
              boxShadow: "4px 4px 0 var(--black)",
            }}
          >
            CREATE ACCOUNT
          </button>
          <button
            onClick={() => router.push("/roommates?submitted=true")}
            className="w-full py-3 font-display text-sm tracking-wider border-[3px] border-[var(--black)] transition-all hover:translate-y-[-2px]"
            style={{ background: "white", color: "var(--black)" }}
          >
            NO THANKS &rarr;
          </button>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="CREATE ACCOUNT"
          subtitle="Use your school email to create an account"
          defaultMode="signup"
          onSuccess={handleAuthSuccess}
        />
      </main>
    );
  }

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
            DROP
          </div>
          <Link
            href="/roommates"
            className="font-display text-xs tracking-[0.2em] text-white/60 hover:text-white mb-4 inline-block"
          >
            &larr; BACK
          </Link>
          <h1 className="font-display text-[48px] sm:text-[64px] text-white leading-[0.85]">
            DROP YOUR
            <br />
            PROFILE
          </h1>
          <p className="text-xs text-white/60 mt-3">
            Fill in your habits. Find your match.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="brutal-container p-6 sm:p-8 space-y-8"
        >
          {/* Section 01: Basic Info */}
          <div className="relative">
            <span className="section-number text-[80px]">01</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              BASIC INFO
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  NAME / NICKNAME{" "}
                  <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="你的姓名或昵称"
                  className="brutal-input"
                  required
                />
              </div>

              {/* Avatar upload */}
              <AvatarUpload
                avatarPreview={avatarPreview}
                hasFile={!!avatarFile}
                onFileChange={handleAvatarChange}
                onError={(msg) => setError(msg)}
              />

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-2"
                  style={{ color: "var(--mid)" }}
                >
                  SCHOOL <span style={{ color: "var(--cardinal)" }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SCHOOL_OPTIONS.map((s) => {
                    const color =
                      s === "UC Berkeley"
                        ? "var(--berkeley-blue)"
                        : s === "Stanford"
                          ? "var(--stanford-cardinal)"
                          : "var(--cardinal)";
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          updateField("school", formData.school === s ? "" : s)
                        }
                        className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
                        style={
                          formData.school === s
                            ? {
                                background: color,
                                color: "white",
                                borderColor: color,
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
                    className="font-display text-sm tracking-wider block mb-1"
                    style={{ color: "var(--mid)" }}
                  >
                    GENDER
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className="brutal-select w-full"
                  >
                    <option value="">—</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="font-display text-sm tracking-wider block mb-1"
                    style={{ color: "var(--mid)" }}
                  >
                    YEAR
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => {
                      updateField("year", e.target.value);
                      if (e.target.value !== "新生")
                        updateField("enrollmentTerm", "");
                    }}
                    className="brutal-select w-full"
                  >
                    <option value="">—</option>
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.year === "新生" && (
                <div>
                  <label
                    className="font-display text-sm tracking-wider block mb-2"
                    style={{ color: "var(--mid)" }}
                  >
                    ENROLLMENT TERM
                  </label>
                  <div className="flex gap-2">
                    {ENROLLMENT_OPTIONS.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() =>
                          updateField(
                            "enrollmentTerm",
                            formData.enrollmentTerm === term ? "" : term,
                          )
                        }
                        className="brutal-tag cursor-pointer text-xs px-4 py-1.5 transition-colors"
                        style={
                          formData.enrollmentTerm === term
                            ? {
                                background: "var(--gold)",
                                color: "var(--black)",
                                borderColor: "var(--black)",
                              }
                            : {}
                        }
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label
                  className="font-display text-sm tracking-wider block mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  MAJOR
                </label>
                <input
                  type="text"
                  value={formData.major}
                  onChange={(e) => updateField("major", e.target.value)}
                  placeholder="如：Computer Science, Business"
                  className="brutal-input"
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
                  value={formData.contact}
                  onChange={(e) => updateField("contact", e.target.value)}
                  placeholder="微信号或手机号"
                  className="brutal-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 02: Habits */}
          <div className="relative">
            <span className="section-number text-[80px]">02</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              HABITS
            </h2>
            <div className="space-y-5">
              <RadioGroup
                label="SLEEP TIME"
                options={SLEEP_OPTIONS}
                value={formData.sleepHabit}
                onChange={(v) => updateField("sleepHabit", v)}
                accent={accent}
                customizable
                customValue={formData.customSleep}
                onCustomChange={(v) => updateField("customSleep", v)}
                customPlaceholder="如：看情况、不固定、1点左右"
              />
              <RadioGroup
                label="CLEANLINESS"
                options={CLEAN_OPTIONS}
                value={formData.cleanLevel}
                onChange={(v) => updateField("cleanLevel", v)}
                accent={accent}
              />
              <RadioGroup
                label="NOISE TOLERANCE"
                options={NOISE_OPTIONS}
                value={formData.noiseLevel}
                onChange={(v) => updateField("noiseLevel", v)}
                accent={accent}
              />
              <RadioGroup
                label="MUSIC / SPEAKERS"
                options={MUSIC_OPTIONS}
                value={formData.musicHabit}
                onChange={(v) => updateField("musicHabit", v)}
                accent={accent}
              />
              <RadioGroup
                label="STUDY SPOT"
                options={STUDY_OPTIONS}
                value={formData.studyStyle}
                onChange={(v) => updateField("studyStyle", v)}
                accent={accent}
              />
            </div>
          </div>

          {/* Section 03: Hobbies */}
          <div className="relative">
            <span className="section-number text-[80px]">03</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              HOBBIES
            </h2>
            <input
              type="text"
              value={formData.hobbies}
              onChange={(e) => updateField("hobbies", e.target.value)}
              placeholder="如：篮球、摄影、弹吉他、看动漫"
              className="brutal-input"
            />
          </div>

          {/* Section 04: Tags */}
          <div className="relative">
            <span className="section-number text-[80px]">04</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              TAGS
            </h2>
            <TagPicker
              selectedTags={formData.tags}
              onToggle={toggleTag}
              accent={accent}
            />
          </div>

          {/* Section 05: Bio */}
          <div className="relative">
            <span className="section-number text-[80px]">05</span>
            <h2
              className="font-display text-[32px] mb-6 border-b-[3px] border-[var(--black)] pb-2"
              style={{ color: "var(--black)" }}
            >
              BIO
            </h2>
            <textarea
              value={formData.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="简单介绍一下自己（最多200字）"
              maxLength={200}
              rows={3}
              className="brutal-input resize-none"
            />
            <p
              className="text-[10px] mt-1 text-right uppercase tracking-wider"
              style={{ color: "var(--mid)" }}
            >
              {formData.bio.length}/200
            </p>
          </div>

          {/* Error */}
          {errors.general && (
            <div
              className="p-4 border-[3px]"
              style={{
                borderColor: "var(--cardinal)",
                background: "var(--cardinal)",
                color: "white",
              }}
            >
              <span className="font-display text-sm tracking-wider">
                {errors.general}
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`brutal-btn w-full text-center ${canSubmit ? "brutal-btn-primary" : ""}`}
            style={
              !canSubmit
                ? {
                    background: "var(--beige)",
                    color: "var(--mid)",
                    cursor: "not-allowed",
                  }
                : {}
            }
          >
            {submitting ? "DROPPING..." : "DROP MY PROFILE"}
          </button>
        </form>
      </div>
    </main>
  );
}
