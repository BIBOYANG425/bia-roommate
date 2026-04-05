"use client";

import { RoommateProfile } from "@/lib/types";
import { schoolAccent, getLastChar, relativeTime } from "@/lib/utils";
import Image from "next/image";
import EmptyState from "./EmptyState";
import { SCHOOL_LOGOS } from "@/lib/constants";

export interface LikedProfilesProps {
  profiles: RoommateProfile[];
  onUnlike: (profileId: string) => void;
  onProfileClick: (profileId: string) => void;
}

function MiniProfileCard({
  profile,
  onClick,
}: {
  profile: RoommateProfile;
  onClick: () => void;
}) {
  const accent = schoolAccent(profile.school);
  const lastChar = getLastChar(profile.name);

  return (
    <div
      className="border-[3px] border-[var(--black)] p-4 cursor-pointer flex items-center gap-3 relative"
      style={{ background: "white" }}
      onClick={onClick}
    >
      {/* School logo */}
      {profile.school && SCHOOL_LOGOS[profile.school] && (
        <div className="absolute top-2 right-2">
          <Image
            src={SCHOOL_LOGOS[profile.school]}
            alt={profile.school}
            width={20}
            height={20}
          />
        </div>
      )}

      {/* Avatar */}
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.name}
          className="w-10 h-10 object-cover border-[3px] border-[var(--black)] shrink-0"
        />
      ) : (
        <div
          className="w-10 h-10 flex items-center justify-center text-white font-display text-lg border-[3px] border-[var(--black)] shrink-0"
          style={{ backgroundColor: accent }}
        >
          {lastChar}
        </div>
      )}

      <div className="min-w-0 flex-1 pr-6">
        <h3
          className="font-display text-base truncate"
          style={{ color: "var(--black)" }}
        >
          {profile.name}
        </h3>
        <p className="text-[10px] truncate" style={{ color: "var(--mid)" }}>
          {[profile.school, profile.major, profile.year]
            .filter(Boolean)
            .join(" / ")}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--mid)" }}>
          {relativeTime(profile.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function LikedProfiles({
  profiles,
  onUnlike,
  onProfileClick,
}: LikedProfilesProps) {
  if (profiles.length === 0) {
    return <EmptyState message="YOU HAVEN'T LIKED ANYONE YET" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {profiles.map((p) => (
        <div key={p.id} className="relative">
          <MiniProfileCard profile={p} onClick={() => onProfileClick(p.id)} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnlike(p.id);
            }}
            className="absolute top-3 right-3 font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)] bg-white hover:bg-[var(--cardinal)] hover:text-white transition-colors z-10"
          >
            UNLIKE
          </button>
        </div>
      ))}
    </div>
  );
}
