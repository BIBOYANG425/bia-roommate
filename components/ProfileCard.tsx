"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { RoommateProfile } from "@/lib/types";
import { getLastChar, relativeTime, schoolAccent } from "@/lib/utils";
import { useAuth } from "./AuthProvider";

const SCHOOL_LOGOS: Record<string, string> = {
  USC: "/schools/usc.svg",
  "UC Berkeley": "/schools/ucberkeley.svg",
  Stanford: "/schools/stanford.svg",
};

export default function ProfileCard({
  profile,
  onClick,
  likeCount,
  onLikeChange,
}: {
  profile: RoommateProfile;
  onClick: () => void;
  likeCount?: number;
  onLikeChange?: (profileId: string, liked: boolean) => void;
}) {
  const { user } = useAuth();
  const [likeLoading, setLikeLoading] = useState(false);
  const [localLiked, setLocalLiked] = useState(false);

  // Check if user has liked this profile
  useEffect(() => {
    let mounted = true;
    if (user) {
      import("@/lib/supabase/client").then(
        ({ createBrowserSupabaseClient }) => {
          const supabase = createBrowserSupabaseClient();
          supabase
            .from("profile_likes")
            .select("id")
            .eq("user_id", user.id)
            .eq("profile_id", profile.id)
            .maybeSingle()
            .then(({ data }: { data: { id: string } | null }) => {
              if (mounted) setLocalLiked(!!data);
            })
            .catch(() => {});
        },
      );
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id is the relevant dep, not the whole user object
  }, [user?.id, profile.id]);

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user || likeLoading) return;
      setLikeLoading(true);
      try {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_id: profile.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setLocalLiked(data.liked);
          onLikeChange?.(profile.id, data.liked);
        }
      } finally {
        setLikeLoading(false);
      }
    },
    [user, profile.id, likeLoading, onLikeChange],
  );

  const lastChar = getLastChar(profile.name);
  const accent = schoolAccent(profile.school);

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
      className="group relative flex cursor-pointer flex-col gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-lg shadow-black/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/[0.08]"
      onClick={onClick}
    >
      {/* School logo + timestamp */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
        {profile.school && SCHOOL_LOGOS[profile.school] && (
          <Image
            src={SCHOOL_LOGOS[profile.school]}
            alt={profile.school}
            width={28}
            height={28}
            className="drop-shadow-sm"
          />
        )}
        <span
          className="text-[10px] font-medium uppercase tracking-wider text-[#999]"
        >
          {relativeTime(profile.created_at)}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 pr-8">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.name}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-black/10"
            unoptimized
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl text-white shadow-sm"
            style={{ backgroundColor: accent }}
          >
            {lastChar}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-lg font-semibold text-[#171717]"
            style={{ fontFamily: "var(--font-display-zh)" }}
          >
            {profile.name}
          </h3>
          <p className="truncate text-xs text-[#646464]">
            {subtitleParts.join(" / ")}
          </p>
        </div>
      </div>

      {/* Tags */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-black/5 bg-[#F9FAF7] px-2.5 py-1 text-[11px] font-medium text-[#646464]"
            >
              {tag}
            </span>
          ))}
          {profile.tags.length > 4 && (
            <span className="rounded-full border border-dashed border-black/10 px-2.5 py-1 text-[11px] font-medium text-[#999]">
              +{profile.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Bio preview */}
      {profile.bio && (
        <p className="line-clamp-2 text-sm leading-6 text-[#646464]">
          {profile.bio}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            disabled={!user || likeLoading}
            className="text-base transition-transform hover:scale-110"
            style={{
              color: localLiked ? "#71031f" : "#999",
              cursor: user ? "pointer" : "default",
            }}
            title={user ? (localLiked ? "Unlike" : "Like") : "Sign in to like"}
          >
            {localLiked ? "\u2665" : "\u2661"}
          </button>
          {(likeCount ?? 0) > 0 && (
            <span className="text-[10px] text-[#999]">
              {likeCount}
            </span>
          )}
        </div>
        <span
          className="text-xs font-bold uppercase tracking-wide transition-transform duration-200 group-hover:translate-x-1"
          style={{ color: accent }}
        >
          View details →
        </span>
      </div>
    </div>
  );
}
