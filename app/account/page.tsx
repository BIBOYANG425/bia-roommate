"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { RoommateProfile, SubletListing } from "@/lib/types";
import {
  relativeTime,
  schoolAccent,
  schoolTagClass,
  getLastChar,
} from "@/lib/utils";
import Image from "next/image";

const SCHOOL_LOGOS: Record<string, string> = {
  USC: "/schools/usc.svg",
  "UC Berkeley": "/schools/ucberkeley.svg",
  Stanford: "/schools/stanford.svg",
};

interface SavedSchedule {
  id: string;
  name: string;
  semester: string;
  courses: { code: string; title: string }[];
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profile: { id: string; name: string; school: string | null } | null;
}

/* ── Collapsible Section ── */
function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-[3px] border-[var(--black)]"
      style={{ background: "var(--cream)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 font-display text-sm tracking-wider"
        style={{ color: "var(--black)" }}
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span
              className="px-2 py-0.5 text-[10px] border-[2px] border-[var(--black)]"
              style={{ background: "var(--gold)" }}
            >
              {count}
            </span>
          )}
          <span
            className="text-xs"
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
              display: "inline-block",
            }}
          >
            &#9660;
          </span>
        </div>
      </button>
      {open && (
        <div className="p-4 pt-0 border-t-[2px] border-[var(--black)]">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Stat Box ── */
function StatBox({ label, count }: { label: string; count: number }) {
  return (
    <div
      className="flex-1 border-[3px] border-[var(--black)] p-3 text-center"
      style={{ background: "var(--cream)" }}
    >
      <div
        className="font-display text-2xl tracking-wider"
        style={{ color: "var(--black)" }}
      >
        {count}
      </div>
      <div
        className="text-[10px] tracking-wider mt-1"
        style={{ color: "var(--mid)" }}
      >
        {label}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<RoommateProfile | null>(null);
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [likedProfiles, setLikedProfiles] = useState<RoommateProfile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sublets, setSublets] = useState<SubletListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Record<string, boolean>>({
    sublets: true,
    saved: true,
    liked: true,
    comments: true,
  });

  function toggleSection(key: string) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/roommates");
      return;
    }

    const supabase = createBrowserSupabaseClient();

    async function fetchAll() {
      setLoading(true);
      try {
        const [profileRes, schedulesRes, likesRes, commentsRes, subletsRes] =
          await Promise.all([
            supabase
              .from("roommate_profiles")
              .select("*")
              .eq("user_id", user!.id)
              .maybeSingle(),
            supabase
              .from("saved_schedules")
              .select("id, name, semester, courses, created_at")
              .eq("user_id", user!.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("profile_likes")
              .select("profile_id, created_at")
              .eq("user_id", user!.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("profile_comments")
              .select("id, content, created_at, profile_id")
              .eq("user_id", user!.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("sublet_listings")
              .select("id, title, apartment_name, rent, created_at")
              .eq("user_id", user!.id)
              .order("created_at", { ascending: false }),
          ]);

        setProfile((profileRes.data as RoommateProfile | null) || null);
        setSchedules((schedulesRes.data as SavedSchedule[]) || []);
        setSublets((subletsRes.data as SubletListing[]) || []);

        // Fetch liked profiles
        if (likesRes.data && likesRes.data.length > 0) {
          const profileIds = likesRes.data.map(
            (l: { profile_id: string }) => l.profile_id,
          );
          const { data: likedData } = await supabase
            .from("roommate_profiles")
            .select("*")
            .in("id", profileIds);
          setLikedProfiles((likedData as RoommateProfile[]) || []);
        } else {
          setLikedProfiles([]);
        }

        // Fetch comment profile names
        if (commentsRes.data && commentsRes.data.length > 0) {
          const profileIds = [
            ...new Set(
              commentsRes.data.map((c: { profile_id: string }) => c.profile_id),
            ),
          ];
          const { data: profileNames } = await supabase
            .from("roommate_profiles")
            .select("id, name, school")
            .in("id", profileIds);

          const profileMap = new Map(
            (profileNames || []).map(
              (p: { id: string; name: string; school: string | null }) => [
                p.id,
                p,
              ],
            ),
          );

          setComments(
            commentsRes.data.map(
              (c: {
                id: string;
                content: string;
                created_at: string;
                profile_id: string;
              }) => ({
                id: c.id,
                content: c.content,
                created_at: c.created_at,
                profile: profileMap.get(c.profile_id) || null,
              }),
            ),
          );
        } else {
          setComments([]);
        }
      } catch {
        // Silently handle — empty state shown
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [user, authLoading, router]);

  async function handleDeleteComment(id: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("profile_comments")
      .delete()
      .eq("id", id);
    if (error) setComments(prev);
  }

  async function handleUnlike(profileId: string) {
    const prev = likedProfiles;
    setLikedProfiles((p) => p.filter((x) => x.id !== profileId));
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("profile_likes")
      .delete()
      .eq("user_id", user!.id)
      .eq("profile_id", profileId);
    if (error) setLikedProfiles(prev);
  }

  async function handleDeleteSublet(id: string) {
    const prev = sublets;
    setSublets((s) => s.filter((x) => x.id !== id));
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("sublet_listings")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);
    if (error) setSublets(prev);
  }

  async function handleDeleteSchedule(id: string) {
    const prev = schedules;
    setSchedules((s) => s.filter((x) => x.id !== id));
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("saved_schedules")
      .delete()
      .eq("id", id);
    if (error) setSchedules(prev);
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="font-display text-xl tracking-wider"
          style={{ color: "var(--mid)" }}
        >
          LOADING...
        </div>
      </div>
    );
  }

  const accent = profile ? schoolAccent(profile.school) : "var(--cardinal)";
  const lastChar = profile ? getLastChar(profile.name) : "?";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.push("/roommates")}
        className="font-display text-xs tracking-wider mb-2 hover:opacity-60 transition-opacity"
        style={{ color: "var(--mid)" }}
      >
        &larr; BACK TO HOME
      </button>

      {/* ── Profile Card ── */}
      {loading ? (
        <div
          className="border-[3px] border-[var(--black)] p-6 animate-pulse"
          style={{ background: "var(--cream)", height: 180 }}
        />
      ) : profile ? (
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
              <img
                src={profile.avatar_url}
                alt={profile.name}
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
      ) : (
        /* No profile CTA */
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
      )}

      {/* ── Stats Row ── */}
      {!loading && (
        <div className="flex gap-3">
          <StatBox label="SUBLETS" count={sublets.length} />
          <StatBox label="SAVED" count={schedules.length} />
          <StatBox label="LIKED" count={likedProfiles.length} />
          <StatBox label="COMMENTS" count={comments.length} />
        </div>
      )}

      {/* ── Collapsible Sections ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-[3px] border-[var(--black)] p-5 animate-pulse"
              style={{ background: "var(--cream)", height: 60 }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* YOUR SUBLETS */}
          <CollapsibleSection
            title="YOUR SUBLETS"
            count={sublets.length}
            open={!!sections.sublets}
            onToggle={() => toggleSection("sublets")}
          >
            {sublets.length === 0 ? (
              <EmptyState message="NO SUBLET LISTINGS YET" />
            ) : (
              <div className="grid grid-cols-1 gap-3 mt-3">
                {sublets.map((s) => (
                  <div
                    key={s.id}
                    className="border-[3px] border-[var(--black)] p-4 flex items-center justify-between"
                    style={{ background: "white" }}
                  >
                    <div>
                      <h3
                        className="font-display text-lg tracking-wider"
                        style={{ color: "var(--black)" }}
                      >
                        {s.title}
                      </h3>
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: "var(--mid)" }}
                      >
                        {s.apartment_name} &mdash; ${s.rent}/mo
                      </p>
                      <p
                        className="text-[10px] mt-1"
                        style={{ color: "var(--mid)" }}
                      >
                        {relativeTime(s.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <a
                        href="/sublet"
                        className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--gold)] transition-colors"
                      >
                        VIEW
                      </a>
                      <a
                        href={`/sublet-submit?edit=${s.id}`}
                        className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--gold)] transition-colors"
                      >
                        EDIT
                      </a>
                      <button
                        onClick={() => handleDeleteSublet(s.id)}
                        className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white transition-colors"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* YOUR SAVED */}
          <CollapsibleSection
            title="YOUR SAVED"
            count={schedules.length}
            open={!!sections.saved}
            onToggle={() => toggleSection("saved")}
          >
            {schedules.length === 0 ? (
              <EmptyState message="NO SAVED SCHEDULES" />
            ) : (
              <div className="grid grid-cols-1 gap-3 mt-3">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className="border-[3px] border-[var(--black)] p-4 flex items-center justify-between"
                    style={{ background: "white" }}
                  >
                    <div>
                      <h3
                        className="font-display text-lg tracking-wider"
                        style={{ color: "var(--black)" }}
                      >
                        {s.name}
                      </h3>
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: "var(--mid)" }}
                      >
                        {s.semester} &mdash;{" "}
                        {Array.isArray(s.courses)
                          ? s.courses.map((c) => c.code || c).join(", ")
                          : ""}
                      </p>
                      <p
                        className="text-[10px] mt-1"
                        style={{ color: "var(--mid)" }}
                      >
                        {relativeTime(s.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <a
                        href={`/course-planner?schedule=${s.id}`}
                        className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--gold)] transition-colors"
                      >
                        VIEW
                      </a>
                      <button
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white transition-colors"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* YOUR LIKED */}
          <CollapsibleSection
            title="YOUR LIKED"
            count={likedProfiles.length}
            open={!!sections.liked}
            onToggle={() => toggleSection("liked")}
          >
            {likedProfiles.length === 0 ? (
              <EmptyState message="YOU HAVEN'T LIKED ANYONE YET" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {likedProfiles.map((p) => (
                  <div key={p.id} className="relative">
                    <MiniProfileCard
                      profile={p}
                      onClick={() => router.push(`/?profile=${p.id}`)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnlike(p.id);
                      }}
                      className="absolute top-3 right-3 font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)] bg-white hover:bg-[var(--cardinal)] hover:text-white transition-colors z-10"
                    >
                      UNLIKE
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* YOUR COMMENTS */}
          <CollapsibleSection
            title="YOUR COMMENTS"
            count={comments.length}
            open={!!sections.comments}
            onToggle={() => toggleSection("comments")}
          >
            {comments.length === 0 ? (
              <EmptyState message="NO COMMENTS YET" />
            ) : (
              <div className="grid grid-cols-1 gap-3 mt-3">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="border-[3px] border-[var(--black)] p-4"
                    style={{ background: "white" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {c.profile && (
                          <p
                            className="font-display text-xs tracking-wider mb-1"
                            style={{ color: "var(--mid)" }}
                          >
                            ON{" "}
                            <span
                              style={{ color: schoolAccent(c.profile.school) }}
                            >
                              {c.profile.name}
                            </span>
                            &apos;S PROFILE
                          </p>
                        )}
                        <p
                          className="text-sm"
                          style={{ color: "var(--black)" }}
                        >
                          &ldquo;{c.content}&rdquo;
                        </p>
                        <p
                          className="text-[10px] mt-1"
                          style={{ color: "var(--mid)" }}
                        >
                          {relativeTime(c.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white transition-colors shrink-0"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

/* ── Mini Profile Card ── */
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

/* ── Empty State ── */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-6 text-center">
      <p
        className="font-display text-sm tracking-wider"
        style={{ color: "var(--mid)" }}
      >
        {message}
      </p>
    </div>
  );
}
