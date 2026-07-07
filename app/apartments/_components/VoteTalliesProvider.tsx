"use client";

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

// ─── Vote Tallies (shared) ────────────────────────────────────────────────────
// A single server-side aggregate (the get_apartment_vote_tallies() definer fn)
// feeds BOTH the per-card VoteButtons and the DynamicLeaderboard — instead of
// every card downloading the whole votes table and tallying in the browser.
// Writes go through set_/clear_apartment_vote() definer fns (the raw table is
// locked down). refresh() runs after each vote so the leaderboard updates live;
// applyDelta() gives the clicked card instant optimistic feedback first.

export type VoteTally = { up: number; down: number };

interface VoteTalliesValue {
  tallies: Record<string, VoteTally>;
  refresh: () => Promise<void>;
  applyDelta: (aptId: string, dUp: number, dDown: number) => void;
}

const VoteTalliesContext = createContext<VoteTalliesValue | null>(null);

export function useVoteTallies(): VoteTalliesValue {
  const ctx = useContext(VoteTalliesContext);
  if (!ctx)
    throw new Error("useVoteTallies must be used within a VoteTalliesProvider");
  return ctx;
}

// Fetch the aggregated tallies from the locked votes table (definer fn).
async function fetchVoteTallies(): Promise<Record<string, VoteTally>> {
  const { data } = await supabase.rpc("get_apartment_vote_tallies");
  const next: Record<string, VoteTally> = {};
  if (data) {
    for (const row of data as {
      apartment_id: string;
      up: number | null;
      down: number | null;
    }[]) {
      next[row.apartment_id] = {
        up: Number(row.up ?? 0),
        down: Number(row.down ?? 0),
      };
    }
  }
  return next;
}

export function VoteTalliesProvider({ children }: { children: ReactNode }) {
  const [tallies, setTallies] = useState<Record<string, VoteTally>>({});

  const refresh = useCallback(async () => {
    setTallies(await fetchVoteTallies());
  }, []);

  // Initial load. setState in the async .then keeps it out of the synchronous
  // effect body (avoids the set-state-in-effect lint).
  useEffect(() => {
    fetchVoteTallies().then(setTallies);
  }, []);

  const applyDelta = useCallback(
    (aptId: string, dUp: number, dDown: number) => {
      setTallies((prev) => {
        const cur = prev[aptId] ?? { up: 0, down: 0 };
        return {
          ...prev,
          [aptId]: {
            up: Math.max(0, cur.up + dUp),
            down: Math.max(0, cur.down + dDown),
          },
        };
      });
    },
    [],
  );

  const value = useMemo<VoteTalliesValue>(
    () => ({ tallies, refresh, applyDelta }),
    [tallies, refresh, applyDelta],
  );

  return (
    <VoteTalliesContext.Provider value={value}>
      {children}
    </VoteTalliesContext.Provider>
  );
}

// Anonymous voter fingerprint (get-or-create). Kept at module scope so the
// React Compiler lint does not flag Math.random()/Date.now() as impure calls
// during component render.
export function getOrCreateVoterFingerprint(): string {
  let fp = localStorage.getItem("bia_voter_fp");
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("bia_voter_fp", fp);
  }
  return fp;
}
