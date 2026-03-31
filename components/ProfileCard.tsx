"use client";

import Image from "next/image";
import { RoommateProfile } from "@/lib/types";
import {
  getAvatarColor,
  getLastChar,
  relativeTime,
  schoolAccent,
  schoolCardClass,
} from "@/lib/utils";

const SCHOOL_LOGOS: Record<string, string> = {
  USC: "/schools/usc.svg",
  "UC Berkeley": "/schools/ucberkeley.svg",
  Stanford: "/schools/stanford.svg",
};

export default function ProfileCard({
  profile,
  onClick,
}: {
  profile: RoommateProfile;
  onClick: () => void;
}) {
  const avatarColor = getAvatarColor(profile.name);
  const lastChar = getLastChar(profile.name);
  const accent = schoolAccent(profile.school);
  const cardClass = schoolCardClass(profile.school);

  const subtitleParts = [
    profile.school,
    profile.year === "新生" && profile.enrollment_term
      ? `新生 (${profile.enrollment_term})`
      : profile.year,
    profile.major,
    profile.gender,
  ].filter(Boolean);

  return (
    <div
      className={`brutal-card ${cardClass} p-5 cursor-pointer flex flex-col gap-3 relative`}
      onClick={onClick}
    >
      {/* School logo */}
      {profile.school && SCHOOL_LOGOS[profile.school] && (
        <div className="absolute top-3 right-3">
          <Image
            src={SCHOOL_LOGOS[profile.school]}
            alt={profile.school}
            width={28}
            height={28}
            className="drop-shadow-sm"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 pr-8">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            className="w-12 h-12 object-cover border-[3px] border-[var(--black)] shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 flex items-center justify-center text-white font-display text-xl border-[3px] border-[var(--black)] shrink-0"
            style={{ backgroundColor: accent }}
          >
            {lastChar}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3
            className="font-display text-xl truncate"
            style={{ color: "var(--black)" }}
          >
            {profile.name}
          </h3>
          <p className="text-[11px] truncate" style={{ color: "var(--mid)" }}>
            {subtitleParts.join(" / ")}
          </p>
        </div>
      </div>

      {/* Tags */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="brutal-tag">
              {tag}
            </span>
          ))}
          {profile.tags.length > 4 && (
            <span
              className="brutal-tag"
              style={{ borderStyle: "dashed", color: "var(--mid)" }}
            >
              +{profile.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Bio preview */}
      {profile.bio && (
        <p className="text-xs line-clamp-2" style={{ color: "var(--mid)" }}>
          {profile.bio}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t-[2px] border-[var(--black)] flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "var(--mid)" }}
        >
          {relativeTime(profile.created_at)}
        </span>
        <span
          className="font-display text-xs tracking-wider"
          style={{ color: accent }}
        >
          VIEW DETAILS →
        </span>
      </div>
    </div>
  );
}
