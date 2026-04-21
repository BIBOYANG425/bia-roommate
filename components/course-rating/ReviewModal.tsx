"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReviewForm from "./ReviewForm";
import {
  parseAutocompleteSuggestion,
  parseDirectCourseInput,
} from "@/lib/courses/autocomplete-suggestion";

export default function ReviewModal({ onClose }: { onClose: () => void }) {
  const [selectedCourse, setSelectedCourse] = useState<{
    dept: string;
    number: string;
    title: string;
  } | null>(null);

  // Search state
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<
    {
      id: string;
      dept: string;
      number: string;
      label: string;
      title: string;
    }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [professors, setProfessors] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fetch professors from USC API sections + review aggregates
  useEffect(() => {
    if (!selectedCourse) return;
    let isActive = true;
    const { dept, number } = selectedCourse;

    Promise.allSettled([
      fetch(`/api/courses/${dept}/${number}`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(
        `/api/course-rating/reviews?dept=${encodeURIComponent(dept)}&number=${encodeURIComponent(number)}`,
      ).then((r) => (r.ok ? r.json() : null)),
    ]).then(([courseResult, reviewsResult]) => {
      if (!isActive) return;
      const set = new Set<string>();
      // From USC API sections
      if (courseResult.status === "fulfilled" && courseResult.value?.sections) {
        for (const s of courseResult.value.sections) {
          if (s.instructor?.lastName) {
            const name = [s.instructor.firstName, s.instructor.lastName]
              .filter(Boolean)
              .join(" ");
            if (name) set.add(name);
          }
        }
      }
      // From review aggregates
      if (
        reviewsResult.status === "fulfilled" &&
        reviewsResult.value?.aggregate?.professors
      ) {
        for (const p of reviewsResult.value.aggregate.professors) {
          set.add(p);
        }
      }
      setProfessors(Array.from(set).sort());
    });

    return () => {
      isActive = false;
    };
  }, [selectedCourse]);

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
        { signal: controller.signal },
      );
      if (!res.ok) return;
      const data = await res.json();

      let items: {
        id: string;
        dept: string;
        number: string;
        label: string;
        title: string;
      }[] = [];
      if (Array.isArray(data)) {
        items = data
          .map((d: { text?: string; dept?: string; number?: string } | string) => {
            const parsed = parseAutocompleteSuggestion(d);
            if (!parsed) return null;
            return {
              id: `${parsed.dept}-${parsed.number}`,
              dept: parsed.dept,
              number: parsed.number,
              label: parsed.label,
              title: parsed.title || "",
            };
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-[15vh] pb-8 px-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg">
        {!selectedCourse ? (
          <div
            className="border-[3px] border-[var(--black)] p-4"
            style={{ background: "var(--cream)", overflow: "visible" }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-sm tracking-wider">
                SELECT A COURSE TO REVIEW
              </p>
              <button
                onClick={onClose}
                className="font-display text-lg leading-none px-1 hover:text-[var(--cardinal)]"
              >
                ✕
              </button>
            </div>

            <div
              ref={wrapperRef}
              className="relative"
              style={{ overflow: "visible" }}
            >
              <input
                type="text"
                placeholder='搜索课程 (e.g. "PSYC 100", "MPGU 120A")'
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (suggestions[0]) {
                    const item = suggestions[0];
                    setSelectedCourse({
                      dept: item.dept,
                      number: item.number,
                      title: item.title,
                    });
                    setShowDropdown(false);
                    return;
                  }
                  const direct = parseDirectCourseInput(input);
                  if (direct) {
                    setSelectedCourse({
                      dept: direct.dept,
                      number: direct.number,
                      title: "",
                    });
                    setInput("");
                    setSuggestions([]);
                  }
                }}
                className="brutal-input w-full"
                autoFocus
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
                      aria-selected={false}
                      tabIndex={0}
                      className="px-4 py-3 font-mono text-sm cursor-pointer transition-colors hover:bg-[var(--cream)] focus:bg-[var(--cream)] outline-none"
                      style={{
                        borderBottom: "1px solid var(--beige)",
                        color: "var(--black)",
                      }}
                      onClick={() => {
                        setSelectedCourse({
                          dept: item.dept,
                          number: item.number,
                          title: item.title,
                        });
                        setShowDropdown(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCourse({
                            dept: item.dept,
                            number: item.number,
                            title: item.title,
                          });
                          setShowDropdown(false);
                        }
                      }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div
              className="border-[3px] border-b-0 border-[var(--black)] px-4 py-2 flex items-center justify-between"
              style={{ background: "var(--cardinal)" }}
            >
              <div>
                <span className="font-display text-sm text-white">
                  {selectedCourse.dept} {selectedCourse.number}
                </span>
                <span className="font-mono text-[11px] text-white/70 ml-2">
                  {selectedCourse.title}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedCourse(null);
                  setProfessors([]);
                  setInput("");
                }}
                className="font-mono text-[10px] text-white/70 hover:text-white"
              >
                CHANGE
              </button>
            </div>
            <ReviewForm
              dept={selectedCourse.dept}
              courseNumber={selectedCourse.number}
              professors={professors}
              onSubmitted={() => {}}
              onClose={onClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}
