// components/squad/ReasonChip.tsx
// The ✦ reason chip (spec §11.6): cardinal-on-cream text — gold is background-only
// per the contrast rule. Renders nothing for null reasons (no fake chips).
export default function ReasonChip({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <span
      className="inline-block text-[11px] font-semibold tracking-wide"
      style={{ color: "var(--cardinal)" }}
    >
      {reason}
    </span>
  );
}
