import { registerTool } from '../agent/tool-registry.js'
import { getStudentById } from '../db/students.js'

registerTool(
  'lookup_student',
  "Look up the current student's profile and preferences.",
  {
    properties: {
      student_id: { type: 'string', description: 'The student UUID (injected from context)' },
    },
    required: [],
  },
  async (input) => {
    const studentId = input.student_id as string | undefined
    if (!studentId) return 'No student context available.'

    const student = await getStudentById(studentId)
    if (!student) return 'Student not found.'
    const { wechat_open_id, imessage_id, link_code, link_code_expires_at, ...safe } = student
    return JSON.stringify(safe, null, 2)
  },
)
