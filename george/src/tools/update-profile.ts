import { registerTool } from '../agent/tool-registry.js'
import { getStudentById, updateStudent } from '../db/students.js'
import { log } from '../observability/logger.js'

const REQUIRED_FIELDS = ['major', 'year', 'interests', 'notification_frequency'] as const

registerTool(
  'update_profile',
  "Save partial student profile data during onboarding. Call this AFTER EACH answer the student gives — don't wait until the end. All args are optional, pass only the field(s) you just learned. When all 4 required fields are filled (major, year, interests, notification_frequency), this tool also automatically marks onboarding as complete. Returns the current state and what's still missing.",
  {
    properties: {
      major: { type: 'string', description: "Student's major (e.g. 'Computer Science', 'Business', 'Music'). Use 'undecided' if the student refuses to say after multiple tries." },
      year: { type: 'string', enum: ['freshman', 'sophomore', 'junior', 'senior', 'grad', 'unknown'], description: "Student's year. Use 'unknown' if they refuse to say." },
      interests: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of interest tags (3–5 items). Use ["unknown"] if they refuse to share.',
      },
      notification_frequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'special_only'],
        description: 'How often the student wants event notifications.',
      },
    },
    required: [],
  },
  async (input) => {
    const studentId = input.student_id as string | undefined
    if (!studentId) return 'Error: no student context.'

    const updates: Record<string, unknown> = {}
    if (typeof input.major === 'string') updates.major = input.major
    if (typeof input.year === 'string') updates.year = input.year
    if (Array.isArray(input.interests)) updates.interests = input.interests
    if (typeof input.notification_frequency === 'string') {
      updates.notification_prefs = { events: true, frequency: input.notification_frequency }
    }

    if (Object.keys(updates).length === 0) {
      // Nothing to save — return current state so George can see what's missing
      const current = await getStudentById(studentId)
      return JSON.stringify({
        warning: 'no fields provided',
        current: {
          major: current?.major ?? null,
          year: current?.year ?? null,
          interests: current?.interests ?? null,
          notification_prefs: current?.notification_prefs ?? null,
          onboarding_complete: current?.onboarding_complete ?? false,
        },
      })
    }

    await updateStudent(studentId, updates)

    // Re-read to determine completeness
    const after = await getStudentById(studentId)
    const has = {
      major: !!after?.major,
      year: !!after?.year,
      interests: Array.isArray(after?.interests) && after.interests.length > 0,
      notification_frequency: !!after?.notification_prefs?.frequency,
    }
    const missing = REQUIRED_FIELDS.filter((f) => !has[f])

    if (missing.length === 0 && !after?.onboarding_complete) {
      await updateStudent(studentId, { onboarding_complete: true })
      log('info', 'onboarding_completed', { studentId })
      return JSON.stringify({
        saved: Object.keys(updates),
        complete: true,
        message: 'All 4 required fields collected. Onboarding marked complete. Now celebrate the student in George style and tell them what they can do.',
      })
    }

    return JSON.stringify({
      saved: Object.keys(updates),
      complete: false,
      missing,
      next_question: missing[0],
      hint: `Ask the student about: ${missing[0]}. Don't ask about anything already filled in.`,
    })
  },
)
