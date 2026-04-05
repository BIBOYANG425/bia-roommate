"use client";

interface RadioGroupProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  /** Color for selected items — defaults to var(--cardinal) */
  accent?: string;
  /** Enable a "CUSTOM" free-text option */
  customizable?: boolean;
  customValue?: string;
  onCustomChange?: (v: string) => void;
  customPlaceholder?: string;
}

export default function RadioGroup({
  label,
  options,
  value,
  onChange,
  accent = "var(--cardinal)",
  customizable,
  customValue,
  onCustomChange,
  customPlaceholder,
}: RadioGroupProps) {
  const isCustom = value === "__custom__";
  return (
    <div>
      <label
        className="font-display text-sm tracking-wider block mb-2"
        style={{ color: "var(--mid)" }}
      >
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? "" : opt)}
            className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
            style={
              value === opt
                ? {
                    background: accent,
                    color: "white",
                    borderColor: accent,
                  }
                : {}
            }
          >
            {opt}
          </button>
        ))}
        {customizable && (
          <button
            type="button"
            onClick={() => onChange(isCustom ? "" : "__custom__")}
            className="brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors"
            style={
              isCustom
                ? {
                    background: "var(--gold)",
                    color: "var(--black)",
                    borderColor: "var(--black)",
                  }
                : { borderStyle: "dashed" }
            }
          >
            CUSTOM
          </button>
        )}
      </div>
      {isCustom && (
        <input
          type="text"
          value={customValue || ""}
          onChange={(e) => onCustomChange?.(e.target.value)}
          placeholder={customPlaceholder || ""}
          className="brutal-input mt-2"
        />
      )}
    </div>
  );
}
