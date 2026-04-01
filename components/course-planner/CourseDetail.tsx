'use client'

import { usePlanner, getActiveSchedule } from '@/lib/course-planner/store'
import { parseSectionTimes, findConflicts } from '@/lib/course-planner/conflicts'
import { getNextColorIndex } from '@/lib/course-planner/colors'
import type { Section, SelectedSection } from '@/lib/course-planner/types'
import SectionRow from './SectionRow'

export default function CourseDetail() {
  const { state, dispatch } = usePlanner()
  const course = state.expandedCourse
  if (!course) return null

  const active = getActiveSchedule(state)
  const courseId = `${course.department}-${course.number}`

  const selectedIds = new Set(
    active.selectedSections
      .filter((s) => s.courseId === courseId)
      .map((s) => s.section.id)
  )

  // Group sections by type
  const groups: Record<string, Section[]> = {}
  for (const sec of course.sections || []) {
    const type = sec.type || 'Other'
    if (!groups[type]) groups[type] = []
    groups[type].push(sec)
  }

  function toggleSection(section: Section) {
    if (selectedIds.has(section.id)) {
      dispatch({ type: 'REMOVE_SECTION', courseId, sectionId: section.id })
      return
    }

    const slots = parseSectionTimes(section.times)
    const conflicts = findConflicts(slots, active.selectedSections)

    if (conflicts.length > 0) {
      dispatch({
        type: 'SET_ERROR',
        error: `CONFLICTS WITH ${conflicts.map((c) => c.courseId).join(', ')}`,
      })
      return
    }

    const usedColors = active.selectedSections.map((s) => s.colorIndex)
    const colorIndex = getNextColorIndex(usedColors)

    const courseData = course
    if (!courseData) return

    const selected: SelectedSection = {
      courseId,
      courseTitle: courseData.title,
      units: courseData.units,
      section,
      colorIndex,
      timeSlots: slots,
    }

    dispatch({ type: 'ADD_SECTION', section: selected })
  }

  function checkConflict(section: Section) {
    if (selectedIds.has(section.id)) return { has: false, with: '' }
    const slots = parseSectionTimes(section.times)
    const others = active.selectedSections.filter((s) => s.section.id !== section.id)
    const conflicts = findConflicts(slots, others)
    return {
      has: conflicts.length > 0,
      with: conflicts.map((c) => c.courseId).join(', '),
    }
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => dispatch({ type: 'SET_EXPANDED_COURSE', course: null })}
        className="font-display text-sm tracking-wider mb-4 hover:underline"
        style={{ color: 'var(--cardinal)' }}
      >
        ← BACK TO RESULTS
      </button>

      {/* Course header */}
      <div className="mb-4">
        <h3 className="font-display text-2xl" style={{ color: 'var(--black)' }}>
          {course.department} {course.number}
        </h3>
        <p className="text-sm" style={{ color: 'var(--mid)' }}>
          {course.title} — {course.units} units
        </p>
        {course.description && (
          <p className="text-xs mt-2 line-clamp-3" style={{ color: 'var(--mid)' }}>
            {course.description}
          </p>
        )}

        {/* Prerequisites */}
        {course.prereqs && (
          <div
            className="mt-2 px-3 py-1.5 text-xs border-l-[3px]"
            style={{ borderColor: 'var(--cardinal)', background: 'rgba(153,0,0,0.05)', color: 'var(--cardinal)' }}
          >
            <span className="font-display tracking-wider">PRE-REQUISITES:</span>{' '}
            <span style={{ color: 'var(--black)' }}>{course.prereqs}</span>
          </div>
        )}

        {/* Restrictions */}
        {course.restrictions && course.restrictions.length > 0 && (
          <div
            className="mt-1.5 px-3 py-1.5 text-xs border-l-[3px]"
            style={{ borderColor: 'var(--gold)', background: 'rgba(255,204,0,0.08)', color: 'var(--mid)' }}
          >
            <span className="font-display tracking-wider" style={{ color: 'var(--black)' }}>RESTRICTIONS:</span>{' '}
            {course.restrictions.join('; ')}
          </div>
        )}
      </div>

      {/* Sections grouped by type */}
      {Object.entries(groups).map(([type, sections]) => (
        <div key={type} className="mb-4">
          <h4 className="font-display text-sm tracking-wider mb-2" style={{ color: 'var(--mid)' }}>
            {type.toUpperCase()}S ({sections.length})
          </h4>
          <div className="flex flex-col gap-1.5">
            {sections.map((sec) => {
              const conflict = checkConflict(sec)
              return (
                <SectionRow
                  key={sec.id}
                  section={sec}
                  isSelected={selectedIds.has(sec.id)}
                  hasConflict={conflict.has}
                  conflictWith={conflict.with}
                  onToggle={() => toggleSection(sec)}
                />
              )
            })}
          </div>
        </div>
      ))}

      {(!course.sections || course.sections.length === 0) && (
        <div className="text-center py-8">
          <p className="font-display text-lg" style={{ color: 'var(--mid)' }}>
            NO SECTIONS AVAILABLE FOR THIS TERM
          </p>
        </div>
      )}
    </div>
  )
}
