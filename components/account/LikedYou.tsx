"use client";

// "Who liked you" + mutual-match reveal for the account page.
//
// Likes are world-readable (profile_likes RLS = USING(true)) and profiles are
// readable when visible, so this whole loop is computed client-side with zero
// schema change. A like is "mutual" when the liker's profile is one the viewer
// also liked — at which point we celebrate it and reveal contact (which any
// signed-in user can already see by browsing, so this exposes nothing new).

import { useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import {
  type RoommateProfile,
  type ContactChannel,
  CONTACT_PLATFORM_META,
} from "@/lib/types";
import { schoolAccent, getLastChar, relativeTime } from "@/lib/utils";
import { SCHOOL_LOGOS } from "@/lib/constants";

export type LikedYouProfile = RoommateProfile & {
  user_id: string | null;
  liked_at: string;
  is_mutual: boolean;
};

const COPY = {
  zh: {
    mutual: "互相心动",
    mutualHint: "你们都点了心动 —— 联系方式已解锁，去打个招呼吧",
    pending: "谁喜欢了你",
    pendingHint: "点开资料，如果你也心动，就会互相解锁",
    likedYou: "对你心动",
    likeBack: "心动回去",
    noProfile: "公开你的资料，才能收到别人的心动",
    publish: "去发布资料 →",
    empty: "还没有人对你心动 —— 多浏览、主动点心动，更容易被看到",
    copy: "复制",
    copied: "已复制",
  },
  en: {
    mutual: "It's a match",
    mutualHint: "You both liked each other — contact unlocked, say hi!",
    pending: "Liked you",
    pendingHint: "Open their profile; if you like back, you both unlock.",
    likedYou: "liked you",
    likeBack: "Like back",
    noProfile: "Make your profile public to start receiving likes",
    publish: "Drop your profile →",
    empty: "No likes yet — browse and like people; you'll get seen faster",
    copy: "Copy",
    copied: "Copied",
  },
};

function channelsOf(p: LikedYouProfile): ContactChannel[] {
  if (p.contact_channels && p.contact_channels.length > 0) {
    return p.contact_channels;
  }
  return p.contact ? [{ platform: "other", value: p.contact }] : [];
}

function Avatar({ profile, size = 44 }: { profile: LikedYouProfile; size?: number }) {
  const accent = schoolAccent(profile.school);
  return profile.avatar_url ? (
    <Image
      src={profile.avatar_url}
      alt={profile.name}
      width={size}
      height={size}
      className="object-cover border-[3px] border-[var(--black)] shrink-0"
      style={{ width: size, height: size }}
      unoptimized
    />
  ) : (
    <div
      className="flex items-center justify-center text-white font-display text-lg border-[3px] border-[var(--black)] shrink-0"
      style={{ width: size, height: size, backgroundColor: accent }}
    >
      {getLastChar(profile.name)}
    </div>
  );
}

export default function LikedYou({
  profiles,
  hasProfile,
  onLikeBack,
  onPublishClick,
}: {
  profiles: LikedYouProfile[];
  hasProfile: boolean;
  onLikeBack: (profileId: string) => void;
  onPublishClick: () => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const [copied, setCopied] = useState<string | null>(null);

  if (!hasProfile) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-sm mb-3" style={{ color: "var(--mid)" }}>
          {t.noProfile}
        </p>
        <button
          onClick={onPublishClick}
          className="font-display text-xs tracking-wider px-4 py-2 border-[3px] border-[var(--black)] hover:bg-[var(--gold)] transition-colors"
          style={{ color: "var(--black)" }}
        >
          {t.publish}
        </button>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <p className="text-sm text-center py-8 px-4" style={{ color: "var(--mid)" }}>
        {t.empty}
      </p>
    );
  }

  const mutual = profiles.filter((p) => p.is_mutual);
  const pending = profiles.filter((p) => !p.is_mutual);

  const copyValue = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(key);
        setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
      },
      () => {},
    );
  };

  return (
    <div className="space-y-5 mt-3">
      {mutual.length > 0 && (
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <h4 className="font-display text-sm tracking-wider" style={{ color: "var(--cardinal)" }}>
              💞 {t.mutual} ({mutual.length})
            </h4>
          </div>
          <p className="text-[11px] mb-3" style={{ color: "var(--mid)" }}>
            {t.mutualHint}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {mutual.map((p) => {
              const channels = channelsOf(p);
              return (
                <div
                  key={p.id}
                  className="border-[3px] border-[var(--black)] p-4"
                  style={{ background: "color-mix(in srgb, var(--gold) 14%, white)" }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar profile={p} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base truncate" style={{ color: "var(--black)" }}>
                          {p.name}
                        </h3>
                        <span
                          className="font-display text-[9px] tracking-wider px-1.5 py-0.5 border-[2px] border-[var(--black)] shrink-0"
                          style={{ background: "var(--cardinal)", color: "white" }}
                        >
                          💞 {t.mutual}
                        </span>
                      </div>
                      <p className="text-[10px] truncate" style={{ color: "var(--mid)" }}>
                        {[p.school, p.major, p.year].filter(Boolean).join(" / ")}
                      </p>
                    </div>
                  </div>

                  {channels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {channels.map((ch, i) => {
                        const meta = CONTACT_PLATFORM_META[ch.platform];
                        const key = `${p.id}-${i}`;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => copyValue(key, ch.value)}
                            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 border-[2px] border-[var(--black)] bg-white hover:bg-[var(--cream)] transition-colors"
                            title={t.copy}
                          >
                            <span>{meta.icon}</span>
                            <span style={{ color: "var(--black)" }}>{ch.value}</span>
                            <span className="text-[9px]" style={{ color: "var(--mid)" }}>
                              {copied === key ? `✓ ${t.copied}` : t.copy}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h4 className="font-display text-sm tracking-wider mb-1" style={{ color: "var(--black)" }}>
            {t.pending} ({pending.length})
          </h4>
          <p className="text-[11px] mb-3" style={{ color: "var(--mid)" }}>
            {t.pendingHint}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pending.map((p) => (
              <div
                key={p.id}
                className="border-[3px] border-[var(--black)] p-4 flex flex-col gap-3 relative"
                style={{ background: "white" }}
              >
                {p.school && SCHOOL_LOGOS[p.school] && (
                  <div className="absolute top-2 right-2">
                    <Image src={SCHOOL_LOGOS[p.school]} alt={p.school} width={20} height={20} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Avatar profile={p} size={40} />
                  <div className="min-w-0 flex-1 pr-6">
                    <h3 className="font-display text-base truncate" style={{ color: "var(--black)" }}>
                      {p.name}
                    </h3>
                    <p className="text-[10px] truncate" style={{ color: "var(--mid)" }}>
                      {[p.school, p.major, p.year].filter(Boolean).join(" / ")}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--cardinal)" }}>
                      ♥ {t.likedYou} · {relativeTime(p.liked_at)}
                    </p>
                  </div>
                </div>
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="brutal-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onLikeBack(p.id)}
                  className="font-display text-xs tracking-wider px-3 py-2 border-[3px] border-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white transition-colors mt-auto"
                  style={{ color: "var(--black)" }}
                >
                  ♥ {t.likeBack}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
