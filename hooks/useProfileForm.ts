"use client";

import { useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { ContactChannel, ContactPlatform } from "@/lib/types";

export interface ProfileFormData {
  name: string;
  school: string;
  gender: string;
  major: string;
  year: string;
  enrollmentTerm: string;
  /** Legacy single text; kept in sync with first contactChannels entry on save. */
  contact: string;
  /** Structured contact channels — primary source of truth. */
  contactChannels: ContactChannel[];
  sleepHabit: string;
  customSleep: string;
  cleanLevel: string;
  noiseLevel: string;
  musicHabit: string;
  studyStyle: string;
  hobbies: string;
  tags: string[];
  bio: string;
  avatarUrl: string;
}

export const INITIAL_PROFILE_FORM: ProfileFormData = {
  name: "",
  school: "",
  gender: "",
  major: "",
  year: "",
  enrollmentTerm: "",
  contact: "",
  contactChannels: [],
  sleepHabit: "",
  customSleep: "",
  cleanLevel: "",
  noiseLevel: "",
  musicHabit: "",
  studyStyle: "",
  hobbies: "",
  tags: [],
  bio: "",
  avatarUrl: "",
};

export interface ProfileFormErrors {
  general: string | null;
}

/**
 * Pure form validation shared by the hook's `validate`. A profile is valid when
 * every required text field is non-empty AND the visitor left at least one way
 * to be reached — either a structured contact channel OR the legacy free-text
 * `contact` field. The legacy /submit page only writes `contact` (it has no
 * channel UI), so requiring a non-empty channel there dead-locked its submit
 * button; accepting either source fixes that without changing the channel-based
 * onboarding flow.
 */
export function validateProfileForm(
  formData: ProfileFormData,
  requiredFields: (keyof ProfileFormData)[] = ["name"],
): boolean {
  for (const key of requiredFields) {
    const val = formData[key];
    if (typeof val === "string" && !val.trim()) return false;
  }
  const hasChannel = formData.contactChannels.some((c) => c.value.trim());
  const hasLegacyContact = formData.contact.trim().length > 0;
  return hasChannel || hasLegacyContact;
}

/**
 * Pure database-payload builder shared by the hook's `buildPayload`. Note:
 * `visible: true` for every year (SANCTIONED behavior change) — profiles are
 * shown regardless of year. Previously non-新生 profiles were persisted with
 * `visible: false` and silently hidden from the roommate directory.
 */
export function buildProfilePayload(
  formData: ProfileFormData,
  avatarUrl: string | null,
) {
  const finalSleep =
    formData.sleepHabit === "__custom__"
      ? formData.customSleep.trim() || null
      : formData.sleepHabit || null;

  // Strip empty-value channels before persisting.
  const channels = formData.contactChannels
    .map((c) => ({ ...c, value: c.value.trim() }))
    .filter((c) => c.value.length > 0);

  // `contact` stays for backward-compat readers. Pack the channels as a
  // "label: value" list so old cards still show something meaningful.
  const contactText = channels
    .map((c) => `${c.platform}: ${c.value}`)
    .join(" · ");

  return {
    name: formData.name.trim(),
    avatar_url: avatarUrl || formData.avatarUrl.trim() || null,
    school: formData.school || null,
    gender: formData.gender || null,
    major: formData.major.trim() || null,
    year: formData.year || null,
    enrollment_term:
      formData.year === "新生" ? formData.enrollmentTerm || null : null,
    contact: contactText || formData.contact.trim(),
    contact_channels: channels,
    sleep_habit: finalSleep,
    clean_level: formData.cleanLevel || null,
    noise_level: formData.noiseLevel || null,
    music_habit: formData.musicHabit || null,
    study_style: formData.studyStyle || null,
    hobbies: formData.hobbies.trim() || null,
    tags: formData.tags.length > 0 ? formData.tags : null,
    bio: formData.bio.trim() || null,
    visible: true,
  };
}

interface UseProfileFormOptions {
  maxTags?: number;
}

export function useProfileForm(options: UseProfileFormOptions = {}) {
  const { maxTags = 6 } = options;
  const [formData, setFormData] =
    useState<ProfileFormData>(INITIAL_PROFILE_FORM);
  const [errors, setErrors] = useState<ProfileFormErrors>({ general: null });
  const [submitting, setSubmitting] = useState(false);

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      setFormData((prev) => {
        if (prev.tags.includes(tag)) {
          return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
        }
        if (prev.tags.length >= maxTags) return prev;
        return { ...prev, tags: [...prev.tags, tag] };
      });
    },
    [maxTags],
  );

  const setForm = useCallback((data: ProfileFormData) => {
    setFormData(data);
  }, []);

  const setError = useCallback((message: string | null) => {
    setErrors({ general: message });
  }, []);

  /** Validate that required fields are filled. Returns true if valid. */
  function validate(requiredFields?: (keyof ProfileFormData)[]): boolean {
    return validateProfileForm(formData, requiredFields ?? ["name"]);
  }

  const addContactChannel = useCallback((platform: ContactPlatform) => {
    setFormData((prev) => ({
      ...prev,
      contactChannels: [...prev.contactChannels, { platform, value: "" }],
    }));
  }, []);

  const updateContactChannel = useCallback(
    (idx: number, patch: Partial<ContactChannel>) => {
      setFormData((prev) => ({
        ...prev,
        contactChannels: prev.contactChannels.map((c, i) =>
          i === idx ? { ...c, ...patch } : c,
        ),
      }));
    },
    [],
  );

  const removeContactChannel = useCallback((idx: number) => {
    setFormData((prev) => ({
      ...prev,
      contactChannels: prev.contactChannels.filter((_, i) => i !== idx),
    }));
  }, []);

  /** Upload an avatar File to Supabase storage. Returns the public URL or null. */
  async function uploadAvatar(file: File): Promise<string | null> {
    const supabase = createBrowserSupabaseClient();
    const ext = file.name.split(".").pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });
    if (uploadErr) {
      setErrors({ general: "AVATAR UPLOAD FAILED — TRY AGAIN" });
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);
    return publicUrl;
  }

  /** Build the database payload from current form state. */
  function buildPayload(avatarUrl: string | null) {
    return buildProfilePayload(formData, avatarUrl);
  }

  return {
    formData,
    updateField,
    toggleTag,
    errors,
    setError,
    submitting,
    setSubmitting,
    setForm,
    validate,
    uploadAvatar,
    buildPayload,
    addContactChannel,
    updateContactChannel,
    removeContactChannel,
  };
}
