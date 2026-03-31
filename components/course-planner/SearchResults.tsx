"use client";

import { useCallback } from "react";
import { usePlanner } from "@/lib/course-planner/store";
import SkeletonResults from "./SkeletonResults";

export default function SearchResults() {
  const { state, dispatch } = usePlanner();

  const loadCourse = useCallback(
    async (dept: string, num: string) => {
      dispatch({ type: "SET_LOADING_COURSE", isLoading: true });
      try {
        const res = await fetch(
          `/api/courses/${encodeURIComponent(dept)}/${encodeURIComponent(num)}?semester=${state.semester}`,
        );
        if (!res.ok) throw new Error("Load failed");
        const data = await res.json();
        dispatch({ type: "SET_EXPANDED_COURSE", course: data });
      } catch {
        dispatch({ type: "SET_ERROR", error: "FAILED TO LOAD COURSE" });
        dispatch({ type: "SET_LOADING_COURSE", isLoading: false });
      }
    },
    [dispatch, state.semester],
  );

  if (state.isSearching) return <SkeletonResults />;

  if (state.searchResults.length === 0 && state.searchQuery) {
    return (
      <div className="text-center py-10">
        <p className="font-display text-xl" style={{ color: "var(--mid)" }}>
          NO COURSES FOUND
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--mid)" }}>
          Try a different search term
        </p>
      </div>
    );
  }

  if (state.searchResults.length === 0) {
    return (
      <div className="text-center py-10">
        <p
          className="font-display text-2xl"
          style={{ color: "var(--mid)", opacity: 0.3 }}
        >
          SEARCH USC COURSES
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--mid)" }}
      >
        {state.searchResults.length} RESULTS
      </p>
      {state.searchResults.map((r, i) => (
        <div
          key={`${r.department}-${r.number}-${i}`}
          className="brutal-card p-3 cursor-pointer hover:translate-x-1 transition-transform"
          onClick={() => loadCourse(r.department, r.number)}
        >
          <div className="flex items-baseline gap-2">
            <span
              className="font-display text-lg"
              style={{ color: "var(--cardinal)" }}
            >
              {r.department} {r.number}
            </span>
            <span className="text-xs" style={{ color: "var(--mid)" }}>
              {r.units} units
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: "var(--black)" }}>
            {r.title}
          </p>
        </div>
      ))}
    </div>
  );
}
