"use client";

import { useState } from "react";
import ProfileCard from "@/components/account/ProfileCard";
import StatsRow from "@/components/account/StatsRow";
import CollapsibleSection from "@/components/account/CollapsibleSection";
import SubletsList from "@/components/account/SubletsList";
import SavedSchedulesList from "@/components/account/SavedSchedulesList";
import LikedProfiles from "@/components/account/LikedProfiles";
import CommentsList from "@/components/account/CommentsList";
import ShippingSummary from "@/components/account/ShippingSummary";
import { useAccountData } from "@/components/account/useAccountData";

export default function AccountPage() {
  const {
    user,
    authLoading,
    router,
    profile,
    schedules,
    likedProfiles,
    comments,
    sublets,
    parcels,
    packRequests,
    loading,
    loadError,
    handleDeleteComment,
    handleUnlike,
    handleDeleteSublet,
    handleDeleteSchedule,
  } = useAccountData();

  const [sections, setSections] = useState<Record<string, boolean>>({
    shipping: true,
    sublets: true,
    saved: true,
    liked: true,
    comments: true,
  });

  function toggleSection(key: string) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <button
        onClick={() => router.push("/roommates")}
        className="font-display text-xs tracking-wider mb-2 hover:opacity-60 transition-opacity"
        style={{ color: "var(--mid)" }}
      >
        &larr; BACK TO HOME
      </button>

      {loadError && (
        <div
          className="p-4 border-[3px] border-[var(--cardinal)] text-sm"
          style={{
            background: "color-mix(in srgb, var(--cardinal) 5%, white)",
            color: "var(--cardinal)",
          }}
        >
          Failed to load data. Please refresh the page.
        </div>
      )}

      <ProfileCard profile={profile} loading={loading} />

      {!loading && (
        <StatsRow
          sublets={sublets.length}
          saved={schedules.length}
          liked={likedProfiles.length}
          comments={comments.length}
        />
      )}

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
          <CollapsibleSection
            title="YOUR SHIPPING"
            count={parcels.length}
            open={!!sections.shipping}
            onToggle={() => toggleSection("shipping")}
          >
            <ShippingSummary
              parcels={parcels}
              packRequests={packRequests}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="YOUR SUBLETS"
            count={sublets.length}
            open={!!sections.sublets}
            onToggle={() => toggleSection("sublets")}
          >
            <SubletsList sublets={sublets} onDelete={handleDeleteSublet} />
          </CollapsibleSection>

          <CollapsibleSection
            title="YOUR SAVED"
            count={schedules.length}
            open={!!sections.saved}
            onToggle={() => toggleSection("saved")}
          >
            <SavedSchedulesList
              schedules={schedules}
              onDelete={handleDeleteSchedule}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="YOUR LIKED"
            count={likedProfiles.length}
            open={!!sections.liked}
            onToggle={() => toggleSection("liked")}
          >
            <LikedProfiles
              profiles={likedProfiles}
              onUnlike={handleUnlike}
              onProfileClick={(id) => router.push(`/?profile=${id}`)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="YOUR COMMENTS"
            count={comments.length}
            open={!!sections.comments}
            onToggle={() => toggleSection("comments")}
          >
            <CommentsList comments={comments} onDelete={handleDeleteComment} />
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
