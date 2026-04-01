"use client";

import type { SchedulePrefs } from "@/app/course-planner/page";

interface SchedulePreferencesProps {
  prefs: SchedulePrefs;
  onChange: (prefs: SchedulePrefs) => void;
}

const EARLIEST_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "8:00", label: "8:00 AM" },
  { value: "9:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
];

const DONE_BY_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
];

export default function SchedulePreferences({
  prefs,
  onChange,
}: SchedulePreferencesProps) {
  return (
    <div
      className="mb-2 p-4 border-[2px]"
      style={{
        borderColor: "var(--beige)",
        background: "white",
        borderRadius: "4px",
      }}
    >
      <h4
        className="font-display text-xs tracking-wider mb-3"
        style={{ color: "var(--mid)" }}
      >
        SCHEDULE PREFERENCES
      </h4>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label
            htmlFor="earliest-class-select"
            className="font-display text-[11px] tracking-wider block mb-1"
            style={{ color: "var(--black)" }}
          >
            EARLIEST CLASS
          </label>
          <select
            id="earliest-class-select"
            value={prefs.earliestClass}
            onChange={(e) =>
              onChange({ ...prefs, earliestClass: e.target.value })
            }
            className="brutal-select text-sm"
          >
            {EARLIEST_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="done-by-select"
            className="font-display text-[11px] tracking-wider block mb-1"
            style={{ color: "var(--black)" }}
          >
            DONE BY
          </label>
          <select
            id="done-by-select"
            value={prefs.doneBy}
            onChange={(e) => onChange({ ...prefs, doneBy: e.target.value })}
            className="brutal-select text-sm"
          >
            {DONE_BY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-4 sm:mt-0">
          <input
            type="checkbox"
            checked={prefs.preferBackToBack}
            onChange={(e) =>
              onChange({ ...prefs, preferBackToBack: e.target.checked })
            }
            className="w-4 h-4 accent-(--cardinal)"
          />
          <span className="text-sm" style={{ color: "var(--black)" }}>
            Prefer back-to-back classes
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'var(--beige)' }}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.hideDClearance}
            onChange={(e) => onChange({ ...prefs, hideDClearance: e.target.checked })}
            className="w-4 h-4 accent-(--cardinal)"
          />
          <span className="text-sm" style={{ color: 'var(--black)' }}>
            Hide D-clearance sections
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.hideGraduate}
            onChange={(e) => onChange({ ...prefs, hideGraduate: e.target.checked })}
            className="w-4 h-4 accent-(--cardinal)"
          />
          <span className="text-sm" style={{ color: 'var(--black)' }}>
            Hide graduate-level courses (500+)
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.hideThematicOption}
            onChange={(e) => onChange({ ...prefs, hideThematicOption: e.target.checked })}
            className="w-4 h-4 accent-(--cardinal)"
          />
          <span className="text-sm" style={{ color: 'var(--black)' }}>
            Hide Thematic Option (CORE)
          </span>
        </label>
      </div>
    </div>
  );
}
