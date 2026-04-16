"use client";

// React Context store for the course planner. Reducer-based actions for add/remove/reorder
// sections; derives semester from calendar context. Consumers read via useCoursePlanner().
// Do not keep planner state locally inside components — always go through this store.
//
// Header last reviewed: 2026-04-16

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { PlannerState, PlannerAction, Schedule } from "./types";
import { getCurrentSemesterCode } from "./semester";
import { getNextColorIndex } from "./colors";

function createSchedule(name: string): Schedule {
  return {
    id: crypto.randomUUID(),
    name,
    selectedSections: [],
    totalUnits: 0,
  };
}

function calcUnits(sections: { units: string; courseId: string }[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const s of sections) {
    if (!seen.has(s.courseId)) {
      seen.add(s.courseId);
      total += parseFloat(s.units) || 0;
    }
  }
  return total;
}

const defaultSchedule = createSchedule("Schedule 1");

const initialState: PlannerState = {
  semester: getCurrentSemesterCode(),
  schedules: [defaultSchedule],
  activeScheduleId: defaultSchedule.id,
  searchQuery: "",
  searchResults: [],
  expandedCourse: null,
  rmpCache: {},
  isSearching: false,
  isLoadingCourse: false,
  isOptimizing: false,
  optimizeProgress: 0,
  error: null,
};

function getActiveSchedule(state: PlannerState): Schedule {
  return (
    state.schedules.find((s) => s.id === state.activeScheduleId) ||
    state.schedules[0]
  );
}

function updateActiveSchedule(
  state: PlannerState,
  updater: (s: Schedule) => Schedule,
): PlannerState {
  return {
    ...state,
    schedules: state.schedules.map((s) =>
      s.id === state.activeScheduleId ? updater(s) : s,
    ),
  };
}

function plannerReducer(
  state: PlannerState,
  action: PlannerAction,
): PlannerState {
  switch (action.type) {
    case "SET_SEMESTER":
      return {
        ...state,
        semester: action.semester,
        searchResults: [],
        expandedCourse: null,
        schedules: state.schedules.map((s) => ({
          ...s,
          selectedSections: [],
          totalUnits: 0,
        })),
      };

    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.query };

    case "SET_SEARCH_RESULTS":
      return { ...state, searchResults: action.results, isSearching: false };

    case "SET_SEARCHING":
      return { ...state, isSearching: action.isSearching };

    case "SET_EXPANDED_COURSE":
      return {
        ...state,
        expandedCourse: action.course,
        isLoadingCourse: false,
      };

    case "SET_LOADING_COURSE":
      return { ...state, isLoadingCourse: action.isLoading };

    case "ADD_SECTION": {
      return updateActiveSchedule(state, (sched) => {
        const sections = [...sched.selectedSections, action.section];
        return {
          ...sched,
          selectedSections: sections,
          totalUnits: calcUnits(sections),
        };
      });
    }

    case "REMOVE_SECTION": {
      return updateActiveSchedule(state, (sched) => {
        const sections = sched.selectedSections.filter(
          (s) =>
            !(
              s.courseId === action.courseId &&
              s.section.id === action.sectionId
            ),
        );
        return {
          ...sched,
          selectedSections: sections,
          totalUnits: calcUnits(sections),
        };
      });
    }

    case "REMOVE_COURSE": {
      return updateActiveSchedule(state, (sched) => {
        const sections = sched.selectedSections.filter(
          (s) => s.courseId !== action.courseId,
        );
        return {
          ...sched,
          selectedSections: sections,
          totalUnits: calcUnits(sections),
        };
      });
    }

    case "REPLACE_ALL_SECTIONS": {
      return updateActiveSchedule(state, (sched) => ({
        ...sched,
        selectedSections: action.sections,
        totalUnits: calcUnits(action.sections),
      }));
    }

    case "ADD_SCHEDULE": {
      if (state.schedules.length >= 5) return state;
      const newSched = createSchedule(action.name);
      return {
        ...state,
        schedules: [...state.schedules, newSched],
        activeScheduleId: newSched.id,
      };
    }

    case "REMOVE_SCHEDULE": {
      if (state.schedules.length <= 1) return state;
      const remaining = state.schedules.filter(
        (s) => s.id !== action.scheduleId,
      );
      return {
        ...state,
        schedules: remaining,
        activeScheduleId:
          state.activeScheduleId === action.scheduleId
            ? remaining[0].id
            : state.activeScheduleId,
      };
    }

    case "RENAME_SCHEDULE":
      return {
        ...state,
        schedules: state.schedules.map((s) =>
          s.id === action.scheduleId ? { ...s, name: action.name } : s,
        ),
      };

    case "SET_ACTIVE_SCHEDULE":
      return { ...state, activeScheduleId: action.scheduleId };

    case "CACHE_RMP":
      return {
        ...state,
        rmpCache: { ...state.rmpCache, [action.key]: action.rating },
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "SET_OPTIMIZING":
      return {
        ...state,
        isOptimizing: action.isOptimizing,
        optimizeProgress:
          action.progress ?? (action.isOptimizing ? 0 : state.optimizeProgress),
      };

    default:
      return state;
  }
}

const PlannerContext = createContext<{
  state: PlannerState;
  dispatch: Dispatch<PlannerAction>;
} | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(plannerReducer, initialState);
  return (
    <PlannerContext.Provider value={{ state, dispatch }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within ScheduleProvider");
  return ctx;
}

export { getActiveSchedule, getNextColorIndex };
