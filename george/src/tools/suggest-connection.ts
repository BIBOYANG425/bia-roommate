import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'suggest_connection',
  'Find students with similar interests or attending the same events.',
  {
    properties: {
      student_id: { type: 'string', description: 'Current student UUID' },
      interest: { type: 'string', description: 'Interest to match on' },
      event_id: { type: 'string', description: 'Find others attending this event' },
    },
  },
  async (input) => {
    const studentId = input.student_id as string
    const { data: connections } = await supabase
      .from('student_connections')
      .select('student_b_id, source, strength')
      .eq('student_a_id', studentId)
      .order('strength', { ascending: false })
      .limit(5)

    if (input.event_id) {
      const { data: attendees } = await supabase
        .from('event_attendance')
        .select('student_id')
        .eq('event_id', input.event_id as string)
        .neq('student_id', studentId)
        .limit(10)
      if (!attendees || attendees.length === 0) return 'No other students have signed up for this event yet.'
      const friendIds = new Set((connections || []).map((c) => c.student_b_id))
      const friendCount = attendees.filter((a) => friendIds.has(a.student_id)).length
      return JSON.stringify({ attendees: attendees.length, friends_attending: friendCount }, null, 2)
    }

    if (input.interest) {
      const { data } = await supabase
        .from('students')
        .select('id, name, major, interests')
        .contains('interests', [input.interest as string])
        .neq('id', studentId)
        .neq('social_visibility', false)
        .limit(5)
      if (!data || data.length === 0) return 'No students found with matching interests.'
      const safe = data.map(({ id: _id, ...rest }) => rest)
      return JSON.stringify(safe, null, 2)
    }

    return 'Provide an interest or event_id to find connections.'
  },
)
