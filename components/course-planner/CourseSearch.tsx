'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePlanner } from '@/lib/course-planner/store'

export default function CourseSearch() {
  const { state, dispatch } = usePlanner()
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
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

  const fetchAutocomplete = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/courses/autocomplete?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setSuggestions(data.map((d: { text?: string } | string) => (typeof d === 'string' ? d : d.text || '')).filter(Boolean).slice(0, 8))
        setShowDropdown(true)
      }
    } catch {
      // aborted or network error
    }
  }, [])

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) return
    dispatch({ type: 'SET_SEARCH_QUERY', query })
    dispatch({ type: 'SET_SEARCHING', isSearching: true })
    dispatch({ type: 'SET_EXPANDED_COURSE', course: null })
    setShowDropdown(false)

    try {
      const res = await fetch(
        `/api/courses/search?q=${encodeURIComponent(query)}&semester=${state.semester}`
      )
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      dispatch({ type: 'SET_SEARCH_RESULTS', results: Array.isArray(data) ? data : [] })
    } catch {
      dispatch({ type: 'SET_SEARCH_RESULTS', results: [] })
      dispatch({ type: 'SET_ERROR', error: 'SEARCH FAILED — RETRY' })
    }
  }, [dispatch, state.semester])

  function handleInput(val: string) {
    setInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchAutocomplete(val), 300)
  }

  function handleSelect(text: string) {
    setInput(text)
    setShowDropdown(false)
    doSearch(text)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      doSearch(input)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        placeholder="SEARCH COURSES... (e.g. CSCI 201)"
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        className="brutal-input w-full"
      />

      {showDropdown && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((text, i) => (
            <div
              key={i}
              className="autocomplete-item"
              onClick={() => handleSelect(text)}
            >
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
