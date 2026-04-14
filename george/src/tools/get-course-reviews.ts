import { registerTool } from '../agent/tool-registry.js'
import { config } from '../config.js'

const BASE = () => config.biaRoommate.baseUrl

registerTool(
  'get_course_reviews',
  'Get student reviews and ratings for a specific course.',
  {
    properties: {
      dept: { type: 'string', description: 'Department code (e.g., CSCI)' },
      number: { type: 'string', description: 'Course number (e.g., 201)' },
      professor: { type: 'string', description: 'Professor name filter' },
    },
    required: ['dept', 'number'],
  },
  async (input) => {
    const params = new URLSearchParams({
      dept: (input.dept as string).toUpperCase(),
      number: input.number as string,
    })
    if (input.professor) params.set('professor', input.professor as string)
    const res = await fetch(`${BASE()}/api/course-rating/reviews?${params}`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return `Review lookup failed (${res.status})`
    const data = await res.json()
    if (!data.reviews || data.reviews.length === 0) return 'No reviews found.'
    return JSON.stringify(data, null, 2)
  },
)
