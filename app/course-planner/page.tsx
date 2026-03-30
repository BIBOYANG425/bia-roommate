'use client'

import { useState, useCallback } from 'react'
import NavTabs from '@/components/NavTabs'
import SemesterSelector from '@/components/course-planner/SemesterSelector'
import CourseSearch from '@/components/course-planner/CourseSearch'
import GEGrid from '@/components/course-planner/GEGrid'
import SelectedList from '@/components/course-planner/SelectedList'
import SchedulePreferences from '@/components/course-planner/SchedulePreferences'
import ResultsView from '@/components/course-planner/ResultsView'
import { ScheduleProvider, usePlanner } from '@/lib/course-planner/store'
import Toast from '@/components/Toast'

export interface SchedulePrefs {
  earliestClass: string
  doneBy: string
  preferBackToBack: boolean
}

function PlannerContent() {
  const { state, dispatch } = usePlanner()
  const [selectedCourses, setSelectedCourses] = useState<{ id: string; label: string }[]>([])
  const [prefs, setPrefs] = useState<SchedulePrefs>({
    earliestClass: '',
    doneBy: '',
    preferBackToBack: false,
  })
  const [showResults, setShowResults] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)

  const addCourse = useCallback((id: string, label: string) => {
    if (selectedCourses.length >= 6) return
    if (selectedCourses.some((c) => c.id === id)) return
    setSelectedCourses((prev) => [...prev, { id, label }])
    setShowResults(false)
  }, [selectedCourses])

  const removeCourse = useCallback((id: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== id))
    setShowResults(false)
  }, [])

  const handleBuild = useCallback(async () => {
    if (selectedCourses.length === 0) return
    setIsBuilding(true)
    setShowResults(true)
    setIsBuilding(false)
  }, [selectedCourses])

  return (
    <main className="min-h-screen" style={{ background: '#F5F3EE' }}>
      <NavTabs />

      {/* Header */}
      <div className="border-b-[3px] border-[var(--black)] px-6 py-5" style={{ background: 'var(--cardinal)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-1">BIA 选课</h1>
          <p className="text-sm text-white/60">USC COURSE PLANNER — FIND YOUR BEST SCHEDULE</p>
        </div>
      </div>

      {state.error && (
        <Toast message={state.error} onClose={() => dispatch({ type: 'SET_ERROR', error: null })} />
      )}

      <div className="max-w-3xl mx-auto px-6 py-8">
        {!showResults ? (
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

            {/* Course Search */}
            <div className="mb-6">
              <label className="font-display text-sm tracking-wider mb-2 block" style={{ color: 'var(--cardinal)' }}>
                ADD COURSES OR GE REQUIREMENTS
              </label>
              <CourseSearch onSelect={addCourse} semester={state.semester} />
            </div>

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
                disabled={isBuilding}
                className="w-full py-4 font-display text-xl tracking-wider text-white border-[3px] border-[var(--black)] mt-6 transition-all hover:translate-y-[-2px]"
                style={{
                  background: 'var(--cardinal)',
                  boxShadow: '4px 4px 0 var(--black)',
                  opacity: isBuilding ? 0.7 : 1,
                }}
              >
                {isBuilding ? 'BUILDING...' : 'BUILD BEST SCHEDULE →'}
              </button>
            )}

            {/* GE Categories */}
            <GEGrid onSelect={addCourse} selectedIds={selectedCourses.map((c) => c.id)} />

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
        ) : (
          <ResultsView
            courses={selectedCourses}
            semester={state.semester}
            prefs={prefs}
            onBack={() => setShowResults(false)}
          />
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
