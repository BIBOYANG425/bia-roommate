"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SubletListing, ROOM_TYPE_OPTIONS } from "@/lib/types";
import {
  type ProductSchool,
  normalizeProductSchool,
} from "@/lib/product-school";
import SubletCard from "@/components/SubletCard";
import SubletModal from "@/components/SubletModal";
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

const SUBLET_COPY: Record<
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
    allTypes: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    retry: string;
    noListings: string;
    noMatches: string;
    beFirst: string;
    adjustFilters: string;
    postSublet: string;
    listingsFound: (count: number) => string;
    loadingMore: string;
    loadMore: string;
    marqueeItems: string[];
    footer: string;
  }
> = {
  zh: {
    toast: "房源发布成功",
    loadError: "加载失败，请重试",
    headerEyebrow: "住房 / 转租",
    headerTitle: "找转租",
    headerDescription:
      "优先浏览你学校附近的转租，再按租金、房型和入住时间筛选。",
    primaryAction: "浏览房源",
    secondaryAction: "发布转租",
    trustItems: ["社区房源", "搜索排序", "可反馈问题"],
    browseTitle: "浏览",
    searchPlaceholder: "搜索公寓 / 地址...",
    allTypes: "全部房型",
    sortNewest: "最新发布",
    sortPriceAsc: "价格低到高",
    sortPriceDesc: "价格高到低",
    retry: "重试",
    noListings: "暂无房源",
    noMatches: "没有匹配",
    beFirst: "成为第一个发布转租的人。",
    adjustFilters: "试试调整筛选条件。",
    postSublet: "发布转租",
    listingsFound: (count) => `${count} 个房源`,
    loadingMore: "加载中...",
    loadMore: "加载更多",
    marqueeItems: ["转租", "找到下一站住处", "BIA", "公寓", "发布房源"],
    footer: "BIA 公寓转租 — 找到下一站住处",
  },
  en: {
    toast: "LISTING POSTED SUCCESSFULLY",
    loadError: "LOAD FAILED - RETRY",
    headerEyebrow: "Housing / Sublets",
    headerTitle: "Sublets",
    headerDescription:
      "Browse sublets near your school first, then search by rent, room type, and move-in timing.",
    primaryAction: "Browse listings",
    secondaryAction: "Post sublet",
    trustItems: ["Community listings", "Search and sort", "Report issues"],
    browseTitle: "BROWSE",
    searchPlaceholder: "SEARCH APARTMENT / ADDRESS...",
    allTypes: "ALL TYPES",
    sortNewest: "Newest",
    sortPriceAsc: "Price low to high",
    sortPriceDesc: "Price high to low",
    retry: "RETRY",
    noListings: "NO LISTINGS YET",
    noMatches: "NO MATCHES",
    beFirst: "Be the first to post a sublet.",
    adjustFilters: "Try adjusting your filters.",
    postSublet: "POST SUBLET",
    listingsFound: (count) => `${count} LISTINGS FOUND`,
    loadingMore: "LOADING...",
    loadMore: "LOAD MORE",
    marqueeItems: [
      "SUBLET",
      "FIND YOUR PLACE",
      "BIA",
      "APARTMENTS",
      "POST YOUR LISTING",
    ],
    footer: "BIA SUBLETS — FIND YOUR NEXT HOME",
  },
};

type SubletContentProps = {
  initialSchool: ProductSchool;
  language: ProductLanguage;
};

function SubletContent({ initialSchool, language }: SubletContentProps) {
  const copy = SUBLET_COPY[language];
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<SubletListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SubletListing | null>(
    null,
  );

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [schoolFilter, setSchoolFilter] = useState<ProductSchool>(
    normalizeProductSchool(searchParams.get("school")) ?? initialSchool,
  );
  const [roomTypeFilter, setRoomTypeFilter] = useState(
    searchParams.get("type") ?? "",
  );
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    (searchParams.get("sort") as "newest" | "price_asc" | "price_desc") ||
      "newest",
  );

  useEffect(() => {
    setSchoolFilter(initialSchool);
  }, [initialSchool]);

  useEffect(() => {
    if (
      searchParams.get("submitted") === "true" ||
      searchParams.get("updated") === "true"
    ) {
      setShowToast(true);
      router.replace("/sublet", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (schoolFilter) params.set("school", schoolFilter);
    if (roomTypeFilter) params.set("type", roomTypeFilter);
    if (sortBy !== "newest") params.set("sort", sortBy);
    const qs = params.toString();
    router.replace(`/sublet${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [search, schoolFilter, roomTypeFilter, sortBy, router]);

  const PAGE_SIZE = 20;
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchListings = useCallback(
    async (append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const from = append ? listings.length : 0;
      const to = from + PAGE_SIZE - 1;

      const { data, error: err } = await supabase
        .from("sublets")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err) {
        setError(copy.loadError);
      } else {
        const newData = data || [];
        if (append) {
          setListings((prev) => [...prev, ...newData]);
        } else {
          setListings(newData);
        }
        setHasMore(newData.length === PAGE_SIZE);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [copy.loadError, listings.length],
  );

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let result = listings.filter((l) => {
      if (schoolFilter && l.school !== schoolFilter) return false;
      if (roomTypeFilter && l.room_type !== roomTypeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.title.toLowerCase().includes(q) &&
          !l.apartment_name.toLowerCase().includes(q) &&
          !l.address.toLowerCase().includes(q) &&
          !l.description?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    if (sortBy === "price_asc") {
      result = [...result].sort((a, b) => a.rent - b.rent);
    } else if (sortBy === "price_desc") {
      result = [...result].sort((a, b) => b.rent - a.rent);
    }
    return result;
  }, [listings, schoolFilter, roomTypeFilter, search, sortBy]);

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
        secondaryAction={{ label: copy.secondaryAction, href: "/sublet-submit" }}
        trustItems={copy.trustItems}
        previewImage="/previews/sublet.png"
        previewAlt="BIA sublet product preview"
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
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="min-h-12 rounded-2xl border border-black/10 bg-[#F9FAF7] px-4 text-sm font-medium text-[#171717] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(160,215,209,0.35)]"
          >
            <option value="">{copy.allTypes}</option>
            {ROOM_TYPE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "newest" | "price_asc" | "price_desc")
            }
            className="min-h-12 rounded-2xl border border-black/10 bg-[#F9FAF7] px-4 text-sm font-medium text-[#171717] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(160,215,209,0.35)]"
          >
            <option value="newest">{copy.sortNewest}</option>
            <option value="price_asc">{copy.sortPriceAsc}</option>
            <option value="price_desc">{copy.sortPriceDesc}</option>
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
              onClick={() => fetchListings()}
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
              {listings.length === 0 ? copy.noListings : copy.noMatches}
            </h3>
            <p
              className="relative mb-6 text-sm text-[#646464]"
            >
              {listings.length === 0
                ? copy.beFirst
                : copy.adjustFilters}
            </p>
            {listings.length === 0 && (
              <Link
                href="/sublet-submit"
                className="relative inline-flex min-h-12 items-center rounded-xl bg-[#171717] px-6 text-sm font-bold uppercase tracking-wide text-white"
              >
                {copy.postSublet}
              </Link>
            )}
          </div>
        ) : (
          <>
            <p
              className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#999]"
            >
              {copy.listingsFound(filtered.length)}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((listing, i) => (
                <div
                  key={listing.id}
                  className="reveal"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <SubletCard
                    listing={listing}
                    onClick={() => setSelectedListing(listing)}
                  />
                </div>
              ))}
            </div>
            {hasMore && !search && !roomTypeFilter && (
              <div className="text-center mt-8">
                <button
                  onClick={() => fetchListings(true)}
                  disabled={loadingMore}
                  className="rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
                >
                  {loadingMore ? copy.loadingMore : copy.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <Marquee
        bg="#1F1F29"
        text="#A0D7D1"
        items={copy.marqueeItems}
      />

      <footer className="border-t border-black/5 px-6 py-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#999]">
          {copy.footer}
        </p>
      </footer>

      {selectedListing && (
        <SubletModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </>
  );
}

export default function SubletPage() {
  return (
    <Suspense>
      <ProductShell group="housing" page="sublet">
        {({ school, language }) => (
          <SubletContent initialSchool={school} language={language} />
        )}
      </ProductShell>
    </Suspense>
  );
}
