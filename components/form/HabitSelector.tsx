"use client";

interface HabitSelectorProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  /** Color for the selected item — defaults to var(--cardinal) */
  accent?: string;
  /**
   * "radio" — click-to-select / click-again-to-deselect (brutal-tag style)
   * "toggle" — same behavior with larger button styling
   */
  mode?: "radio" | "toggle";
}

export default function HabitSelector({
  label,
  options,
  value,
  onChange,
  accent = "var(--cardinal)",
  mode = "radio",
}: HabitSelectorProps) {
  const isToggle = mode === "toggle";

  return (
    <div>
      <label
        className="font-display text-xs tracking-wider block mb-2"
        style={{ color: "var(--black)" }}
      >
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(selected ? "" : opt)}
              className={
                isToggle
                  ? "border-[3px] border-[var(--black)] px-4 py-2 text-xs font-display tracking-wider cursor-pointer transition-colors"
                  : "brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
              }
              style={
                selected
                  ? isToggle
                    ? { background: accent, color: "white" }
                    : {
                        background: accent,
                        color: "white",
                        borderColor: accent,
                      }
                  : isToggle
                    ? {
                        background: "var(--cream)",
                        color: "var(--black)",
                      }
                    : {}
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
