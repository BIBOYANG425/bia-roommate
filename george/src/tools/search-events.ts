import { registerTool } from '../agent/tool-registry.js'
import { searchEvents } from '../db/events.js'

registerTool(
  'search_events',
  'Search for upcoming USC and BIA events by keyword, category, or date range.',
  {
    properties: {
      query: { type: 'string', description: 'Search term' },
      category: { type: 'string', description: 'Category: social, academic, career, cultural, sports, other' },
      from_date: { type: 'string', description: 'Start date (ISO 8601)' },
      to_date: { type: 'string', description: 'End date (ISO 8601)' },
    },
  },
  async (input) => {
    const events = await searchEvents({
      query: input.query as string | undefined,
      category: input.category as string | undefined,
      fromDate: input.from_date as string | undefined,
      toDate: input.to_date as string | undefined,
    })
    if (events.length === 0) return 'No events found matching the criteria.'
    return JSON.stringify(events, null, 2)
  },
)
