import { registerTool } from '../agent/tool-registry.js'
import { config } from '../config.js'

const BASE = () => config.biaRoommate.baseUrl

registerTool(
  'plan_schedule',
  'Get detailed course info for schedule planning. Checks multiple courses at once.',
  {
    properties: {
      courses: { type: 'string', description: 'Comma-separated DEPT-NUMBER (e.g., "CSCI-201,MATH-225")' },
      semester: { type: 'string', description: 'Semester code' },
    },
    required: ['courses'],
  },
  async (input) => {
    const params = new URLSearchParams({ courses: input.courses as string })
    if (input.semester) params.set('semester', input.semester as string)
    const courseRes = await fetch(`${BASE()}/api/courses/coursebin?${params}`, { signal: AbortSignal.timeout(10_000) })
    if (!courseRes.ok) return `Schedule lookup failed (${courseRes.status})`
    const courseData = await courseRes.json()
    const ratingRes = await fetch(`${BASE()}/api/course-rating/aggregates?${params}`, { signal: AbortSignal.timeout(10_000) })
    const ratingData = ratingRes.ok ? await ratingRes.json() : { aggregates: {} }
    return JSON.stringify({ courses: courseData.courses, ratings: ratingData.aggregates }, null, 2)
  },
)
