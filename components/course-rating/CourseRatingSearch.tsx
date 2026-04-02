"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function CourseRatingSearch() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: string; dept: string; number: string; label: string }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    abortRef.current?.abort();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/courses/autocomplete?q=${encodeURIComponent(q)}`,
        { signal: controller.signal }
      );
      if (!res.ok) return;
      const data = await res.json();

      let items: { id: string; dept: string; number: string; label: string }[] = [];
      if (Array.isArray(data)) {
        items = data
          .map((d: { text?: string } | string) => {
            const text = typeof d === "string" ? d : d.text || "";
            if (!text) return null;
            const match = text.match(/^([A-Z]+)-(\d+[A-Z]*)\s+(.+)$/i);
            if (match) {
              return {
                id: `${match[1]}-${match[2]}`,
                dept: match[1].toUpperCase(),
                number: match[2],
                label: text,
              };
            }
            return null;
          })
          .filter(Boolean) as typeof items;
      }

      setSuggestions(items.slice(0, 8));
      setShowDropdown(items.length > 0);
    } catch {
      // aborted or network error
    }
  }, []);

  function handleInput(val: string) {
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function handleSelect(item: { dept: string; number: string }) {
    router.push(`/course-rating/${item.dept}/${item.number}`);
    setInput("");
    setSuggestions([]);
    setShowDropdown(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        placeholder='搜索课程 (e.g. "CSCI 104", "MATH 225")'
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        className="brutal-input w-full"
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 max-h-64 overflow-y-auto border-[2px] border-t-0 border-[var(--black)]"
          style={{
            background: "white",
            boxShadow: "4px 4px 0 var(--black)",
          }}
        >
          {suggestions.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              role="option"
              tabIndex={0}
              className="px-4 py-3 font-mono text-sm cursor-pointer transition-colors hover:bg-[var(--cream)] focus:bg-[var(--cream)] outline-none"
              style={{
                borderBottom: "1px solid var(--beige)",
                color: "var(--black)",
              }}
              onClick={() => handleSelect(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(item);
                }
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
