import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'submit_event',
  'Submit a community event for BIA team review.',
  {
    properties: {
      student_id: { type: 'string', description: 'The student submitting' },
      title: { type: 'string', description: 'Event title' },
      description: { type: 'string', description: 'Event description' },
      date: { type: 'string', description: 'Event date (ISO 8601)' },
      location: { type: 'string', description: 'Event location' },
    },
    required: ['student_id', 'title'],
  },
  async (input) => {
    const { error } = await supabase.from('event_submissions').insert({
      student_id: input.student_id as string,
      title: input.title as string,
      description: (input.description as string) || null,
      date: (input.date as string) || null,
      location: (input.location as string) || null,
    })
    if (error) return 'Failed to submit event.'
    return 'Event submitted! BIA team will review it soon. 🐕'
  },
)
