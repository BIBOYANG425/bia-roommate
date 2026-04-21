"use client";

// Generic horizontal status stepper. Works for any linear lifecycle —
// parcels (5 steps), shipments (8 steps), or anything else. Branch
// statuses render as a single off-path red node on the right.

interface Step {
  key: string;
  label: string;
}

interface Props {
  steps: Step[];
  current: string;
  /** End-states that aren't on the happy path (e.g. lost/returned). */
  branches?: Step[];
}

export default function StatusProgress({ steps, current, branches }: Props) {
  const currentIdx = steps.findIndex((s) => s.key === current);
  const onBranch = branches?.some((b) => b.key === current) ?? false;

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex items-start gap-0 min-w-max">
        {steps.map((step, i) => {
          const past = !onBranch && currentIdx > i;
          const active = !onBranch && currentIdx === i;
          const bg = past
            ? "#1c6f3d"
            : active
              ? "var(--gold)"
              : "var(--cream)";
          const fg = past ? "white" : active ? "var(--black)" : "var(--mid)";
          const connectorBg = past ? "#1c6f3d" : "var(--beige)";
          return (
            <li key={step.key} className="flex items-start flex-1 min-w-[72px]">
              <div className="flex flex-col items-center w-full">
                <div
                  className="w-9 h-9 border-[3px] border-[var(--black)] font-display text-sm flex items-center justify-center"
                  style={{ background: bg, color: fg }}
                >
                  {past ? "✓" : i + 1}
                </div>
                <p
                  className="font-display text-[10px] tracking-wider mt-1 text-center px-1 leading-tight"
                  style={{
                    color: active ? "var(--black)" : "var(--mid)",
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {step.label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="h-1 flex-1 mt-4"
                  style={{ background: connectorBg, minWidth: "12px" }}
                />
              )}
            </li>
          );
        })}

        {onBranch && branches && (
          <li className="flex items-start ml-3 pl-3 border-l-[3px] border-[var(--black)]">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 border-[3px] border-[var(--black)] font-display text-sm flex items-center justify-center"
                style={{ background: "var(--cardinal)", color: "white" }}
              >
                !
              </div>
              <p
                className="font-display text-[10px] tracking-wider mt-1 text-center px-1 leading-tight"
                style={{ color: "var(--cardinal)", fontWeight: 700 }}
              >
                {branches.find((b) => b.key === current)?.label ?? current}
              </p>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
