"use client";

import { useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ProfileFormData {
  name: string;
  school: string;
  gender: string;
  major: string;
  year: string;
  enrollmentTerm: string;
  contact: string;
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
    const required = requiredFields ?? ["name", "contact"];
    for (const key of required) {
      const val = formData[key];
      if (typeof val === "string" && !val.trim()) return false;
    }
    return true;
  }

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
    const finalSleep =
      formData.sleepHabit === "__custom__"
        ? formData.customSleep.trim() || null
        : formData.sleepHabit || null;

    return {
      name: formData.name.trim(),
      avatar_url: avatarUrl || formData.avatarUrl.trim() || null,
      school: formData.school || null,
      gender: formData.gender || null,
      major: formData.major.trim() || null,
      year: formData.year || null,
      enrollment_term:
        formData.year === "新生" ? formData.enrollmentTerm || null : null,
      contact: formData.contact.trim(),
      sleep_habit: finalSleep,
      clean_level: formData.cleanLevel || null,
      noise_level: formData.noiseLevel || null,
      music_habit: formData.musicHabit || null,
      study_style: formData.studyStyle || null,
      hobbies: formData.hobbies.trim() || null,
      tags: formData.tags.length > 0 ? formData.tags : null,
      bio: formData.bio.trim() || null,
      visible: formData.year === "新生",
    };
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
  };
}
