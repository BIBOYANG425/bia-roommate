"use client";

export default function RatingBar({
  label,
  value,
  max = 5,
  colorFn,
}: {
  label: string;
  value: number;
  max?: number;
  colorFn?: (value: number) => string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const color = colorFn ? colorFn(value) : "var(--cardinal)";

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] text-[var(--mid)] w-16 shrink-0">
        {label}
      </span>
      <div className="habit-bar-bg flex-1">
        <div
          className="habit-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[12px] font-bold w-8 text-right">
        {value > 0 ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}
