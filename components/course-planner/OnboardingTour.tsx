'use client'

import { useState, useEffect, useCallback } from 'react'

const STEPS = [
  {
    title: 'WELCOME TO BIA 选课',
    subtitle: 'YOUR USC COURSE PLANNING ASSISTANT',
    description:
      'Build your perfect schedule in minutes. We rank sections by professor ratings, detect time conflicts, and generate optimized schedules — so you can spend less time on WebReg and more time on everything else.',
    icon: '🎓',
    visual: 'hero',
  },
  {
    title: 'SEARCH COURSES',
    subtitle: 'STEP 1 — FIND WHAT YOU NEED',
    description:
      'Type a course code like "CSCI 104", a department like "ECON", or a keyword like "machine learning". We search across all USC offerings for the semester and show matches instantly.',
    icon: '🔍',
    visual: 'search',
  },
  {
    title: 'GE REQUIREMENTS',
    subtitle: 'STEP 1 (ALT) — FILL YOUR GEs',
    description:
      'Click any GE category (A through H) to browse all courses that fulfill it. Great for knocking out requirements while picking interesting electives.',
    icon: '📋',
    visual: 'ge',
  },
  {
    title: 'DISCOVER BY INTEREST',
    subtitle: 'STEP 1 (ALT) — DON\'T KNOW WHAT TO TAKE?',
    description:
      'Switch to "Discover" mode and describe your interests — like "Japanese animation, social justice, and coding". Our system scans 5,000+ courses and finds the best matches with relevance tags. You can also filter by unit count to narrow results.',
    icon: '✨',
    visual: 'discover',
  },
  {
    title: 'SET PREFERENCES',
    subtitle: 'STEP 2 — CUSTOMIZE YOUR SCHEDULE',
    description:
      'Pick your earliest class time, when you want to be done, and whether you prefer back-to-back classes or gaps between them. We optimize around your lifestyle.',
    icon: '⚙️',
    visual: 'prefs',
  },
  {
    title: 'BUILD BEST SCHEDULE',
    subtitle: 'STEP 3 — ONE CLICK, FIVE OPTIONS',
    description:
      'Hit "Build" and we generate up to 5 conflict-free schedules ranked by RateMyProfessors ratings. Each shows a visual weekly calendar so you can compare at a glance.',
    icon: '📅',
    visual: 'build',
  },
  {
    title: 'PROFESSOR RATINGS',
    subtitle: 'BUILT-IN RMP INTEGRATION',
    description:
      'Every section shows the instructor\'s RateMyProfessors rating, difficulty score, and "would take again" percentage. Color-coded green/yellow/red so you can decide instantly.',
    icon: '⭐',
    visual: 'rmp',
  },
  {
    title: 'CHROME EXTENSION',
    subtitle: 'SUPERCHARGE WEBREG',
    description:
      'Install the BIA Course Helper extension to see RMP ratings, seat counts, and conflict highlights directly on WebReg. Plus a built-in optimizer and interest search — all without leaving the page.',
    icon: '🧩',
    visual: 'extension',
  },
] as const

function StepVisual({ visual }: { visual: string }) {
  const box = (content: React.ReactNode) => (
    <div
      className="w-full border-[3px] border-[var(--black)] p-4 mt-4"
      style={{ background: 'white', boxShadow: '4px 4px 0 var(--black)' }}
    >
      {content}
    </div>
  )

  switch (visual) {
    case 'hero':
      return box(
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex gap-2">
            {['CSCI 270', 'ECON 205', 'GE-A', 'WRIT 150'].map((c) => (
              <span
                key={c}
                className="px-3 py-1 text-xs font-display tracking-wider border-[2px] border-[var(--black)]"
                style={{ background: 'var(--gold)' }}
              >
                {c}
              </span>
            ))}
          </div>
          <div className="text-3xl">↓</div>
          <div className="flex gap-1">
            {['M', 'T', 'W', 'TH', 'F'].map((d) => (
              <div key={d} className="w-12 text-center">
                <div className="text-[10px] font-display tracking-wider mb-1" style={{ color: 'var(--mid)' }}>{d}</div>
                <div
                  className="h-16 border-[2px] border-[var(--black)] flex items-center justify-center text-[9px] font-display"
                  style={{ background: d === 'T' || d === 'TH' ? 'var(--cardinal)' : d === 'W' ? 'var(--gold)' : '#F5F3EE', color: d === 'T' || d === 'TH' ? 'white' : 'var(--black)' }}
                >
                  {d === 'T' || d === 'TH' ? 'CSCI' : d === 'W' ? 'ECON' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )

    case 'search':
      return box(
        <div className="flex flex-col gap-2">
          <div
            className="px-3 py-2 border-[2px] border-[var(--black)] text-sm"
            style={{ background: '#F5F3EE', color: 'var(--mid)' }}
          >
            <span style={{ color: 'var(--black)' }}>CSCI 10</span>
            <span className="animate-pulse">|</span>
          </div>
          <div className="flex flex-col gap-1">
            {[
              { code: 'CSCI 102', title: 'Fundamentals of Computation' },
              { code: 'CSCI 103', title: 'Introduction to Programming' },
              { code: 'CSCI 104', title: 'Data Structures and OOP' },
            ].map((c) => (
              <div
                key={c.code}
                className="px-3 py-2 border-[2px] border-[var(--beige)] flex items-center justify-between"
                style={{ background: 'white' }}
              >
                <div>
                  <span className="font-display text-sm tracking-wider" style={{ color: 'var(--cardinal)' }}>{c.code}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--mid)' }}>{c.title}</span>
                </div>
                <span className="text-xs font-display" style={{ color: 'var(--cardinal)' }}>+ ADD</span>
              </div>
            ))}
          </div>
        </div>
      )

    case 'ge':
      return box(
        <div className="grid grid-cols-4 gap-2">
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((cat, i) => (
            <div
              key={cat}
              className="py-3 border-[2px] border-[var(--black)] text-center font-display text-sm tracking-wider cursor-default"
              style={{
                background: i === 0 ? 'var(--cardinal)' : 'white',
                color: i === 0 ? 'white' : 'var(--black)',
                boxShadow: i === 0 ? '3px 3px 0 var(--black)' : 'none',
              }}
            >
              GE-{cat}
            </div>
          ))}
        </div>
      )

    case 'discover':
      return box(
        <div className="flex flex-col gap-3">
          <div
            className="px-3 py-2 border-[2px] border-[var(--black)] text-sm"
            style={{ background: '#F5F3EE' }}
          >
            Japanese animation, social justice, coding
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {['Animation', 'Film', 'Coding', 'AI', 'Music', 'Psychology'].map((tag, i) => (
              <span
                key={tag}
                className="px-2 py-1 text-[10px] font-display tracking-wider border-[2px]"
                style={{
                  borderColor: 'var(--black)',
                  background: i === 0 || i === 2 ? 'var(--cardinal)' : 'white',
                  color: i === 0 || i === 2 ? 'white' : 'var(--black)',
                }}
              >
                {tag}
              </span>
            ))}
            <span
              className="ml-auto px-2 py-1 text-[10px] font-display tracking-wider border-[2px] border-[var(--black)]"
              style={{ background: 'var(--gold)' }}
            >
              4 UNITS
            </span>
          </div>
          <div
            className="px-3 py-2 border-[2px] flex items-center justify-between"
            style={{ borderColor: 'var(--cardinal)', background: 'color-mix(in srgb, var(--cardinal) 4%, white)' }}
          >
            <div>
              <span className="font-display text-xs tracking-wider" style={{ color: 'var(--cardinal)' }}>CTAN 230</span>
              <span className="text-[10px] ml-2" style={{ color: 'var(--mid)' }}>Intro to Animation</span>
            </div>
            <span
              className="px-2 py-0.5 text-[9px]"
              style={{ background: 'color-mix(in srgb, var(--gold) 30%, white)', borderRadius: 10 }}
            >
              animation
            </span>
          </div>
        </div>
      )

    case 'prefs':
      return box(
        <div className="flex flex-col gap-3">
          {[
            { label: 'EARLIEST CLASS', value: '10:00 AM' },
            { label: 'DONE BY', value: '4:00 PM' },
          ].map((p) => (
            <div key={p.label} className="flex items-center justify-between">
              <span className="font-display text-xs tracking-wider" style={{ color: 'var(--black)' }}>{p.label}</span>
              <span
                className="px-3 py-1 text-xs border-[2px] border-[var(--black)] font-display"
                style={{ background: 'var(--gold)' }}
              >
                {p.value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="font-display text-xs tracking-wider" style={{ color: 'var(--black)' }}>BACK-TO-BACK</span>
            <div
              className="w-10 h-5 border-[2px] border-[var(--black)] relative"
              style={{ background: 'var(--cardinal)', borderRadius: 10 }}
            >
              <div
                className="absolute w-4 h-4 border-[2px] border-[var(--black)] top-[1px]"
                style={{ background: 'white', borderRadius: '50%', right: 1 }}
              />
            </div>
          </div>
        </div>
      )

    case 'build':
      return box(
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 mb-1">
            {['SCHEDULE 1', 'SCHEDULE 2', 'SCHEDULE 3'].map((s, i) => (
              <span
                key={s}
                className="px-3 py-1 text-[10px] font-display tracking-wider border-[2px] border-[var(--black)]"
                style={{ background: i === 0 ? 'var(--cardinal)' : 'white', color: i === 0 ? 'white' : 'var(--black)' }}
              >
                {s}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {['M', 'T', 'W', 'TH', 'F'].map((d) => (
              <div key={d} className="flex-1 text-center">
                <div className="text-[9px] font-display tracking-wider mb-1" style={{ color: 'var(--mid)' }}>{d}</div>
                <div className="flex flex-col gap-0.5">
                  {(d === 'M' || d === 'W') && (
                    <>
                      <div className="h-5 text-[8px] font-display flex items-center justify-center border border-[var(--black)]" style={{ background: '#E8D5B7' }}>ECON</div>
                      <div className="h-7 text-[8px] font-display flex items-center justify-center border border-[var(--black)]" style={{ background: 'var(--gold)' }}>WRIT</div>
                    </>
                  )}
                  {(d === 'T' || d === 'TH') && (
                    <>
                      <div className="h-7 text-[8px] font-display flex items-center justify-center border border-[var(--black)]" style={{ background: 'color-mix(in srgb, var(--cardinal) 20%, white)' }}>CSCI</div>
                      <div className="h-5 text-[8px] font-display flex items-center justify-center border border-[var(--black)]" style={{ background: '#C5E0C5' }}>GE-A</div>
                    </>
                  )}
                  {d === 'F' && (
                    <div className="h-5 text-[8px] font-display flex items-center justify-center border border-[var(--black)]" style={{ background: '#D5CCE5' }}>DIS</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )

    case 'rmp':
      return box(
        <div className="flex flex-col gap-2">
          {[
            { prof: 'Dr. Smith', rating: '4.8', color: '#22c55e', diff: '2.1', again: '97%' },
            { prof: 'Dr. Johnson', rating: '3.5', color: '#eab308', diff: '3.4', again: '72%' },
            { prof: 'Dr. Lee', rating: '2.1', color: '#ef4444', diff: '4.5', again: '31%' },
          ].map((p) => (
            <div key={p.prof} className="flex items-center gap-3 px-3 py-2 border-[2px] border-[var(--beige)]">
              <div
                className="w-9 h-9 flex items-center justify-center font-display text-sm text-white border-[2px] border-[var(--black)]"
                style={{ background: p.color }}
              >
                {p.rating}
              </div>
              <div className="flex-1">
                <div className="text-sm font-display" style={{ color: 'var(--black)' }}>{p.prof}</div>
                <div className="text-[10px]" style={{ color: 'var(--mid)' }}>
                  Difficulty: {p.diff} · Would take again: {p.again}
                </div>
              </div>
            </div>
          ))}
        </div>
      )

    case 'extension':
      return box(
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex gap-4">
            {[
              { label: 'RMP BADGES', desc: 'Inline ratings' },
              { label: 'SEAT COUNTS', desc: 'Live enrollment' },
              { label: 'CONFLICTS', desc: 'Time overlap alerts' },
            ].map((f) => (
              <div key={f.label} className="text-center">
                <div
                  className="w-14 h-14 mx-auto border-[2px] border-[var(--black)] flex items-center justify-center mb-1"
                  style={{ background: 'var(--gold)' }}
                >
                  <span className="font-display text-[10px] tracking-wider" style={{ color: 'var(--black)' }}>
                    {f.label.split(' ')[0]}
                  </span>
                </div>
                <span className="text-[9px]" style={{ color: 'var(--mid)' }}>{f.desc}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] font-display tracking-wider px-3 py-1 border-[2px] border-[var(--black)]" style={{ background: 'var(--cardinal)', color: 'white' }}>
            INSTALL FROM CHROME WEB STORE
          </div>
        </div>
      )

    default:
      return null
  }
}

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [animating, setAnimating] = useState(false)

  const total = STEPS.length
  const current = STEPS[step]

  const goTo = useCallback((next: number, dir: 'next' | 'prev') => {
    if (animating) return
    setAnimating(true)
    setDirection(dir)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 200)
  }, [animating])

  const next = useCallback(() => {
    if (step < total - 1) goTo(step + 1, 'next')
    else onComplete()
  }, [step, total, goTo, onComplete])

  const prev = useCallback(() => {
    if (step > 0) goTo(step - 1, 'prev')
  }, [step, goTo])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onComplete()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev, onComplete])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26, 20, 16, 0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg border-[3px] border-[var(--black)] relative overflow-hidden"
        style={{ background: '#FAF6EC', boxShadow: '8px 8px 0 var(--black)' }}
      >
        {/* Progress bar */}
        <div className="h-1 w-full" style={{ background: 'var(--beige)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%`, background: 'var(--cardinal)' }}
          />
        </div>

        {/* Skip */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 font-display text-[11px] tracking-wider z-10 hover:underline"
          style={{ color: 'var(--mid)' }}
        >
          SKIP TOUR
        </button>

        {/* Content */}
        <div
          className="px-6 pt-6 pb-4 transition-opacity duration-200"
          style={{ opacity: animating ? 0 : 1 }}
        >
          {/* Step indicator */}
          <div className="text-[10px] font-display tracking-[0.2em] mb-4" style={{ color: 'var(--mid)' }}>
            {step + 1} / {total}
          </div>

          {/* Icon + Title */}
          <div className="flex items-start gap-3 mb-1">
            <span className="text-3xl leading-none">{current.icon}</span>
            <div>
              <h2 className="font-display text-2xl tracking-wider" style={{ color: 'var(--black)' }}>
                {current.title}
              </h2>
              <p className="font-display text-[11px] tracking-[0.15em]" style={{ color: 'var(--cardinal)' }}>
                {current.subtitle}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--mid)' }}>
            {current.description}
          </p>

          {/* Visual */}
          <StepVisual visual={current.visual} />
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-between">
          {/* Dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > step ? 'next' : 'prev')}
                className="w-2 h-2 border-[2px] transition-all"
                style={{
                  borderColor: 'var(--black)',
                  background: i === step ? 'var(--cardinal)' : i < step ? 'var(--gold)' : 'transparent',
                  borderRadius: '50%',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-4 py-2 font-display text-xs tracking-wider border-[2px] border-[var(--black)] transition-all hover:translate-y-[-1px]"
                style={{ background: 'white', color: 'var(--black)' }}
              >
                ← BACK
              </button>
            )}
            <button
              onClick={next}
              className="px-5 py-2 font-display text-xs tracking-wider border-[2px] border-[var(--black)] text-white transition-all hover:translate-y-[-1px]"
              style={{
                background: step === total - 1 ? 'var(--cardinal)' : 'var(--black)',
                boxShadow: '3px 3px 0 var(--cardinal)',
              }}
            >
              {step === total - 1 ? 'GET STARTED →' : 'NEXT →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
