'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface CourseSearchProps {
  onSelect: (id: string, label: string) => void
  semester: string
}

export default function CourseSearch({ onSelect, semester }: CourseSearchProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      // First try autocomplete
      const res = await fetch(`/api/courses/autocomplete?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (!res.ok) return
      const data = await res.json()

      if (Array.isArray(data)) {
        const items = data
          .map((d: { text?: string } | string) => {
            const text = typeof d === 'string' ? d : d.text || ''
            if (!text) return null
            // Try to parse "DEPT-NUM Title" format
            const match = text.match(/^([A-Z]+-\d+[A-Z]?)\s+(.+)$/i)
            if (match) {
              return { id: match[1], label: text }
            }
            // Department match
            const deptMatch = text.match(/^([A-Z]+)\s*[-—]\s*(.+)$/i)
            if (deptMatch) {
              return { id: deptMatch[1], label: text }
            }
            return { id: text, label: text }
          })
          .filter(Boolean) as { id: string; label: string }[]

        setSuggestions(items.slice(0, 8))
        setShowDropdown(true)
      }

      // Also try search if it looks like a course
      if (q.length >= 3) {
        const searchRes = await fetch(
          `/api/courses/search?q=${encodeURIComponent(q)}&semester=${semester}`,
          { signal: controller.signal }
        )
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          if (Array.isArray(searchData) && searchData.length > 0) {
            const searchItems = searchData.slice(0, 5).map((r: { department: string; number: string; title: string }) => ({
              id: `${r.department}-${r.number}`,
              label: `${r.department} ${r.number} — ${r.title}`,
            }))
            setSuggestions((prev) => {
              const ids = new Set(prev.map((p) => p.id))
              const merged = [...prev]
              for (const item of searchItems) {
                if (!ids.has(item.id)) merged.push(item)
              }
              return merged.slice(0, 8)
            })
            setShowDropdown(true)
          }
        }
      }
    } catch {
      // aborted or network error
    }
  }, [semester])

  function handleInput(val: string) {
    setInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  function handleSelect(item: { id: string; label: string }) {
    onSelect(item.id, item.label)
    setInput('')
    setSuggestions([])
    setShowDropdown(false)
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
          borderColor: 'var(--beige)',
          background: 'white',
          color: 'var(--black)',
          borderRadius: '4px',
          fontFamily: 'var(--font-body), monospace',
        }}
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-20 max-h-64 overflow-y-auto border-[2px] border-t-0"
          style={{
            borderColor: 'var(--beige)',
            background: 'white',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {suggestions.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-[var(--cream)]"
              style={{ borderBottom: '1px solid var(--beige)', color: 'var(--black)' }}
              onClick={() => handleSelect(item)}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
