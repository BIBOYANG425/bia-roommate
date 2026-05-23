// Aggregates everything the course sub-agent needs to know about a student
// *before* recommending classes: profile (year/major), completed courses, GE
// progress, and stored preferences (units cap, prof bar, time window). This is
// the first tool the course voice should call for "what should I take" — it
// prevents re-asking facts already in student / student_memories.
//
// Header last reviewed: 2026-05-22

import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

interface AcademicState {
  profile: {
    year: string | null
    major: string | null
    interests: string[]
  }
  completed_courses: string[]
  ge_status: Record<string, string>
  units_preference: string | null
  prof_bar: string | null
  time_preference: string | null
  missing: string[]
}

registerTool(
  'get_student_academic_state',
  "Load the student's known academic state — year, major, courses they've completed, GE progress, and stored preferences (units, prof bar, time). Call this FIRST when answering 'what should I take' so you don't re-ask facts already stored.",
  {
    properties: {
      student_id: { type: 'string', description: 'The student UUID (injected from context)' },
    },
    required: [],
  },
  async (input) => {
    const studentId = input.student_id as string | undefined
    if (!studentId) {
      return JSON.stringify({
        error: 'No student context available — recommend asking the student directly.',
      })
    }

    const [studentResult, memoriesResult] = await Promise.all([
      supabase
        .from('students')
        .select('year, major, interests')
        .eq('id', studentId)
        .single(),
      supabase
        .from('student_memories')
        .select('key, value, category')
        .eq('student_id', studentId)
        .in('category', [
          'personal_fact',
          'academic_interest',
          'completed_course',
          'ge_completed',
          'units_preference',
          'prof_bar',
          'time_preference',
        ]),
    ])

    const student = studentResult.data
    const memories = memoriesResult.data ?? []

    const state: AcademicState = {
      profile: {
        year: student?.year ?? null,
        major: student?.major ?? null,
        interests: Array.isArray(student?.interests) ? student.interests : [],
      },
      completed_courses: [],
      ge_status: {},
      units_preference: null,
      prof_bar: null,
      time_preference: null,
      missing: [],
    }

    for (const m of memories) {
      switch (m.category) {
        case 'completed_course':
          state.completed_courses.push(m.key)
          break
        case 'ge_completed':
          state.ge_status[m.key] = m.value
          break
        case 'units_preference':
          state.units_preference = m.value
          break
        case 'prof_bar':
          state.prof_bar = m.value
          break
        case 'time_preference':
          state.time_preference = m.value
          break
        case 'personal_fact':
          // Fallback: students table may be empty but memory has year/major.
          if (!state.profile.year && /year|grade|大[一二三四]|freshman|soph|junior|senior|grad/i.test(m.key + ' ' + m.value)) {
            state.profile.year = m.value
          }
          if (!state.profile.major && /major|major:/i.test(m.key)) {
            state.profile.major = m.value
          }
          break
        case 'academic_interest':
          if (!state.profile.interests.includes(m.value)) {
            state.profile.interests.push(m.value)
          }
          break
      }
    }

    // Flag what's still unknown so the agent knows what to ask. This is the
    // signal that drives the "ask before recommend" hard rule in personality.
    if (!state.profile.year) state.missing.push('year')
    if (!state.profile.major) state.missing.push('major')
    if (Object.keys(state.ge_status).length === 0) state.missing.push('ge_status')
    if (!state.units_preference) state.missing.push('units_preference')

    return JSON.stringify(state, null, 2)
  },
)
