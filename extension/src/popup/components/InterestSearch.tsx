import { useState, useRef, useEffect } from 'react'
import type { RecommendedCourse } from '../../shared/types'

const QUICK_TAGS = [
  'Animation', 'Film', 'Coding', 'AI',
  'Music', 'Psychology', 'Business', 'Art',
  'Math', 'Biology', 'Writing', 'Japanese',
]

export function InterestSearch() {
  const [interests, setInterests] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [semester, setSemester] = useState('20263')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    chrome.storage.local.get('settings').then((stored) => {
      if (stored.settings?.semester) setSemester(stored.settings.semester)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
        setInterests((i) => {
          const parts = i.split(',').map((s) => s.trim()).filter(Boolean)
          return parts.filter((p) => p.toLowerCase() !== tag.toLowerCase()).join(', ')
        })
      } else {
        next.add(tag)
        setInterests((i) => (i ? `${i}, ${tag.toLowerCase()}` : tag.toLowerCase()))
      }
      return next
    })
  }

  async function handleSearch() {
    const text = interests.trim()
    if (text.length < 2) {
      setError('Try describing specific topics like "psychology, film, coding"')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RECOMMEND',
        interests: text,
        semester,
      })

      if (controller.signal.aborted) return

      if (response?.type === 'ERROR') {
        throw new Error(response.error)
      }

      if (response?.type === 'RECOMMEND_RESULT') {
        setRecommendations(response.recommendations)
        if (response.recommendations.length === 0) {
          setError('No matching courses found. Try different keywords.')
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setError((err as Error).message || 'Failed to search')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="section-title">What are you interested in?</p>

      <textarea
        className="interest-textarea"
        placeholder="e.g., Japanese animation, social justice, coding..."
        value={interests}
        onChange={(e) => setInterests(e.target.value)}
        aria-label="Describe your interests"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSearch()
          }
        }}
      />

      <div className="quick-tags">
        {QUICK_TAGS.map((tag) => {
          const isSelected = selectedTags.has(tag)
          return (
            <button
              key={tag}
              type="button"
              className={`quick-tag ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleTag(tag)}
              aria-pressed={isSelected}
            >
              {tag}
            </button>
          )
        })}
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        className="btn-primary"
        onClick={handleSearch}
        disabled={loading || interests.trim().length < 2}
        style={{ marginBottom: 12 }}
      >
        {loading ? 'Searching...' : 'Find Matching Courses'}
      </button>

      {loading && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '60%' }} />
        </div>
      )}

      {recommendations.length > 0 && (
        <>
          <p className="section-title">
            Found {recommendations.length} courses for you
          </p>
          {recommendations.map((rec) => (
            <div key={`${rec.department}-${rec.number}`} className="course-card">
              <div className="course-card-header">
                <span className="course-card-id">
                  {rec.department} {rec.number}
                </span>
                <a
                  className="link-button"
                  href={`https://classes.usc.edu/term-${semester}/course/${rec.department.toLowerCase()}-${rec.number}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in WebReg →
                </a>
              </div>
              <div className="course-card-title">{rec.title}</div>
              <div className="course-card-meta">
                <span>{rec.units} units</span>
                {rec.geTag && <span className="ge-tag">{rec.geTag}</span>}
              </div>
              <div style={{ marginTop: 4 }}>
                {rec.matchReasons.map((reason) => (
                  <span key={reason} className="match-tag">{reason}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
