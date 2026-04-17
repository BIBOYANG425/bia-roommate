import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'freshman_faq',
  "Search senior-answered freshman FAQ distilled from the BIA 2024 WeChat group. Covers housing, academics, social, admin, food, and general USC life.",
  {
    properties: {
      query: { type: 'string', description: 'What to search for' },
      category: {
        type: 'string',
        description: 'Optional: housing | academics | social | admin | food | general',
      },
    },
    required: ['query'],
  },
  async (input) => {
    const query = input.query as string
    const category = input.category as string | undefined

    let q = supabase.from('freshman_faq').select('question, answer, category').limit(5)

    if (category) q = q.eq('category', category)
    q = q.textSearch('answer', query.split(/\s+/).join(' & '), { type: 'plain' })

    const { data, error } = await q
    if (error || !data || data.length === 0) {
      return 'No FAQ entries found for that query.'
    }
    return JSON.stringify(data, null, 2)
  },
)
