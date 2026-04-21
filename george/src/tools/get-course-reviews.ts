import { registerTool } from '../agent/tool-registry.js'
import { config } from '../config.js'

registerTool(
  'get_course_reviews',
  'Get student reviews and ratings for a specific course, merged with live RMP (RateMyProfessors) ratings for each instructor mentioned. Returns { bia_reviews, rmp } where bia_reviews is the BIA aggregate payload and rmp is a name→rating map. Prefer this tool over calling get_rmp_ratings separately when you already want the course reviews.',
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
    const res = await fetch(`${config.biaRoommate.baseUrl}/api/course-rating/reviews?${params}`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return `Review lookup failed (${res.status})`
    const data = await res.json()
    if (!data.reviews || data.reviews.length === 0) return 'No reviews found.'

    // Collect distinct instructor names from reviews and/or sections.
    const names = new Set<string>()
    const collect = (v: unknown) => {
      if (typeof v === 'string' && v.trim()) names.add(v.trim())
    }
    if (Array.isArray(data.reviews)) {
      for (const r of data.reviews) collect((r as { instructor?: unknown })?.instructor)
    }
    if (Array.isArray(data.sections)) {
      for (const s of data.sections) collect((s as { instructor?: unknown })?.instructor)
    }

    let rmp: Record<string, unknown> = {}
    const nameList = Array.from(names).slice(0, 50)
    if (nameList.length > 0) {
      try {
        // bia-roommate /api/rmp/batch is GET with ?names=a,b,c — not POST.
        const qs = new URLSearchParams({ names: nameList.join(',') })
        const rmpRes = await fetch(`${config.biaRoommate.baseUrl}/api/rmp/batch?${qs.toString()}`, {
          signal: AbortSignal.timeout(15_000),
        })
        if (rmpRes.ok) {
          rmp = await rmpRes.json()
        }
      } catch {
        // Swallow — RMP enrichment is best-effort; BIA reviews are the primary payload.
      }
    }

    return JSON.stringify({ bia_reviews: data, rmp }, null, 2)
  },
)
