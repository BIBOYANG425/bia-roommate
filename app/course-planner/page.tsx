'use client'

import { useState, useEffect, useCallback } from 'react'
import NavTabs from '@/components/NavTabs'
import SemesterSelector from '@/components/course-planner/SemesterSelector'
import CourseSearch from '@/components/course-planner/CourseSearch'
import GEGrid from '@/components/course-planner/GEGrid'
import SelectedList from '@/components/course-planner/SelectedList'
import SchedulePreferences from '@/components/course-planner/SchedulePreferences'
import ResultsView from '@/components/course-planner/ResultsView'
import InterestInput from '@/components/course-planner/InterestInput'
import OnboardingTour from '@/components/course-planner/OnboardingTour'
import { ScheduleProvider, usePlanner } from '@/lib/course-planner/store'
import Toast from '@/components/Toast'
import type { RecommendedCourse } from '@/lib/course-planner/recommender'

export interface SchedulePrefs {
  earliestClass: string
  doneBy: string
  preferBackToBack: boolean
}

type Mode = 'manual' | 'interest' | 'recommendations' | 'results'

function PlannerContent() {
  const { state, dispatch } = usePlanner()
  const [selectedCourses, setSelectedCourses] = useState<{ id: string; label: string }[]>([])
  const [prefs, setPrefs] = useState<SchedulePrefs>({
    earliestClass: '',
    doneBy: '',
    preferBackToBack: false,
  })
  const [mode, setMode] = useState<Mode>('manual')
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([])
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('bia-tour-seen')
    if (!seen) setShowTour(true)
  }, [])

  const addCourse = useCallback((id: string, label: string) => {
    setSelectedCourses((prev) => {
      if (prev.length >= 6) return prev
      if (prev.some((c) => c.id === id)) return prev
      return [...prev, { id, label }]
    })
    if (mode === 'results') setMode('manual')
  }, [mode])

  const removeCourse = useCallback((id: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== id))
    if (mode === 'results') setMode('manual')
  }, [mode])

  const handleBuild = useCallback(() => {
    if (selectedCourses.length === 0) return
    setMode('results')
  }, [selectedCourses])

  const handleRecommendations = useCallback((results: RecommendedCourse[]) => {
    setRecommendations(results)
    setMode('recommendations')
  }, [])

  return (
    <main className="min-h-screen" style={{ background: '#F5F3EE' }}>
      <NavTabs />

      {showTour && (
        <OnboardingTour
          onComplete={() => {
            setShowTour(false)
            localStorage.setItem('bia-tour-seen', '1')
          }}
        />
      )}

      {/* Header */}
      <div className="border-b-[3px] border-[var(--black)] px-6 py-5" style={{ background: 'var(--cardinal)' }}>
        <div className="max-w-3xl mx-auto text-center relative">
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-1">BIA 选课</h1>
          <p className="text-sm text-white/60">USC COURSE PLANNER — FIND YOUR BEST SCHEDULE</p>
          <button
            onClick={() => setShowTour(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 px-3 py-1 font-display text-[11px] tracking-wider border-[2px] border-white/40 text-white/70 hover:text-white hover:border-white transition-all"
            style={{ borderRadius: 4 }}
          >
            TOUR
          </button>
        </div>
      </div>

      {state.error && (
        <Toast message={state.error} onClose={() => dispatch({ type: 'SET_ERROR', error: null })} />
      )}

      <div className="max-w-3xl mx-auto px-6 py-8">
        {mode === 'results' ? (
          <ResultsView
            courses={selectedCourses}
            semester={state.semester}
            prefs={prefs}
            onBack={() => setMode('manual')}
          />
        ) : mode === 'recommendations' ? (
          /* ── Recommendation Results ── */
          <div>
            <button
              onClick={() => setMode('interest')}
              className="font-display text-sm tracking-wider mb-4 hover:underline"
              style={{ color: 'var(--cardinal)' }}
            >
              ← BACK TO INTERESTS
            </button>

            <h2 className="font-display text-xl tracking-wider mb-1" style={{ color: 'var(--black)' }}>
              WE FOUND {recommendations.length} COURSES FOR YOU
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--mid)' }}>
              Ranked by relevance to your interests. Click + to add courses to your schedule.
            </p>

            <div className="flex flex-col gap-3 mb-6">
              {recommendations.map((rec, i) => {
                const courseId = `${rec.department}-${rec.number}`
                const courseLabel = `${rec.department} ${rec.number} — ${rec.title}`
                const isAdded = selectedCourses.some((c) => c.id === courseId)

                return (
                  <div
                    key={`${courseId}-${i}`}
                    className="p-4 border-[2px] flex gap-4"
                    style={{
                      borderColor: isAdded ? 'var(--cardinal)' : 'var(--beige)',
                      background: isAdded ? 'color-mix(in srgb, var(--cardinal) 4%, white)' : 'white',
                      borderRadius: '4px',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      {/* Course code */}
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
                      </div>

                      {/* Title */}
                      <p className="text-sm mb-1" style={{ color: 'var(--black)' }}>
                        {rec.title}
                      </p>

                      {/* Description */}
                      {rec.description && (
                        <p
                          className="text-xs mb-2 line-clamp-2"
                          style={{ color: 'var(--mid)' }}
                        >
                          {rec.description}
                        </p>
                      )}

                      {/* Match reasons */}
                      {rec.matchReasons.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px]" style={{ color: 'var(--mid)' }}>Matches:</span>
                          {rec.matchReasons.slice(0, 4).map((reason) => (
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

                    {/* Add button */}
                    <div className="flex-shrink-0 flex items-start">
                      <button
                        onClick={() => addCourse(courseId, courseLabel)}
                        disabled={isAdded || selectedCourses.length >= 6}
                        className="px-3 py-2 text-xs font-display tracking-wider border-[2px] transition-all"
                        style={{
                          borderColor: isAdded ? 'var(--cardinal)' : 'var(--black)',
                          background: isAdded ? 'var(--cardinal)' : 'white',
                          color: isAdded ? 'white' : 'var(--black)',
                          borderRadius: '4px',
                          opacity: isAdded || selectedCourses.length >= 6 ? 0.6 : 1,
                        }}
                      >
                        {isAdded ? 'ADDED' : '+ ADD'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected count + continue */}
            {selectedCourses.length > 0 && (
              <button
                onClick={() => setMode('manual')}
                className="w-full py-4 font-display text-lg tracking-wider text-white border-[3px] border-[var(--black)] transition-all hover:translate-y-[-2px]"
                style={{
                  background: 'var(--cardinal)',
                  boxShadow: '4px 4px 0 var(--black)',
                }}
              >
                CONTINUE WITH {selectedCourses.length} SELECTED →
              </button>
            )}
          </div>
        ) : (
          /* ── Manual / Interest Mode ── */
          <>
            {/* Semester */}
            <div className="mb-6">
              <label className="font-display text-sm tracking-wider mb-2 block" style={{ color: 'var(--cardinal)' }}>
                SEMESTER
              </label>
              <div className="w-52">
                <SemesterSelector />
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode('manual')}
                className="px-4 py-2 text-sm font-display tracking-wider border-[2px] transition-all"
                style={{
                  borderColor: 'var(--black)',
                  background: mode === 'manual' ? 'var(--cardinal)' : 'white',
                  color: mode === 'manual' ? 'white' : 'var(--black)',
                  borderRadius: '20px',
                }}
              >
                SEARCH COURSES
              </button>
              <button
                onClick={() => setMode('interest')}
                className="px-4 py-2 text-sm font-display tracking-wider border-[2px] transition-all"
                style={{
                  borderColor: 'var(--black)',
                  background: mode === 'interest' ? 'var(--cardinal)' : 'white',
                  color: mode === 'interest' ? 'white' : 'var(--black)',
                  borderRadius: '20px',
                }}
              >
                DISCOVER BY INTEREST
              </button>
            </div>

            {mode === 'manual' ? (
              <>
                {/* Course Search */}
                <div className="mb-6">
                  <label className="font-display text-sm tracking-wider mb-2 block" style={{ color: 'var(--cardinal)' }}>
                    ADD COURSES OR GE REQUIREMENTS
                  </label>
                  <CourseSearch onSelect={addCourse} semester={state.semester} />
                </div>
              </>
            ) : (
              /* Interest Input */
              <div className="mb-6">
                <label className="font-display text-sm tracking-wider mb-2 block" style={{ color: 'var(--cardinal)' }}>
                  DESCRIBE YOUR INTERESTS
                </label>
                <InterestInput semester={state.semester} onResults={handleRecommendations} />
              </div>
            )}

            {/* Selected courses */}
            {selectedCourses.length > 0 && (
              <SelectedList
                courses={selectedCourses}
                maxCourses={6}
                onRemove={removeCourse}
              />
            )}

            {/* Schedule Preferences */}
            {selectedCourses.length > 0 && (
              <SchedulePreferences prefs={prefs} onChange={setPrefs} />
            )}

            {/* Build button */}
            {selectedCourses.length > 0 && (
              <button
                onClick={handleBuild}
                className="w-full py-4 font-display text-xl tracking-wider text-white border-[3px] border-[var(--black)] mt-6 transition-all hover:translate-y-[-2px]"
                style={{
                  background: 'var(--cardinal)',
                  boxShadow: '4px 4px 0 var(--black)',
                }}
              >
                BUILD BEST SCHEDULE →
              </button>
            )}

            {/* GE Categories (manual mode only) */}
            {mode === 'manual' && (
              <GEGrid onSelect={addCourse} selectedIds={selectedCourses.map((c) => c.id)} />
            )}

            {/* Disclaimer */}
            <div
              className="mt-8 p-4 border-[2px] text-xs leading-relaxed"
              style={{
                borderColor: 'var(--gold)',
                background: 'color-mix(in srgb, var(--gold) 10%, white)',
                color: 'var(--mid)',
              }}
            >
              Results are ranked by Rate My Professors ratings, so sections without a rated professor or with no professor yet assigned may not appear.
              Use this tool as a starting point and always verify your schedule on the{' '}
              <a
                href="https://classes.usc.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: 'var(--cardinal)' }}
              >
                USC Schedule of Classes
              </a>.
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 text-center border-t-[3px] border-[var(--black)]">
        <p className="font-display text-xs tracking-[0.2em]" style={{ color: 'var(--mid)' }}>
          BIA 选课 — USC COURSE PLANNER
        </p>
      </footer>
    </main>
  )
}

export default function CoursePlannerPage() {
  return (
    <ScheduleProvider>
      <PlannerContent />
    </ScheduleProvider>
  )
}
