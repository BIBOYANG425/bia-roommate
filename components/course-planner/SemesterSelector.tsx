'use client'

import { usePlanner } from '@/lib/course-planner/store'
import { getAvailableSemesters } from '@/lib/course-planner/semester'

export default function SemesterSelector() {
  const { state, dispatch } = usePlanner()
  const semesters = getAvailableSemesters()

  return (
    <select
      value={state.semester}
      onChange={(e) => dispatch({ type: 'SET_SEMESTER', semester: e.target.value })}
      className="brutal-select w-full"
    >
      {semesters.map((s) => (
        <option key={s.code} value={s.code}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
