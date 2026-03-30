'use client'

import { usePlanner, getActiveSchedule } from '@/lib/course-planner/store'
import { ScheduleProvider } from '@/lib/course-planner/store'
import NavTabs from '@/components/NavTabs'
import SemesterSelector from '@/components/course-planner/SemesterSelector'
import CourseSearch from '@/components/course-planner/CourseSearch'
import SearchResults from '@/components/course-planner/SearchResults'
import CourseDetail from '@/components/course-planner/CourseDetail'
import WeeklyCalendar from '@/components/course-planner/WeeklyCalendar'
import SelectedCourses from '@/components/course-planner/SelectedCourses'
import ScheduleTabs from '@/components/course-planner/ScheduleTabs'
import OptimizeButton from '@/components/course-planner/OptimizeButton'
import Toast from '@/components/Toast'

function PlannerContent() {
  const { state, dispatch } = usePlanner()

  return (
    <main className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <NavTabs />

      {/* Header */}
      <div className="border-b-[3px] border-[var(--black)] px-6 py-4" style={{ background: 'var(--cardinal)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-white">BIA 选课</h1>
            <p className="text-xs text-white/60">USC COURSE PLANNER</p>
          </div>
          <div className="w-48">
            <SemesterSelector />
          </div>
        </div>
      </div>

      {/* Error toast */}
      {state.error && (
        <Toast
          message={state.error}
          onClose={() => dispatch({ type: 'SET_ERROR', error: null })}
        />
      )}

      {/* Main layout */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* Left panel — Search */}
        <aside className="w-full lg:w-[380px] shrink-0 search-panel p-4 flex flex-col gap-4">
          <CourseSearch />

          {state.isLoadingCourse ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="brutal-card p-4 animate-pulse">
                  <div className="h-5 w-3/4 mb-2" style={{ background: 'var(--beige)' }} />
                  <div className="h-3 w-1/2" style={{ background: 'var(--beige)' }} />
                </div>
              ))}
            </div>
          ) : state.expandedCourse ? (
            <CourseDetail />
          ) : (
            <SearchResults />
          )}
        </aside>

        {/* Right panel — Calendar + Selected */}
        <div className="flex-1 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <ScheduleTabs />
            <div className="w-48">
              <OptimizeButton />
            </div>
          </div>

          <div className="relative">
            <WeeklyCalendar />
          </div>

          <div>
            <h3 className="font-display text-sm tracking-wider mb-2" style={{ color: 'var(--mid)' }}>
              SELECTED COURSES
            </h3>
            <SelectedCourses />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 text-center border-t-[3px] border-[var(--black)]">
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
