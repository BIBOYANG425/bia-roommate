import { registerTool } from '../agent/tool-registry.js'
import { config } from '../config.js'

const BASE = () => config.biaRoommate.baseUrl

registerTool(
  'search_courses',
  'Search USC courses by name, department, or keyword.',
  {
    properties: {
      query: { type: 'string', description: 'Search term' },
      semester: { type: 'string', description: 'Semester code (e.g., 20263)' },
    },
    required: ['query'],
  },
  async (input) => {
    const params = new URLSearchParams({ q: input.query as string })
    if (input.semester) params.set('semester', input.semester as string)
    const res = await fetch(`${BASE()}/api/courses/search?${params}`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return `Course search failed (${res.status})`
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return 'No courses found.'
    return JSON.stringify(data, null, 2)
  },
)
