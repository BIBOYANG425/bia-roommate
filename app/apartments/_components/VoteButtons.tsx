"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProductLanguage } from "@/components/ProductShell";
import { useVoteTallies, getOrCreateVoterFingerprint } from "./VoteTalliesProvider";

// ─── Vote Buttons ─────────────────────────────────────────────────────────────

export default function VoteButtons({
  aptId,
  language,
}: {
  aptId: string;
  language: ProductLanguage;
}) {
  const { tallies, applyDelta, refresh } = useVoteTallies();
  // VoteButtons is keyed by aptId (it remounts per apartment), so a lazy
  // initializer reads the stored vote without a setState-in-effect.
  const [myVote, setMyVote] = useState<"up" | "down" | null>(
    () => localStorage.getItem(`bia_vote_${aptId}`) as "up" | "down" | null,
  );
  const [voting, setVoting] = useState(false);

  const counts = tallies[aptId] ?? { up: 0, down: 0 };

  async function handleVote(vote: "up" | "down") {
    if (voting) return;
    setVoting(true);
    const fp = getOrCreateVoterFingerprint();
    if (myVote === vote) {
      // Toggle the vote off — definer fn only deletes the row for this fingerprint.
      await supabase.rpc("clear_apartment_vote", {
        p_apartment_id: aptId,
        p_fingerprint: fp,
      });
      localStorage.removeItem(`bia_vote_${aptId}`);
      setMyVote(null);
      applyDelta(aptId, vote === "up" ? -1 : 0, vote === "down" ? -1 : 0);
    } else {
      await supabase.rpc("set_apartment_vote", {
        p_apartment_id: aptId,
        p_vote: vote,
        p_fingerprint: fp,
      });
      localStorage.setItem(`bia_vote_${aptId}`, vote);
      // Remove the previous vote's contribution, add the new one.
      applyDelta(
        aptId,
        (vote === "up" ? 1 : 0) - (myVote === "up" ? 1 : 0),
        (vote === "down" ? 1 : 0) - (myVote === "down" ? 1 : 0),
      );
      setMyVote(vote);
    }
    await refresh(); // reconcile with the server so the leaderboard goes live
    setVoting(false);
  }

  const btn = (vote: "up" | "down", emoji: string) => (
    <button
      type="button"
      onClick={() => handleVote(vote)}
      disabled={voting}
      className="flex items-center gap-1.5 border-[2px] px-3 py-1.5 font-display text-xs tracking-wider transition-colors disabled:opacity-50"
      style={{
        borderColor: myVote === vote ? (vote === "up" ? "#2a8a2a" : "#cc4400") : "var(--black)",
        background: myVote === vote ? (vote === "up" ? "#2a8a2a" : "#cc4400") : "transparent",
        color: myVote === vote ? "white" : "var(--black)",
      }}
    >
      {emoji} {counts[vote]}
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      {btn("up", "👍")}
      {btn("down", "👎")}
      <span className="text-[10px]" style={{ color: "var(--mid)" }}>
        {language === "zh" ? "社区评分" : "COMMUNITY"}
      </span>
    </div>
  );
}
