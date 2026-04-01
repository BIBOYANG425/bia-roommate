"use client";

import { usePlanner } from "@/lib/course-planner/store";

export default function ScheduleTabs() {
  const { state, dispatch } = usePlanner();

  return (
    <div className="flex items-center gap-0 flex-wrap">
      {state.schedules.map((sched) => {
        const active = sched.id === state.activeScheduleId;
        return (
          <button
            key={sched.id}
            onClick={() =>
              dispatch({ type: "SET_ACTIVE_SCHEDULE", scheduleId: sched.id })
            }
            className={`schedule-tab ${active ? "schedule-tab-active" : ""}`}
            style={
              active
                ? { background: "var(--cardinal)", color: "white" }
                : { background: "var(--cream)", color: "var(--mid)" }
            }
          >
            {sched.name}
          </button>
        );
      })}

      {state.schedules.length < 5 && (
        <button
          type="button"
          aria-label="Add schedule"
          onClick={() =>
            dispatch({
              type: "ADD_SCHEDULE",
              name: `Schedule ${state.schedules.length + 1}`,
            })
          }
          className="schedule-tab"
          style={{ background: "var(--cream)", color: "var(--mid)" }}
        >
          +
        </button>
      )}
    </div>
  );
}
