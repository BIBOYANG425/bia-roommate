"use client";

import { SubletListing } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import EmptyState from "./EmptyState";

export interface SubletsListProps {
  sublets: SubletListing[];
  onDelete: (id: string) => void;
}

export default function SubletsList({ sublets, onDelete }: SubletsListProps) {
  if (sublets.length === 0) {
    return <EmptyState message="NO SUBLET LISTINGS YET" />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 mt-3">
      {sublets.map((s) => (
        <div
          key={s.id}
          className="border-[3px] border-[var(--black)] p-4 flex items-center justify-between"
          style={{ background: "white" }}
        >
          <div>
            <h3
              className="font-display text-lg tracking-wider"
              style={{ color: "var(--black)" }}
            >
              {s.title}
            </h3>
            <p className="text-[11px] mt-1" style={{ color: "var(--mid)" }}>
              {s.apartment_name} &mdash; ${s.rent}/mo
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--mid)" }}>
              {relativeTime(s.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <a
              href="/sublet"
              className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--gold)] transition-colors"
            >
              VIEW
            </a>
            <a
              href={`/sublet-submit?edit=${s.id}`}
              className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--gold)] transition-colors"
            >
              EDIT
            </a>
            <button
              onClick={() => onDelete(s.id)}
              className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white transition-colors"
            >
              DELETE
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
