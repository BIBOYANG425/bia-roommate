"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
// Use the lazy Proxy export so module evaluation never touches env vars.
// The previous `const supabase = createBrowserSupabaseClient()` at the top
// level crashed Next.js prerender for /account (env vars aren't bound in the
// Vercel build environment), failing the preview deployment despite the page
// being "use client".
import { supabase } from "@/lib/supabase/client";
import {
  RoommateProfile,
  SubletListing,
  type Parcel,
  type PackRequestWithParcels,
} from "@/lib/types";
import type { SavedSchedule } from "./SavedSchedulesList";
import type { Comment } from "./CommentsList";
import type { LikedYouProfile } from "./LikedYou";

export function useAccountData() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<RoommateProfile | null>(null);
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [likedProfiles, setLikedProfiles] = useState<RoommateProfile[]>([]);
  const [likedYou, setLikedYou] = useState<LikedYouProfile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sublets, setSublets] = useState<SubletListing[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [packRequests, setPackRequests] = useState<PackRequestWithParcels[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/roommates");
      return;
    }

    async function fetchAll() {
      setLoading(true);
      try {
        const [
          profileRes,
          schedulesRes,
          likesRes,
          commentsRes,
          subletsRes,
          parcelsRes,
          packRequestsRes,
        ] = await Promise.all([
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
              .from("sublets")
              .select("id, title, apartment_name, rent, created_at")
              .eq("user_id", user!.id)
              .order("created_at", { ascending: false }),
            // Shipping endpoints handle auth + RLS + signed URLs — simpler
            // than re-implementing here.
            fetch("/api/shipping/parcels", { cache: "no-store" }),
            fetch("/api/shipping/pack-requests", { cache: "no-store" }),
          ]);

        setProfile((profileRes.data as RoommateProfile | null) || null);
        setSchedules((schedulesRes.data as SavedSchedule[]) || []);
        setSublets((subletsRes.data as SubletListing[]) || []);

        if (parcelsRes.ok) {
          setParcels((await parcelsRes.json()) as Parcel[]);
        }
        if (packRequestsRes.ok) {
          setPackRequests(
            (await packRequestsRes.json()) as PackRequestWithParcels[],
          );
        }

        // Fetch liked profiles and comment profile names in parallel
        const likeIds = likesRes.data?.map(
          (l: { profile_id: string }) => l.profile_id,
        );
        const commentProfileIds = commentsRes.data?.length
          ? [
              ...new Set(
                commentsRes.data.map(
                  (c: { profile_id: string }) => c.profile_id,
                ),
              ),
            ]
          : [];

        const myProfileId =
          (profileRes.data as RoommateProfile | null)?.id ?? null;

        const [likedRes, commentProfilesRes, whoLikedMeRes] = await Promise.all([
          likeIds?.length
            ? supabase
                .from("roommate_profiles")
                .select("id, name, school, major, year, avatar_url, created_at")
                .in("id", likeIds)
            : Promise.resolve({ data: null }),
          commentProfileIds.length
            ? supabase
                .from("roommate_profiles")
                .select("id, name, school")
                .in("id", commentProfileIds)
            : Promise.resolve({ data: null }),
          myProfileId
            ? supabase
                .from("profile_likes")
                .select("user_id, created_at")
                .eq("profile_id", myProfileId)
            : Promise.resolve({ data: null }),
        ]);

        setLikedProfiles((likedRes.data as RoommateProfile[]) || []);

        // "Who liked me" → mutual when their profile is one I also liked.
        // All client-side: likes are world-readable; profiles readable when visible.
        const likerRows =
          (whoLikedMeRes.data as
            | { user_id: string; created_at: string }[]
            | null) ?? [];
        const likerUserIds = [...new Set(likerRows.map((r) => r.user_id))];
        if (likerUserIds.length > 0) {
          const myLikedIds = new Set(
            (likesRes.data ?? []).map(
              (l: { profile_id: string }) => l.profile_id,
            ),
          );
          const { data: likerProfiles } = await supabase
            .from("roommate_profiles")
            .select("*")
            .in("user_id", likerUserIds)
            .eq("visible", true);
          const likedAtByUser = new Map(
            likerRows.map((r) => [r.user_id, r.created_at]),
          );
          setLikedYou(
            (
              (likerProfiles as
                | (RoommateProfile & { user_id: string | null })[]
                | null) ?? []
            )
              .filter((p) => p.user_id !== user!.id)
              .map((p) => ({
                ...p,
                liked_at:
                  (p.user_id && likedAtByUser.get(p.user_id)) || p.created_at,
                is_mutual: myLikedIds.has(p.id),
              }))
              .sort(
                (a, b) =>
                  Number(b.is_mutual) - Number(a.is_mutual) ||
                  (a.liked_at < b.liked_at ? 1 : -1),
              ),
          );
        } else {
          setLikedYou([]);
        }

        if (commentsRes.data?.length) {
          const profileMap = new Map(
            (commentProfilesRes.data || []).map(
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
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [user, authLoading, router]);

  async function handleDeleteComment(id: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    const { error } = await supabase
      .from("profile_comments")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);
    if (error) setComments(prev);
  }

  async function handleLikeBack(profileId: string) {
    // Optimistically flip to mutual (reveals contact); revert on failure.
    setLikedYou((list) =>
      list.map((p) => (p.id === profileId ? { ...p, is_mutual: true } : p)),
    );
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId }),
      });
      const data = res.ok ? await res.json() : null;
      // POST toggles; a pending liker is one we haven't liked, so it should
      // return liked:true. If it somehow toggled off, revert.
      if (!data?.liked) {
        setLikedYou((list) =>
          list.map((p) =>
            p.id === profileId ? { ...p, is_mutual: false } : p,
          ),
        );
      }
    } catch {
      setLikedYou((list) =>
        list.map((p) => (p.id === profileId ? { ...p, is_mutual: false } : p)),
      );
    }
  }

  async function handleUnlike(profileId: string) {
    const prev = likedProfiles;
    setLikedProfiles((p) => p.filter((x) => x.id !== profileId));
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
    const { error } = await supabase
      .from("sublets")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);
    if (error) setSublets(prev);
  }

  async function handleDeleteSchedule(id: string) {
    const prev = schedules;
    setSchedules((s) => s.filter((x) => x.id !== id));
    const { error } = await supabase
      .from("saved_schedules")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);
    if (error) setSchedules(prev);
  }

  return {
    user,
    authLoading,
    router,
    profile,
    schedules,
    likedProfiles,
    likedYou,
    comments,
    sublets,
    parcels,
    packRequests,
    loading,
    loadError,
    handleDeleteComment,
    handleUnlike,
    handleLikeBack,
    handleDeleteSublet,
    handleDeleteSchedule,
  };
}
