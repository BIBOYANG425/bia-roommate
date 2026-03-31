"use client";

import { useState, useCallback } from "react";
import { usePlanner, getActiveSchedule } from "@/lib/course-planner/store";
import { optimizeSchedule } from "@/lib/course-planner/optimizer";
import type { Course } from "@/lib/course-planner/types";

export default function OptimizeButton() {
  const { state, dispatch } = usePlanner();
  const active = getActiveSchedule(state);
  const [progress, setProgress] = useState(0);

  const handleOptimize = useCallback(async () => {
    if (active.selectedSections.length === 0) {
      dispatch({
        type: "SET_ERROR",
        error: "ADD COURSES FIRST, THEN OPTIMIZE",
      });
      return;
    }

    dispatch({ type: "SET_OPTIMIZING", isOptimizing: true, progress: 0 });
    setProgress(0);

    // Get unique courses from selected sections
    const courseIds = [
      ...new Set(active.selectedSections.map((s) => s.courseId)),
    ];

    try {
      // Fetch full course data for each
      const courses: Course[] = [];
      const failedCourses: string[] = [];
      for (const id of courseIds) {
        const [dept, num] = id.split("-");
        const res = await fetch(
          `/api/courses/${encodeURIComponent(dept)}/${encodeURIComponent(num)}?semester=${state.semester}`,
        );
        if (res.ok) {
          courses.push(await res.json());
        } else {
          failedCourses.push(id);
        }
      }
      if (failedCourses.length > 0) {
        dispatch({
          type: "SET_ERROR",
          error: `FAILED TO LOAD: ${failedCourses.join(", ")}`,
        });
      }

      if (courses.length === 0) {
        dispatch({ type: "SET_ERROR", error: "COULD NOT LOAD COURSE DATA" });
        dispatch({ type: "SET_OPTIMIZING", isOptimizing: false });
        return;
      }

      // Fetch RMP ratings for all instructors
      const instructorsToFetch: {
        firstName: string;
        lastName: string;
        key: string;
      }[] = [];
      const seenKeys = new Set<string>();
      for (const course of courses) {
        for (const sec of course.sections || []) {
          if (sec.instructor?.lastName) {
            const key = `${sec.instructor.lastName}, ${sec.instructor.firstName}`;
            if (state.rmpCache[key] === undefined && !seenKeys.has(key)) {
              seenKeys.add(key);
              instructorsToFetch.push({
                firstName: sec.instructor.firstName,
                lastName: sec.instructor.lastName,
                key,
              });
            }
          }
        }
      }

      // Fetch missing RMP data
      const rmpPromises = instructorsToFetch.map(
        async ({ firstName, lastName, key }) => {
          try {
            const res = await fetch(
              `/api/rmp/search?name=${encodeURIComponent(`${firstName} ${lastName}`)}`,
            );
            if (!res.ok) {
              dispatch({
                type: "SET_ERROR",
                error: `FAILED TO LOAD RATING FOR ${lastName}`,
              });
              return;
            }
            const data = await res.json();
            dispatch({ type: "CACHE_RMP", key, rating: data });
          } catch {
            /* ignore */
          }
        },
      );
      await Promise.all(rmpPromises);

      setProgress(20);

      // Run optimizer
      const result = optimizeSchedule({
        courses,
        rmpCache: state.rmpCache,
        onProgress: (pct) => setProgress(20 + Math.round(pct * 0.8)),
        timeoutMs: 30000,
      });

      if (result.sections.length > 0) {
        dispatch({ type: "REPLACE_ALL_SECTIONS", sections: result.sections });
        dispatch({
          type: "SET_ERROR",
          error: `OPTIMIZED! Score: ${result.score.toFixed(1)} (${result.explored} combos checked)`,
        });
      } else {
        dispatch({
          type: "SET_ERROR",
          error: "NO VALID SCHEDULE FOUND — TRY DIFFERENT COURSES",
        });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "OPTIMIZATION FAILED" });
    } finally {
      dispatch({ type: "SET_OPTIMIZING", isOptimizing: false });
      setProgress(100);
    }
  }, [active.selectedSections, state.semester, state.rmpCache, dispatch]);

  return (
    <div>
      <button
        onClick={handleOptimize}
        disabled={state.isOptimizing || active.selectedSections.length === 0}
        className="brutal-btn brutal-btn-primary w-full text-sm"
        style={{
          opacity:
            state.isOptimizing || active.selectedSections.length === 0
              ? 0.6
              : 1,
        }}
      >
        {state.isOptimizing ? `OPTIMIZING... ${progress}%` : "AUTO-OPTIMIZE ⚡"}
      </button>

      {state.isOptimizing && (
        <div
          className="mt-2 h-2 border-[2px] border-[var(--black)]"
          style={{ background: "var(--cream)" }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "var(--cardinal)" }}
          />
        </div>
      )}
    </div>
  );
}
