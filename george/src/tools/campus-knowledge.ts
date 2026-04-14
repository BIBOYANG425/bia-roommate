import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'campus_knowledge',
  "Search George's campus knowledge base for study spots, food recs, building tips.",
  {
    properties: {
      query: { type: 'string', description: 'What to search for' },
      category: { type: 'string', description: 'Category: food, study, buildings, tips, local' },
    },
    required: ['query'],
  },
  async (input) => {
    const query = input.query as string
    const category = input.category as string | undefined

    let q = supabase
      .from('campus_knowledge')
      .select('title, content, category')
      .limit(5)

    if (category) q = q.eq('category', category)
    q = q.textSearch('content', query.split(/\s+/).join(' & '), { type: 'plain' })

    const { data, error } = await q
    if (error || !data || data.length === 0) {
      return 'No campus knowledge found for that query.'
    }
    return JSON.stringify(data, null, 2)
  },
)
