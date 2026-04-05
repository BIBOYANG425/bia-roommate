"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { RoommateProfile, SubletListing } from "@/lib/types";
import type { SavedSchedule } from "./SavedSchedulesList";
import type { Comment } from "./CommentsList";

const supabase = createBrowserSupabaseClient();

export function useAccountData() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<RoommateProfile | null>(null);
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [likedProfiles, setLikedProfiles] = useState<RoommateProfile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sublets, setSublets] = useState<SubletListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }

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

        const [likedRes, commentProfilesRes] = await Promise.all([
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
        ]);

        setLikedProfiles((likedRes.data as RoommateProfile[]) || []);

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
      .from("sublet_listings")
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
    comments,
    sublets,
    loading,
    loadError,
    handleDeleteComment,
    handleUnlike,
    handleDeleteSublet,
    handleDeleteSchedule,
  };
}
