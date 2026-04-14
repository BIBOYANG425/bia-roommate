import { registerTool } from '../agent/tool-registry.js'
import { getStudentById } from '../db/students.js'

registerTool(
  'lookup_student',
  "Look up the current student's profile and preferences.",
  {
    properties: {
      student_id: { type: 'string', description: 'The student UUID' },
    },
    required: ['student_id'],
  },
  async (input) => {
    const student = await getStudentById(input.student_id as string)
    if (!student) return 'Student not found.'
    const { wechat_open_id, imessage_id, link_code, link_code_expires_at, ...safe } = student
    return JSON.stringify(safe, null, 2)
  },
)
