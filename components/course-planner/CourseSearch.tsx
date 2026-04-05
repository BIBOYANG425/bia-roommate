"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CourseSearchProps {
  onSelect: (id: string, label: string) => void;
  semester: string;
}

export default function CourseSearch({
  onSelect,
  semester,
}: CourseSearchProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: string; label: string }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Fetch autocomplete and search in parallel
        const autoPromise = fetch(
          `/api/courses/autocomplete?q=${encodeURIComponent(q)}&termCode=${semester}`,
          {
            signal: controller.signal,
          },
        );
        const searchPromise =
          q.length >= 3
            ? fetch(
                `/api/courses/search?q=${encodeURIComponent(q)}&semester=${semester}`,
                { signal: controller.signal },
              )
            : null;

        const res = await autoPromise;
        if (!res.ok) return;
        const data = await res.json();

        let items: { id: string; label: string }[] = [];
        if (Array.isArray(data)) {
          items = data
            .map((d: { text?: string } | string) => {
              const text = typeof d === "string" ? d : d.text || "";
              if (!text) return null;
              const match = text.match(/^([A-Z]+-\d+[A-Z]?)\s+(.+)$/i);
              if (match) return { id: match[1], label: text };
              // Only accept GE-style IDs (e.g. "GE-A"), skip department-only entries
              const geMatch = text.match(/^(GE-[A-H])\b/i);
              if (geMatch) return { id: geMatch[1].toUpperCase(), label: text };
              return null;
            })
            .filter(Boolean) as { id: string; label: string }[];
        }

        // Merge search results
        if (searchPromise) {
          const searchRes = await searchPromise;
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (Array.isArray(searchData) && searchData.length > 0) {
              const ids = new Set(items.map((p) => p.id));
              for (const r of searchData.slice(0, 5) as {
                department: string;
                number: string;
                title: string;
              }[]) {
                const id = `${r.department}-${r.number}`;
                if (!ids.has(id)) {
                  items.push({
                    id,
                    label: `${r.department} ${r.number} — ${r.title}`,
                  });
                  ids.add(id);
                }
              }
            }
          }
        }

        setSuggestions(items.slice(0, 8));
        setShowDropdown(items.length > 0);
      } catch {
        // aborted or network error
      }
    },
    [semester],
  );

  function handleInput(val: string) {
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function handleSelect(item: { id: string; label: string }) {
    onSelect(item.id, item.label);
    setInput("");
    setSuggestions([]);
    setShowDropdown(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        placeholder='Search by course (e.g. "CSCI 104") or type "GE-A"'
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        className="w-full px-4 py-3 text-sm border-[2px] outline-none transition-colors"
        style={{
          borderColor: "var(--beige)",
          background: "white",
          color: "var(--black)",
          borderRadius: "4px",
          fontFamily: "var(--font-body), monospace",
        }}
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 max-h-64 overflow-y-auto border-[2px] border-t-0"
          style={{
            borderColor: "var(--beige)",
            background: "white",
            borderRadius: "0 0 4px 4px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {suggestions.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              role="option"
              aria-selected={false}
              tabIndex={0}
              className="px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-[var(--cream)] focus:bg-[var(--cream)] outline-none"
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
