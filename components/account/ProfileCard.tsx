"use client";

import { RoommateProfile } from "@/lib/types";
import { schoolAccent, schoolTagClass, getLastChar } from "@/lib/utils";
import Image from "next/image";
import { SCHOOL_LOGOS } from "@/lib/constants";

export interface ProfileCardProps {
  profile: RoommateProfile | null;
  loading: boolean;
}

export default function ProfileCard({ profile, loading }: ProfileCardProps) {
  if (loading) {
    return (
      <div
        className="border-[3px] border-[var(--black)] p-6 animate-pulse"
        style={{ background: "var(--cream)", height: 180 }}
      />
    );
  }

  if (!profile) {
    return (
      <div
        className="border-[3px] border-[var(--black)] p-8 text-center"
        style={{ background: "var(--cream)" }}
      >
        <h2
          className="font-display text-xl tracking-wider mb-2"
          style={{ color: "var(--black)" }}
        >
          COMPLETE YOUR PROFILE
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--mid)" }}>
          Set up your roommate profile to get started
        </p>
        <a
          href="/onboarding"
          className="inline-block font-display text-xs tracking-wider px-6 py-2 border-[3px] border-[var(--black)] text-white transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_var(--gold)]"
          style={{ background: "var(--cardinal)" }}
        >
          GET STARTED
        </a>
      </div>
    );
  }

  const accent = schoolAccent(profile.school);
  const lastChar = getLastChar(profile.name);

  return (
    <div
      className="border-[3px] border-[var(--black)] p-5 relative"
      style={{ background: "var(--cream)" }}
    >
      {/* School logo badge */}
      {profile.school && SCHOOL_LOGOS[profile.school] && (
        <div className="absolute top-4 right-4">
          <Image
            src={SCHOOL_LOGOS[profile.school]}
            alt={profile.school}
            width={28}
            height={28}
          />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.name}
            width={64}
            height={64}
            className="w-16 h-16 object-cover border-[3px] border-[var(--black)] shrink-0"
          />
        ) : (
          <div
            className="w-16 h-16 flex items-center justify-center text-white font-display text-2xl border-[3px] border-[var(--black)] shrink-0"
            style={{ backgroundColor: accent }}
          >
            {lastChar}
          </div>
        )}

        <div className="min-w-0 flex-1 pr-8">
          {/* Name */}
          <h2
            className="font-display text-2xl tracking-wider"
            style={{ color: "var(--black)" }}
          >
            {profile.name}
          </h2>
          {/* Subtitle line */}
          <p className="text-xs mt-1" style={{ color: "var(--mid)" }}>
            {[profile.school, profile.year, profile.major, profile.gender]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p
          className="text-sm mt-3 leading-relaxed"
          style={{ color: "var(--black)" }}
        >
          {profile.bio}
        </p>
      )}

      {/* Tags */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className={`brutal-tag text-[10px] px-2 py-0.5 ${schoolTagClass(profile.school)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Contact box */}
      {profile.contact && (
        <div
          className="mt-3 px-3 py-2 text-xs border-[2px] border-[var(--black)]"
          style={{ background: "var(--gold)", color: "var(--black)" }}
        >
          {profile.contact}
        </div>
      )}

      {/* Edit profile button */}
      <a
        href="/onboarding"
        className="inline-block mt-4 font-display text-xs tracking-wider px-5 py-2 border-[3px] border-[var(--black)] text-white transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_var(--gold)]"
        style={{ background: "var(--cardinal)" }}
      >
        EDIT PROFILE
      </a>
    </div>
  );
}
