"use client";

export interface StatsRowProps {
  sublets: number;
  saved: number;
  liked: number;
  comments: number;
}

function StatBox({ label, count }: { label: string; count: number }) {
  return (
    <div
      className="flex-1 border-[3px] border-[var(--black)] p-3 text-center"
      style={{ background: "var(--cream)" }}
    >
      <div
        className="font-display text-2xl tracking-wider"
        style={{ color: "var(--black)" }}
      >
        {count}
      </div>
      <div
        className="text-[10px] tracking-wider mt-1"
        style={{ color: "var(--mid)" }}
      >
        {label}
      </div>
    </div>
  );
}

export default function StatsRow({
  sublets,
  saved,
  liked,
  comments,
}: StatsRowProps) {
  return (
    <div className="flex gap-3">
      <StatBox label="SUBLETS" count={sublets} />
      <StatBox label="SAVED" count={saved} />
      <StatBox label="LIKED" count={liked} />
      <StatBox label="COMMENTS" count={comments} />
    </div>
  );
}
