"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { RoommateProfile, GENDER_OPTIONS, YEAR_OPTIONS } from "@/lib/types";
import {
  type ProductSchool,
  normalizeProductSchool,
} from "@/lib/product-school";
import ProfileCard from "@/components/ProfileCard";
import ProfileModal from "@/components/ProfileModal";
import SkeletonCard from "@/components/SkeletonCard";
import Toast from "@/components/Toast";
import ProductShell, {
  ProductTaskHeader,
  type ProductLanguage,
} from "@/components/ProductShell";

function Marquee({
  bg,
  text,
  items,
}: {
  bg: string;
  text: string;
  items: string[];
}) {
  const content = items.join("  //  ") + "  //  ";
  return (
    <div
      className="overflow-hidden border-y border-black/5"
      style={{ background: bg, color: text }}
    >
      <div className="marquee-track py-2">
        <span className="font-display text-sm tracking-[0.15em] whitespace-nowrap px-4">
          {content}
        </span>
        <span className="font-display text-sm tracking-[0.15em] whitespace-nowrap px-4">
          {content}
        </span>
      </div>
    </div>
  );
}

const ROOMMATES_COPY: Record<
  ProductLanguage,
  {
    toast: string;
    loadError: string;
    headerEyebrow: string;
    headerTitle: string;
    headerDescription: string;
    primaryAction: string;
    secondaryAction: string;
    trustItems: string[];
    browseTitle: string;
    searchPlaceholder: string;
    allGenders: string;
    allYears: string;
    retry: string;
    noProfiles: string;
    noMatches: string;
    beFirst: string;
    adjustFilters: string;
    dropProfile: string;
    profilesFound: (count: number) => string;
    marqueeItems: string[];
    footer: string;
  }
> = {
  zh: {
    toast: "资料发布成功",
    loadError: "加载失败，请重试",
    headerEyebrow: "住房 / 找室友",
    headerTitle: "找室友",
    headerDescription:
      "优先浏览你学校的室友资料，需要换学校时直接使用右上角学校选择。",
    primaryAction: "浏览资料",
    secondaryAction: "发布资料",
    trustItems: ["本校优先", "资料可控", "可反馈问题"],
    browseTitle: "浏览",
    searchPlaceholder: "搜索姓名 / 专业 / 标签...",
    allGenders: "全部性别",
    allYears: "全部年级",
    retry: "重试",
    noProfiles: "暂无资料",
    noMatches: "没有匹配",
    beFirst: "成为第一个发布资料的人。",
    adjustFilters: "试试调整筛选条件。",
    dropProfile: "发布资料",
    profilesFound: (count) => `${count} 个资料`,
    marqueeItems: [
      "2030 新生",
      "FIGHT ON",
      "GO BEARS",
      "GO CARDINAL",
      "BIA",
      "找室友",
      "发布资料",
    ],
    footer: "BIA 找室友 — 本校优先",
  },
  en: {
    toast: "PROFILE DROPPED SUCCESSFULLY",
    loadError: "LOAD FAILED - RETRY",
    headerEyebrow: "Housing / Roommates",
    headerTitle: "Roommates",
    headerDescription:
      "Browse roommate profiles from your school first. Switch schools from the top bar when needed.",
    primaryAction: "Browse profiles",
    secondaryAction: "Drop my profile",
    trustItems: ["School-first profiles", "Profile control", "Report issues"],
    browseTitle: "BROWSE",
    searchPlaceholder: "SEARCH NAME / MAJOR / TAGS...",
    allGenders: "ALL GENDERS",
    allYears: "ALL YEARS",
    retry: "RETRY",
    noProfiles: "NO PROFILES YET",
    noMatches: "NO MATCHES",
    beFirst: "Be the first to drop your profile.",
    adjustFilters: "Try adjusting your filters.",
    dropProfile: "DROP PROFILE",
    profilesFound: (count) => `${count} PROFILES FOUND`,
    marqueeItems: [
      "CLASS OF 2030",
      "FIGHT ON",
      "GO BEARS",
      "GO CARDINAL",
      "BIA",
      "ROOMMATE MATCH",
      "DROP YOUR PROFILE",
    ],
    footer: "BIA ROOMMATE MATCH — SCHOOL-FIRST HOUSING",
  },
};

type RoommatesContentProps = {
  initialSchool: ProductSchool;
  language: ProductLanguage;
};

function RoommatesContent({
  initialSchool,
  language,
}: RoommatesContentProps) {
  const copy = ROOMMATES_COPY[language];
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profiles, setProfiles] = useState<RoommateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<RoommateProfile | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<ProductSchool>(
    normalizeProductSchool(searchParams.get("school")) ?? initialSchool,
  );
  const [genderFilter, setGenderFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  useEffect(() => {
    setSchoolFilter(initialSchool);
  }, [initialSchool]);

  useEffect(() => {
    if (searchParams.get("submitted") === "true") {
      setShowToast(true);
      router.replace("/roommates", { scroll: false });
    }
  }, [searchParams, router]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("roommate_profiles")
      .select("*")
      .eq("visible", true)
      .order("created_at", { ascending: false });

    if (err) {
      setError(copy.loadError);
      setLoading(false);
      return;
    }
    setProfiles(data || []);
    if (data && data.length > 0) {
      const ids = data.map((p: RoommateProfile) => p.id).join(",");
      fetch(`/api/likes/count?ids=${ids}`)
        .then((r) => r.json())
        .then(setLikeCounts)
        .catch(() => {});
    }
    setLoading(false);
  }, [copy.loadError]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const filtered = profiles.filter((p) => {
    if (schoolFilter && p.school !== schoolFilter) return false;
    if (genderFilter && p.gender !== genderFilter) return false;
    if (yearFilter && p.year !== yearFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchMajor = p.major?.toLowerCase().includes(q);
      const matchTags = p.tags?.some((t) => t.toLowerCase().includes(q));
      const matchHobbies = p.hobbies?.toLowerCase().includes(q);
      if (!matchName && !matchMajor && !matchTags && !matchHobbies)
        return false;
    }
    return true;
  });

  return (
    <>
      {showToast && (
        <Toast
          message={copy.toast}
          onClose={() => setShowToast(false)}
        />
      )}

      <ProductTaskHeader
        eyebrow={copy.headerEyebrow}
        school={initialSchool}
        language={language}
        title={copy.headerTitle}
        description={copy.headerDescription}
        primaryAction={{ label: copy.primaryAction, href: "#browse" }}
        secondaryAction={{ label: copy.secondaryAction, href: "/submit" }}
        trustItems={copy.trustItems}
        previewImage="/previews/roommates.png"
        previewAlt="BIA roommate product preview"
      />

      {/* Filters */}
      <section
        id="browse"
        className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent sm:inset-x-6" />
        <h2
          className="heading-serif mb-8 text-[38px] leading-none text-[#171717] sm:text-[52px]"
          style={{
            fontFamily:
              language === "zh" ? "var(--font-display-zh)" : "var(--font-display)",
          }}
        >
          {copy.browseTitle}
        </h2>

        <div className="mb-8 grid gap-3 rounded-3xl border border-black/5 bg-white/80 p-3 shadow-lg shadow-black/[0.04] backdrop-blur sm:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            placeholder={copy.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-12 rounded-2xl border border-black/10 bg-[#F9FAF7] px-4 text-sm text-[#171717] outline-none transition-shadow placeholder:text-[#999] focus:shadow-[0_0_0_3px_rgba(160,215,209,0.35)]"
          />
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="min-h-12 rounded-2xl border border-black/10 bg-[#F9FAF7] px-4 text-sm font-medium text-[#171717] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(160,215,209,0.35)]"
          >
            <option value="">{copy.allGenders}</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="min-h-12 rounded-2xl border border-black/10 bg-[#F9FAF7] px-4 text-sm font-medium text-[#171717] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(160,215,209,0.35)]"
          >
            <option value="">{copy.allYears}</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-black/5 bg-white py-20 text-center shadow-lg shadow-black/[0.04]">
            <p
              className="heading-serif text-2xl text-[#71031f]"
            >
              {error}
            </p>
            <button
              onClick={fetchProfiles}
              className="mt-6 rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white"
            >
              {copy.retry}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="relative rounded-3xl border border-black/5 bg-white py-20 text-center shadow-lg shadow-black/[0.04]">
            <h3
              className="heading-serif relative mb-3 text-4xl text-[#171717]"
              style={{
                fontFamily:
                  language === "zh"
                    ? "var(--font-display-zh)"
                    : "var(--font-display)",
              }}
            >
              {profiles.length === 0 ? copy.noProfiles : copy.noMatches}
            </h3>
            <p
              className="relative mb-6 text-sm text-[#646464]"
            >
              {profiles.length === 0
                ? copy.beFirst
                : copy.adjustFilters}
            </p>
            {profiles.length === 0 && (
              <Link
                href="/submit"
                className="relative inline-flex min-h-12 items-center rounded-xl bg-[#171717] px-6 text-sm font-bold uppercase tracking-wide text-white"
              >
                {copy.dropProfile}
              </Link>
            )}
          </div>
        ) : (
          <>
            <p
              className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#999]"
            >
              {copy.profilesFound(filtered.length)}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((profile, i) => (
                <div
                  key={profile.id}
                  className="reveal"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <ProfileCard
                    profile={profile}
                    onClick={() => setSelectedProfile(profile)}
                    likeCount={likeCounts[profile.id]}
                    onLikeChange={(id, liked) => {
                      setLikeCounts((prev) => ({
                        ...prev,
                        [id]: Math.max(0, (prev[id] || 0) + (liked ? 1 : -1)),
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Bottom Marquee */}
      <Marquee
        bg="#1F1F29"
        text="#A0D7D1"
        items={copy.marqueeItems}
      />

      {/* Social Links */}
      <section
        className="border-t border-black/5 px-6 py-10"
        style={{ background: "#FEFFFC" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="https://www.instagram.com/bia_usc/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-sm font-semibold text-[#171717] shadow-sm transition-shadow hover:shadow-md"
          >
            <span>INSTAGRAM</span>
            <span className="text-[#71031f]">@BIA_USC</span>
            <span className="text-xs text-[#999]">→</span>
          </a>
          <a
            href="https://xhslink.com/m/2t4EzpZAKAc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-sm font-semibold text-[#171717] shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="text-[#71031f]">小红书</span>
            <span
              className="rounded-full bg-[#eef6f4] px-2 py-0.5 text-[10px] font-semibold text-[#55736f]"
            >
              4138 LIKES
            </span>
            <span className="text-xs text-[#999]">→</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 px-6 py-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#999]">
          {copy.footer}
        </p>
      </footer>

      {/* Detail Modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense>
      <ProductShell group="housing" page="roommates">
        {({ school, language }) => (
          <RoommatesContent initialSchool={school} language={language} />
        )}
      </ProductShell>
    </Suspense>
  );
}
