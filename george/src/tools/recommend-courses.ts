import { registerTool } from '../agent/tool-registry.js'
import { config } from '../config.js'

registerTool(
  'recommend_courses',
  'Get personalized course recommendations based on interests.',
  {
    properties: {
      interests: { type: 'string', description: 'Student interests or topics' },
      semester: { type: 'string', description: 'Semester code' },
      units: { type: 'string', description: 'Unit count filter' },
      level: { type: 'string', description: 'Course level: lower, upper, or graduate' },
    },
    required: ['interests'],
  },
  async (input) => {
    const body: Record<string, string> = { interests: input.interests as string, mode: 'free' }
    if (input.semester) body.semester = input.semester as string
    if (input.units) body.units = input.units as string
    if (input.level) body.level = input.level as string

    const res = await fetch(`${config.biaRoommate.baseUrl}/api/courses/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) return `Course recommendation failed (${res.status})`
    const data = await res.json()
    if (!data.recommendations || data.recommendations.length === 0) {
      return 'No recommendations found.'
    }
    return JSON.stringify(data, null, 2)
  },
)
