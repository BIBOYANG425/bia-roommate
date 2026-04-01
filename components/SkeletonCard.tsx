export default function SkeletonCard() {
  return (
    <div className="brutal-card p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 border-[3px] border-[var(--black)]"
          style={{ background: "var(--beige)" }}
        />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-24" style={{ background: "var(--beige)" }} />
          <div className="h-3 w-36" style={{ background: "var(--beige)" }} />
        </div>
      </div>
      <div className="flex gap-1">
        <div
          className="h-5 w-14 border-[2px]"
          style={{ background: "var(--beige)", borderColor: "var(--beige)" }}
        />
        <div
          className="h-5 w-16 border-[2px]"
          style={{ background: "var(--beige)", borderColor: "var(--beige)" }}
        />
      </div>
      <div className="h-8" style={{ background: "var(--beige)" }} />
      <div
        className="pt-3 border-t-[2px] flex justify-between"
        style={{ borderColor: "var(--beige)" }}
      >
        <div className="h-3 w-16" style={{ background: "var(--beige)" }} />
        <div className="h-3 w-24" style={{ background: "var(--beige)" }} />
      </div>
    </div>
  );
}
