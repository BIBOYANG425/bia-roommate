// Shared week-grid preview of a set of selected sections.
// Used by the Optimizer (live result) and Saved Schedules (saved detail).
//
// Header last reviewed: 2026-06-18

import { Fragment } from "react";
import type { SelectedSection, DayOfWeek } from "../../shared/types";
import { COURSE_COLORS } from "../../shared/constants";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export function MiniCalendar({ sections }: { sections: SelectedSection[] }) {
  if (sections.length === 0) return null;

  const grid: (SelectedSection | null)[][] = HOURS.map(() =>
    DAYS.map(() => null),
  );
  for (const sec of sections) {
    for (const slot of sec.timeSlots) {
      const colIdx = DAYS.indexOf(slot.day);
      if (colIdx === -1) continue;
      const startRow = Math.max(0, Math.floor((slot.startMin - 480) / 60));
      const endRow = Math.min(
        HOURS.length,
        Math.ceil((slot.endMin - 480) / 60),
      );
      for (let r = startRow; r < endRow; r++) {
        grid[r][colIdx] = sec;
      }
    }
  }

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header" />
      {DAYS.map((d) => (
        <div key={d} className="mini-calendar-header">
          {d}
        </div>
      ))}
      {HOURS.map((h, ri) => (
        <Fragment key={`row-${h}`}>
          <div className="mini-calendar-time">
            {h > 12 ? h - 12 : h}
            {h >= 12 ? "p" : "a"}
          </div>
          {DAYS.map((_, ci) => {
            const sec = grid[ri][ci];
            const color = sec
              ? COURSE_COLORS[sec.colorIndex % COURSE_COLORS.length]
              : null;
            return (
              <div
                key={`${ri}-${ci}`}
                className="mini-calendar-cell"
                style={color ? { backgroundColor: color.bg } : undefined}
                title={sec ? `${sec.courseId} ${sec.courseTitle}` : undefined}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
