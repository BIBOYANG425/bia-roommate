'use client'

import { useState } from 'react'
import type { RecommendedCourse } from '@/lib/course-planner/recommender'

const QUICK_TAGS = [
  'Animation', 'Film', 'Coding', 'AI', 'Music', 'Psychology',
  'Business', 'Writing', 'Art', 'History', 'Social Justice',
  'Biology', 'Data Science', 'Philosophy', 'Theater',
]

interface InterestInputProps {
  semester: string
  onResults: (results: RecommendedCourse[]) => void
}

export default function InterestInput({ semester, onResults }: InterestInputProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (input.trim().length < 2) {
      setError('TRY DESCRIBING SPECIFIC TOPICS LIKE "PSYCHOLOGY, FILM, CODING"')
      return
    }
    setLoading(true)
    setError(null)
    setProgress(20)

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 8, 85))
      }, 400)

      const res = await fetch('/api/courses/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: input, semester }),
      })

      clearInterval(progressInterval)
      setProgress(95)

      if (!res.ok) {
        setError('FAILED TO FIND COURSES — TRY DIFFERENT KEYWORDS')
        setLoading(false)
        return
      }

      const data: RecommendedCourse[] = await res.json()
      setProgress(100)

      if (data.length === 0) {
        setError('NO MATCHING COURSES FOUND — TRY BROADER TOPICS')
        setLoading(false)
        return
      }

      onResults(data)
    } catch {
      setError('NETWORK ERROR — PLEASE TRY AGAIN')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  function addTag(tag: string) {
    setInput((prev) => {
      const trimmed = prev.trim()
      if (trimmed.toLowerCase().includes(tag.toLowerCase())) return prev
      return trimmed ? `${trimmed}, ${tag.toLowerCase()}` : tag.toLowerCase()
    })
    setError(null)
  }

  return (
    <div>
      {/* Text input */}
      <textarea
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(null) }}
        placeholder="Describe your interests, hobbies, or topics you'd like to explore... (e.g., Japanese animation, social justice, and coding)"
        rows={3}
        className="w-full px-4 py-3 text-sm border-[2px] outline-none transition-colors resize-none"
        style={{
          borderColor: 'var(--beige)',
          background: 'white',
          color: 'var(--black)',
          borderRadius: '4px',
          fontFamily: 'var(--font-body), monospace',
        }}
        disabled={loading}
      />

      {/* Quick tags */}
      <div className="flex flex-wrap gap-2 mt-3 mb-4">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => addTag(tag)}
            disabled={loading}
            className="px-3 py-1 text-xs font-display tracking-wider border-[1.5px] transition-all hover:translate-y-[-1px]"
            style={{
              borderColor: 'var(--beige)',
              background: input.toLowerCase().includes(tag.toLowerCase()) ? 'var(--gold)' : 'white',
              color: 'var(--black)',
              borderRadius: '20px',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs mb-3 font-display tracking-wider" style={{ color: 'var(--cardinal)' }}>
          {error}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="mb-4">
          <div
            className="w-full h-2 border-[1.5px] border-[var(--black)]"
            style={{ background: 'var(--cream)', borderRadius: '2px' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, background: 'var(--cardinal)', borderRadius: '1px' }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--mid)' }}>
            Searching 5000+ courses for your interests...
          </p>
        </div>
      )}

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={loading || input.trim().length < 2}
        className="w-full py-3 font-display text-base tracking-wider text-white border-[3px] border-[var(--black)] transition-all hover:translate-y-[-2px]"
        style={{
          background: 'var(--cardinal)',
          boxShadow: '3px 3px 0 var(--black)',
          opacity: loading || input.trim().length < 2 ? 0.6 : 1,
          borderRadius: '4px',
        }}
      >
        {loading ? 'SEARCHING...' : 'FIND MATCHING COURSES →'}
      </button>
    </div>
  )
}
