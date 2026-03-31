"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { SubletListing, ROOM_TYPE_OPTIONS, SCHOOL_OPTIONS } from "@/lib/types";
import SubletCard from "@/components/SubletCard";
import SubletModal from "@/components/SubletModal";
import SkeletonCard from "@/components/SkeletonCard";
import Toast from "@/components/Toast";
import NavTabs from "@/components/NavTabs";

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

function SubletContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<SubletListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SubletListing | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest",
  );

  useEffect(() => {
    if (searchParams.get("submitted") === "true") {
      setShowToast(true);
      router.replace("/sublet", { scroll: false });
    }
  }, [searchParams, router]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("sublet_listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) {
      setError("LOAD FAILED — RETRY");
      setLoading(false);
      return;
    }
    setListings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  let filtered = listings.filter((l) => {
    if (schoolFilter && l.school !== schoolFilter) return false;
    if (roomTypeFilter && l.room_type !== roomTypeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchApt = l.apartment_name.toLowerCase().includes(q);
      const matchAddr = l.address.toLowerCase().includes(q);
      const matchDesc = l.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchApt && !matchAddr && !matchDesc) return false;
    }
    return true;
  });

  if (sortBy === "price_asc") {
    filtered = [...filtered].sort((a, b) => a.rent - b.rent);
  } else if (sortBy === "price_desc") {
    filtered = [...filtered].sort((a, b) => b.rent - a.rent);
  }

  const schoolVars: React.CSSProperties = {};
  if (schoolFilter === "UC Berkeley") {
    Object.assign(schoolVars, {
      "--cardinal": "#014B83",
      "--gold": "#FEDD76",
    } as Record<string, string>);
  } else if (schoolFilter === "Stanford") {
    Object.assign(schoolVars, {
      "--cardinal": "#8C1515",
      "--gold": "#EAAB00",
    } as Record<string, string>);
  }

  return (
    <main className="min-h-screen" style={schoolVars}>
      {showToast && (
        <Toast
          message="LISTING POSTED SUCCESSFULLY"
          onClose={() => setShowToast(false)}
        />
      )}

      <NavTabs />

      <Marquee
        bg="var(--cardinal)"
        text="var(--gold)"
        items={[
          "BIA 公寓转租",
          "FIND YOUR SUBLET",
          "APARTMENTS",
          "USC ✕ BERKELEY ✕ STANFORD",
          "SUBLET MATCH",
        ]}
      />

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b-[3px] border-[var(--black)]"
        style={{ background: "var(--cream)" }}
      >
        <div className="ghost-text -left-4 top-1/2 -translate-y-1/2">
          SUBLET
        </div>
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 relative">
          <div className="flex items-center gap-6 mb-8">
            <Image
              src="/logo.jpg"
              alt="BIA"
              width={100}
              height={100}
              className="border-[3px] border-[var(--black)]"
              style={{ boxShadow: "6px 6px 0 var(--cardinal)" }}
            />
            <div>
              <div className="new-drop-badge mb-2">SUBLET</div>
              <p
                className="font-display text-sm"
                style={{ color: "var(--mid)" }}
              >
                BIA APARTMENT SUBLET
              </p>
            </div>
          </div>

          <h1
            className="font-display text-[60px] sm:text-[96px] leading-[0.85] mb-6"
            style={{ color: "var(--black)" }}
          >
            BIA
            <br />
            <span className="glitch-text" style={{ color: "var(--cardinal)" }}>
              公寓转租
            </span>
          </h1>

          <p
            className="text-sm sm:text-base max-w-md mb-10"
            style={{ color: "var(--mid)" }}
          >
            发布你的转租信息，找到合适的租客。
            <br />
            Post your sublet. Find your tenant.
          </p>

          <Link
            href="/sublet-submit"
            className="brutal-btn brutal-btn-primary inline-block"
          >
            POST MY SUBLET →
          </Link>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-6 py-8 relative">
        <span className="section-number">01</span>
        <h2
          className="font-display text-[40px] sm:text-[60px] mb-6"
          style={{ color: "var(--black)" }}
        >
          BROWSE
        </h2>

        {/* Campus Tabs */}
        <div className="flex gap-0 mb-6 flex-wrap">
          {["", "USC", "UC Berkeley", "Stanford"].map((s) => {
            const active = schoolFilter === s;
            const label = s || "ALL";
            let bg = "var(--cream)";
            let fg = "var(--mid)";
            if (active) {
              if (s === "UC Berkeley") {
                bg = "var(--berkeley-blue)";
                fg = "white";
              } else if (s === "Stanford") {
                bg = "var(--stanford-cardinal)";
                fg = "white";
              } else if (s === "USC") {
                bg = "var(--cardinal)";
                fg = "white";
              } else {
                bg = "var(--black)";
                fg = "white";
              }
            }
            return (
              <button
                key={label}
                onClick={() => setSchoolFilter(s)}
                className="font-display text-sm sm:text-base tracking-[0.1em] px-5 sm:px-8 py-3 border-[3px] border-[var(--black)] -mr-[3px] first:mr-0 transition-colors"
                style={{ background: bg, color: fg }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="SEARCH APARTMENT / ADDRESS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="brutal-input flex-1"
          />
          <select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="brutal-select"
          >
            <option value="">ALL TYPES</option>
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
            className="brutal-select"
          >
            <option value="newest">最新发布</option>
            <option value="price_asc">价格低→高</option>
            <option value="price_desc">价格高→低</option>
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
              onClick={fetchListings}
              className="brutal-btn brutal-btn-gold mt-6"
            >
              RETRY
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
              {listings.length === 0 ? "NO LISTINGS YET" : "NO MATCHES"}
            </h3>
            <p
              className="text-sm mb-6 relative"
              style={{ color: "var(--mid)" }}
            >
              {listings.length === 0
                ? "Be the first to post a sublet."
                : "Try adjusting your filters."}
            </p>
            {listings.length === 0 && (
              <Link
                href="/sublet-submit"
                className="brutal-btn brutal-btn-primary inline-block relative"
              >
                POST SUBLET
              </Link>
            )}
          </div>
        ) : (
          <>
            <p
              className="text-xs mb-4"
              style={{ color: "var(--mid)", fontFamily: "var(--font-body)" }}
            >
              {filtered.length} LISTINGS FOUND
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          </>
        )}
      </section>

      <Marquee
        bg="var(--gold)"
        text="var(--cardinal)"
        items={[
          "SUBLET",
          "FIND YOUR PLACE",
          "BIA",
          "APARTMENTS",
          "POST YOUR LISTING",
        ]}
      />

      <footer className="py-6 px-6 text-center border-t-[3px] border-[var(--black)]">
        <p
          className="font-display text-xs tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          BIA 公寓转租 — FIND YOUR NEXT HOME
        </p>
      </footer>

      {selectedListing && (
        <SubletModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </main>
  );
}

export default function SubletPage() {
  return (
    <Suspense>
      <SubletContent />
    </Suspense>
  );
}
