"use client";

import React from "react";

export interface CollapsibleSectionProps {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div
      className="border-[3px] border-[var(--black)]"
      style={{ background: "var(--cream)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 font-display text-sm tracking-wider"
        style={{ color: "var(--black)" }}
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span
              className="px-2 py-0.5 text-[10px] border-[2px] border-[var(--black)]"
              style={{ background: "var(--gold)" }}
            >
              {count}
            </span>
          )}
          <span
            className="text-xs"
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
              display: "inline-block",
            }}
          >
            &#9660;
          </span>
        </div>
      </button>
      {open && (
        <div className="p-4 pt-0 border-t-[2px] border-[var(--black)]">
          {children}
        </div>
      )}
    </div>
  );
}
