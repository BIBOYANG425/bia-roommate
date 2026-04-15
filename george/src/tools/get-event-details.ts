import { registerTool } from '../agent/tool-registry.js'
import { getEventById } from '../db/events.js'

registerTool(
  'get_event_details',
  'Get full details for a specific event by ID.',
  {
    properties: {
      event_id: { type: 'string', description: 'The UUID of the event' },
    },
    required: ['event_id'],
  },
  async (input) => {
    const event = await getEventById(input.event_id as string)
    if (!event) return 'Event not found.'
    return JSON.stringify(event, null, 2)
  },
)
