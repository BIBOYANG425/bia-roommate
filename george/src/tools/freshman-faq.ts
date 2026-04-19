import { registerTool } from '../agent/tool-registry.js'
import { searchWithFallback } from './search-helpers.js'

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

    const data = await searchWithFallback<{
      question: string
      answer: string
      category: string
    }>('freshman_faq', 'question, answer, category', query, {
      ftsColumn: 'answer',
      ilikeColumns: ['question', 'answer'],
      applyFilters: (q) => (category ? q.eq('category', category) : q),
    })

    if (!data || data.length === 0) {
      return 'No FAQ entries found for that query.'
    }
    return JSON.stringify(data, null, 2)
  },
)
