import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'
import { searchWithFallback } from './search-helpers.js'

registerTool(
  'course_tips',
  'Search crowd-sourced course tips and professor feedback distilled from BIA 2024 WeChat discussions.',
  {
    properties: {
      course_code: { type: 'string', description: 'Course code like "CSCI 103" (optional)' },
      professor: { type: 'string', description: 'Professor surname (optional)' },
      query: { type: 'string', description: 'Free-text query for the tip content (optional)' },
    },
    required: [],
  },
  async (input) => {
    const course_code = input.course_code as string | undefined
    const professor = input.professor as string | undefined
    const query = input.query as string | undefined

    // Course-code + prof filters are equality-style — use a direct query;
    // only go through the FTS+ILIKE fallback path when a free-text query is
    // present. course_code queries are reliable because they're structured.
    if (query) {
      const data = await searchWithFallback<{
        course_code: string | null
        professor: string | null
        tip: string
        sentiment: string
      }>('course_tips', 'course_code, professor, tip, sentiment', query, {
        ftsColumn: 'tip',
        ilikeColumns: ['tip', 'course_code', 'professor'],
        applyFilters: (q) => {
          let out = q
          if (course_code) out = out.ilike('course_code', `%${course_code}%`)
          if (professor) out = out.ilike('professor', `%${professor}%`)
          return out
        },
      })
      if (!data || data.length === 0) return 'No course tips found for that query.'
      return JSON.stringify(data, null, 2)
    }

    let q = supabase
      .from('course_tips')
      .select('course_code, professor, tip, sentiment')
      .limit(5)
    if (course_code) q = q.ilike('course_code', `%${course_code}%`)
    if (professor) q = q.ilike('professor', `%${professor}%`)

    const { data, error } = await q
    if (error || !data || data.length === 0) {
      return 'No course tips found for that query.'
    }
    return JSON.stringify(data, null, 2)
  },
)
