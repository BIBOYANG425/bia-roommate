'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AgentRecommendation } from '@/lib/course-planner/agent'

// ─── Types for SSE events ───
type AgentEvent =
  | { type: 'thinking'; message: string }
  | { type: 'reasoning'; step: 'interpreter' | 'recommender'; content: string }
  | { type: 'interpreted'; data: { interests: string[]; preferences: string[]; dealbreakers: string[]; departments: string[]; geCategories: string[] } }
  | { type: 'researching'; source: 'catalog' | 'rmp' | 'reddit'; message: string }
  | { type: 'research_done'; source: 'catalog' | 'rmp' | 'reddit'; message: string }
  | { type: 'recommending'; message: string }
  | { type: 'results'; data: AgentRecommendation[] }
  | { type: 'error'; message: string; isRejection?: boolean }

interface ChatMessage {
  id: string
  role: 'agent' | 'status' | 'reasoning' | 'result'
  content: string
  source?: 'catalog' | 'rmp' | 'reddit'
  step?: 'interpreter' | 'recommender'
  done?: boolean
  data?: AgentEvent
}

interface AgentChatProps {
  interests: string
  semester: string
  unitsFilter: string | null
  thinking: boolean
  onResults: (results: AgentRecommendation[]) => void
  onBack: () => void
}

// ─── Source label styling ───
const SOURCE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  catalog: { bg: 'color-mix(in srgb, var(--cardinal) 12%, white)', color: 'var(--cardinal)', label: 'USC CATALOG' },
  rmp: { bg: 'color-mix(in srgb, #2E7D32 12%, white)', color: '#2E7D32', label: 'RATEMYPROF' },
  reddit: { bg: 'color-mix(in srgb, #FF4500 12%, white)', color: '#FF4500', label: 'r/USC' },
}

// ─── Expandable Course Card ───
function CourseCard({
  rec,
  onAdd,
  isAdded,
  canAdd,
}: {
  rec: AgentRecommendation
  onAdd: () => void
  isAdded: boolean
  canAdd: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const hasDetails = rec.aiReasoning || (rec.communityHighlights?.length > 0) || rec.topInstructor

  return (
    <div
      className="border-[2px] transition-all"
      style={{
        borderColor: isAdded ? 'var(--cardinal)' : 'var(--beige)',
        background: isAdded ? 'color-mix(in srgb, var(--cardinal) 4%, white)' : 'white',
        borderRadius: '4px',
      }}
    >
      {/* Header row */}
      <div className="p-4 flex gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-display text-base tracking-wider" style={{ color: 'var(--cardinal)' }}>
              {rec.department} {rec.number}
            </span>
            {rec.geTag && (
              <span
                className="px-2 py-0.5 text-[10px] font-display tracking-wider"
                style={{ background: 'var(--gold)', color: 'var(--black)', borderRadius: '3px' }}
              >
                {rec.geTag}
              </span>
            )}
            {rec.units && (
              <span className="text-[10px]" style={{ color: 'var(--mid)' }}>
                {rec.units} units
              </span>
            )}
            <span
              className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
              style={{ background: 'var(--cardinal)', color: 'white', borderRadius: '3px' }}
            >
              {rec.relevanceScore?.toFixed(1)}/10
            </span>
          </div>

          <p className="text-sm mb-1" style={{ color: 'var(--black)' }}>
            {rec.title}
          </p>

          {/* Compact preview of why */}
          {rec.aiReasoning && (
            <p className="text-xs line-clamp-2" style={{ color: 'var(--mid)' }}>
              {rec.aiReasoning}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <button
            onClick={onAdd}
            disabled={isAdded || !canAdd}
            className="px-3 py-2 text-xs font-display tracking-wider border-[2px] transition-all"
            style={{
              borderColor: isAdded ? 'var(--cardinal)' : 'var(--black)',
              background: isAdded ? 'var(--cardinal)' : 'white',
              color: isAdded ? 'white' : 'var(--black)',
              borderRadius: '4px',
              opacity: isAdded || !canAdd ? 0.6 : 1,
            }}
          >
            {isAdded ? 'ADDED' : '+ ADD'}
          </button>
        </div>
      </div>

      {/* Expand/collapse toggle */}
      {hasDetails && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 text-[11px] font-display tracking-wider text-left flex items-center gap-1 transition-colors hover:bg-[color-mix(in_srgb,var(--beige)_20%,white)]"
          style={{ color: 'var(--cardinal)', borderTop: '1px solid var(--beige)' }}
        >
          <span style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
            &#9656;
          </span>
          {expanded ? 'HIDE DETAILS' : 'WHY THIS COURSE? — VIEW AI REASONING & SOURCES'}
        </button>
      )}

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div
          className="px-4 pb-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--beige)' }}
        >
          {/* AI Reasoning */}
          {rec.aiReasoning && (
            <div className="pt-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
                  style={{ background: 'color-mix(in srgb, var(--cardinal) 12%, white)', color: 'var(--cardinal)', borderRadius: '2px' }}
                >
                  AI ANALYSIS
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--black)' }}>
                {rec.aiReasoning}
              </p>
            </div>
          )}

          {/* Course description */}
          {rec.description && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
                  style={{ ...SOURCE_STYLES.catalog, borderRadius: '2px' }}
                >
                  {SOURCE_STYLES.catalog.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mid)' }}>
                {rec.description}
              </p>
            </div>
          )}

          {/* Top instructor (RMP) */}
          {rec.topInstructor && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
                  style={{ ...SOURCE_STYLES.rmp, borderRadius: '2px' }}
                >
                  {SOURCE_STYLES.rmp.label}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--black)' }}>
                <strong>{rec.topInstructor.name}</strong>{' '}
                <span style={{ color: rec.topInstructor.rating >= 4 ? '#2E7D32' : rec.topInstructor.rating >= 3 ? '#F9A825' : '#C62828' }}>
                  ★ {rec.topInstructor.rating.toFixed(1)}/5
                </span>
              </p>
            </div>
          )}

          {/* Community highlights (Reddit / RMP comments) */}
          {rec.communityHighlights.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
                  style={{ ...SOURCE_STYLES.reddit, borderRadius: '2px' }}
                >
                  COMMUNITY
                </span>
              </div>
              {rec.communityHighlights.map((h, j) => {
                const isRMP = h.startsWith('Best prof:') || h.toLowerCase().includes('rmp')
                const cleanText = h.replace(/^(Reddit|RMP|r\/USC):\s*/i, '').trim()
                return (
                  <p key={j} className="text-xs mb-1" style={{ color: 'var(--mid)' }}>
                    <span className="text-[9px] font-display" style={{ color: isRMP ? '#2E7D32' : '#FF4500' }}>
                      {isRMP ? '[RMP]' : '[Reddit]'}
                    </span>{' '}
                    &ldquo;{cleanText}&rdquo;
                  </p>
                )
              })}
            </div>
          )}

          {/* Match reasons */}
          {rec.matchReasons.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {rec.matchReasons.slice(0, 5).map((reason) => (
                <span
                  key={reason}
                  className="px-2 py-0.5 text-[10px]"
                  style={{
                    background: 'color-mix(in srgb, var(--gold) 30%, white)',
                    color: 'var(--black)',
                    borderRadius: '10px',
                  }}
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Reasoning Trace (collapsible) ───
function ReasoningTrace({ step, content }: { step: 'interpreter' | 'recommender'; content: string }) {
  const [expanded, setExpanded] = useState(false)
  const label = step === 'interpreter' ? 'INTERPRETER THINKING' : 'RECOMMENDER THINKING'

  return (
    <div
      className="border-[1.5px] my-1"
      style={{
        borderColor: 'color-mix(in srgb, var(--gold) 50%, var(--beige))',
        background: 'color-mix(in srgb, var(--gold) 8%, white)',
        borderRadius: '4px',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-1.5 flex items-center gap-2 text-left"
      >
        <span className="text-[13px]">🧠</span>
        <span className="text-[10px] font-display tracking-wider" style={{ color: 'var(--mid)' }}>
          {label}
        </span>
        <span
          className="text-[10px] ml-auto"
          style={{ color: 'var(--mid)', transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', display: 'inline-block' }}
        >
          &#9656;
        </span>
      </button>
      {expanded && (
        <div
          className="px-3 pb-2 text-[11px] leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--mid)', borderTop: '1px solid color-mix(in srgb, var(--gold) 30%, var(--beige))' }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// ─── Main AgentChat Component ───
export default function AgentChat({ interests, semester, unitsFilter, thinking, onResults, onBack }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [results, setResults] = useState<AgentRecommendation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, results])

  // Start SSE stream on mount
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    let msgId = 0

    async function runStream() {
      try {
        const res = await fetch('/api/courses/agent-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interests, semester, units: unitsFilter, thinking }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          setError(errData?.error || 'Failed to start AI search')
          return
        }

        const reader = res.body?.getReader()
        if (!reader) { setError('Streaming not supported'); return }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') continue

            try {
              const event = JSON.parse(payload) as AgentEvent
              const id = String(++msgId)

              switch (event.type) {
                case 'thinking':
                  addMessage({ id, role: 'agent', content: event.message })
                  break
                case 'reasoning':
                  addMessage({ id, role: 'reasoning', content: event.content, step: event.step })
                  break
                case 'interpreted':
                  addMessage({
                    id,
                    role: 'agent',
                    content: formatInterpretation(event.data),
                    data: event,
                  })
                  break
                case 'researching':
                  addMessage({ id, role: 'status', content: event.message, source: event.source })
                  break
                case 'research_done':
                  addMessage({ id, role: 'status', content: event.message, source: event.source, done: true })
                  break
                case 'recommending':
                  addMessage({ id, role: 'agent', content: event.message })
                  break
                case 'results':
                  setResults(event.data)
                  onResults(event.data)
                  break
                case 'error':
                  setError(event.message)
                  break
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setError('Connection lost — please try again')
      }
    }

    runStream()

    return () => { controller.abort() }
  }, [interests, semester, unitsFilter, thinking, addMessage, onResults])

  function toggleCourse(id: string) {
    setSelectedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 6) next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '60vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { abortRef.current?.abort(); onBack() }}
          className="font-display text-sm tracking-wider hover:underline"
          style={{ color: 'var(--cardinal)' }}
        >
          ← BACK
        </button>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-[9px] font-display tracking-wider"
            style={{ background: 'var(--cardinal)', color: 'white', borderRadius: '3px' }}
          >
            AI AGENT
          </span>
          <span className="text-xs" style={{ color: 'var(--mid)' }}>
            Researching courses for you
          </span>
        </div>
      </div>

      {/* User query bubble */}
      <div className="flex justify-end mb-3">
        <div
          className="px-4 py-2.5 max-w-[80%] text-sm border-[2px]"
          style={{
            borderColor: 'var(--black)',
            background: 'var(--cardinal)',
            color: 'white',
            borderRadius: '12px 12px 2px 12px',
          }}
        >
          {interests}
        </div>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex flex-col gap-2 mb-4 flex-1">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'reasoning' ? (
              // Thinking trace — collapsible
              <ReasoningTrace step={msg.step || 'interpreter'} content={msg.content} />
            ) : msg.role === 'status' ? (
              // Research status message
              <div className="flex items-center gap-2 py-1 px-1">
                {msg.source && SOURCE_STYLES[msg.source] && (
                  <span
                    className="px-1.5 py-0.5 text-[9px] font-display tracking-wider flex-shrink-0"
                    style={{ background: SOURCE_STYLES[msg.source].bg, color: SOURCE_STYLES[msg.source].color, borderRadius: '2px' }}
                  >
                    {SOURCE_STYLES[msg.source].label}
                  </span>
                )}
                <span className="text-xs" style={{ color: msg.done ? 'var(--black)' : 'var(--mid)' }}>
                  {msg.done ? '✓ ' : ''}{msg.content}
                </span>
              </div>
            ) : (
              // Agent message bubble
              <div className="flex justify-start">
                <div
                  className="px-4 py-2.5 max-w-[90%] text-xs leading-relaxed border-[1.5px]"
                  style={{
                    borderColor: 'var(--beige)',
                    background: 'white',
                    color: 'var(--black)',
                    borderRadius: '2px 12px 12px 12px',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator when no results yet and no error */}
        {!results && !error && messages.length > 0 && (
          <div className="flex items-center gap-2 py-2 px-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cardinal)', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cardinal)', animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cardinal)', animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="px-4 py-3 border-[2px] text-xs"
            style={{ borderColor: 'var(--cardinal)', background: 'color-mix(in srgb, var(--cardinal) 8%, white)', color: 'var(--cardinal)', borderRadius: '4px' }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Results cards */}
      {results && results.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display text-lg tracking-wider" style={{ color: 'var(--black)' }}>
              TOP {results.length} COURSES
            </h3>
            <span
              className="px-2 py-0.5 text-[9px] font-display tracking-wider"
              style={{ background: 'var(--cardinal)', color: 'white', borderRadius: '3px' }}
            >
              AI
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--mid)' }}>
            Tap a card to expand AI reasoning and source citations.
          </p>

          <div className="flex flex-col gap-3 mb-4">
            {results.map((rec, i) => {
              const courseId = `${rec.department}-${rec.number}`
              return (
                <CourseCard
                  key={`${courseId}-${i}`}
                  rec={rec}
                  onAdd={() => toggleCourse(courseId)}
                  isAdded={selectedCourses.has(courseId)}
                  canAdd={selectedCourses.size < 6}
                />
              )
            })}
          </div>

          {/* Action: pass selected courses back */}
          {selectedCourses.size > 0 && (
            <button
              onClick={() => {
                if (results) {
                  const selected = results.filter((r) => selectedCourses.has(`${r.department}-${r.number}`))
                  if (selected.length > 0) onResults(selected)
                }
                onBack()
              }}
              className="w-full py-4 font-display text-lg tracking-wider text-white border-[3px] border-[var(--black)] transition-all hover:translate-y-[-2px]"
              style={{ background: 'var(--cardinal)', boxShadow: '4px 4px 0 var(--black)' }}
            >
              CONTINUE WITH {selectedCourses.size} SELECTED →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ───
function formatInterpretation(data: {
  interests: string[]
  preferences: string[]
  dealbreakers: string[]
  departments: string[]
  geCategories: string[]
}): string {
  const parts: string[] = []

  if (data.interests.length > 0) {
    parts.push(`Interests: ${data.interests.join(', ')}`)
  }
  if (data.preferences.length > 0) {
    parts.push(`Looking for: ${data.preferences.join(', ')}`)
  }
  if (data.dealbreakers.length > 0) {
    parts.push(`Avoiding: ${data.dealbreakers.join(', ')}`)
  }
  if (data.departments.length > 0) {
    parts.push(`Departments: ${data.departments.join(', ')}`)
  }
  if (data.geCategories.length > 0) {
    parts.push(`GE categories: ${data.geCategories.join(', ')}`)
  }

  return parts.length > 0
    ? `Got it! Here's what I understood:\n${parts.join('\n')}`
    : 'Understood your request. Searching now...'
}
