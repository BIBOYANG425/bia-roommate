"use client";

import { VALID_TAGS } from "@/lib/types";

interface TagPickerProps {
  selectedTags: string[];
  maxTags?: number;
  onToggle: (tag: string) => void;
  /** Color for selected tags — defaults to var(--cardinal) */
  accent?: string;
  /** Layout mode: "wrap" for flex-wrap, "grid" for 2-3 col grid */
  layout?: "wrap" | "grid";
}

export default function TagPicker({
  selectedTags,
  maxTags: _maxTags,
  onToggle,
  accent = "var(--cardinal)",
  layout = "wrap",
}: TagPickerProps) {
  const containerClass =
    layout === "grid"
      ? "grid grid-cols-2 sm:grid-cols-3 gap-2"
      : "flex flex-wrap gap-2";

  return (
    <div className={containerClass}>
      {VALID_TAGS.map((tag) => {
        const selected = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`brutal-tag cursor-pointer text-xs px-3 py-1.5 transition-colors ${
              layout === "grid" ? "py-2 text-center" : ""
            } ${selected && layout === "grid" ? "brutal-tag-filled" : ""}`}
            style={
              selected
                ? layout === "grid"
                  ? {}
                  : {
                      background: accent,
                      color: "white",
                      borderColor: accent,
                    }
                : layout === "grid"
                  ? {
                      background: "var(--cream)",
                      color: "var(--black)",
                    }
                  : {}
            }
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
