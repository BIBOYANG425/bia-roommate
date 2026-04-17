import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

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

    let q = supabase
      .from('course_tips')
      .select('course_code, professor, tip, sentiment')
      .limit(5)

    if (course_code) q = q.ilike('course_code', `%${course_code}%`)
    if (professor) q = q.ilike('professor', `%${professor}%`)
    if (query) q = q.textSearch('tip', query.split(/\s+/).join(' & '), { type: 'plain' })

    const { data, error } = await q
    if (error || !data || data.length === 0) {
      return 'No course tips found for that query.'
    }
    return JSON.stringify(data, null, 2)
  },
)
