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
import { useAuth } from "@/components/AuthProvider";

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
      className="overflow-hidden border-y-[3px] border-[var(--black)]"
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

// Columns returned to logged-out visitors — deliberately excludes `contact`
// and `contact_channels` so a student's WeChat/phone is never sent over the
// wire to anonymous users. Signed-in users get `*`. This is the client half;
// server-side enforcement belongs in the roommate_profiles RLS policy.
const PUBLIC_PROFILE_COLUMNS =
  "id, name, school, gender, major, year, enrollment_term, sleep_habit, clean_level, noise_level, music_habit, study_style, hobbies, tags, avatar_url, bio, visible, created_at";

type RoommatesContentProps = {
  initialSchool: ProductSchool;
  language: ProductLanguage;
};

function RoommatesContent({
  initialSchool,
  language,
}: RoommatesContentProps) {
  const copy = ROOMMATES_COPY[language];
  const { user } = useAuth();
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
      .select(user ? "*" : PUBLIC_PROFILE_COLUMNS)
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
  }, [copy.loadError, user]);

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
      />

      {/* Filters */}
      <section id="browse" className="max-w-6xl mx-auto px-6 py-8 relative">
        <span className="section-number">01</span>
        <h2
          className="font-display text-[40px] sm:text-[60px] mb-6"
          style={{ color: "var(--black)" }}
        >
          {copy.browseTitle}
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder={copy.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="brutal-input flex-1"
          />
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="brutal-select"
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
            className="brutal-select"
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
          <div className="text-center py-20">
            <p
              className="font-display text-2xl"
              style={{ color: "var(--cardinal)" }}
            >
              {error}
            </p>
            <button
              onClick={fetchProfiles}
              className="brutal-btn brutal-btn-gold mt-6"
            >
              {copy.retry}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 relative">
            <div className="ghost-text left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px]">
              EMPTY
            </div>
            <h3
              className="font-display text-3xl mb-3 relative"
              style={{ color: "var(--black)" }}
            >
              {profiles.length === 0 ? copy.noProfiles : copy.noMatches}
            </h3>
            <p
              className="text-sm mb-6 relative"
              style={{ color: "var(--mid)" }}
            >
              {profiles.length === 0
                ? copy.beFirst
                : copy.adjustFilters}
            </p>
            {profiles.length === 0 && (
              <Link
                href="/submit"
                className="brutal-btn brutal-btn-primary inline-block relative"
              >
                {copy.dropProfile}
              </Link>
            )}
          </div>
        ) : (
          <>
            <p
              className="text-xs mb-4"
              style={{ color: "var(--mid)", fontFamily: "var(--font-body)" }}
            >
              {copy.profilesFound(filtered.length)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
        bg="var(--gold)"
        text="var(--cardinal)"
        items={copy.marqueeItems}
      />

      {/* Social Links */}
      <section
        className="border-t-[3px] border-[var(--black)] py-8 px-6"
        style={{ background: "var(--cream)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="https://www.instagram.com/bia_usc/"
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-btn brutal-btn-ghost text-sm flex items-center gap-2"
          >
            <span>INSTAGRAM</span>
            <span style={{ color: "var(--cardinal)" }}>@BIA_USC</span>
            <span style={{ color: "var(--mid)", fontSize: "10px" }}>→</span>
          </a>
          <a
            href="https://xhslink.com/m/2t4EzpZAKAc"
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-btn brutal-btn-ghost text-sm flex items-center gap-2"
          >
            <span style={{ color: "var(--cardinal)" }}>小红书</span>
            <span
              className="new-drop-badge"
              style={{ fontSize: "9px", padding: "1px 6px" }}
            >
              4138 LIKES
            </span>
            <span style={{ color: "var(--mid)", fontSize: "10px" }}>→</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 text-center border-t-[3px] border-[var(--black)]">
        <p
          className="font-display text-xs tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          {copy.footer}
        </p>
      </footer>

      {/* Detail Modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          language={language}
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
