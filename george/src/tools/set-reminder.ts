import { registerTool } from '../agent/tool-registry.js'
import { createReminder } from '../db/reminders.js'
import { supabase } from '../db/client.js'

registerTool(
  'set_reminder',
  'Set a reminder for a student about an upcoming event.',
  {
    properties: {
      event_id: { type: 'string', description: 'The event UUID' },
      remind_at: { type: 'string', description: 'When to send reminder (ISO 8601)' },
      platform: { type: 'string', enum: ['wechat', 'imessage'], description: 'Platform to send reminder on' },
    },
    required: ['event_id', 'remind_at'],
  },
  async (input) => {
    if (!input.student_id) return 'No student context available.'
    await supabase.from('event_attendance').upsert({
      student_id: input.student_id as string,
      event_id: input.event_id as string,
      source: 'reminder',
    }, { onConflict: 'student_id,event_id' })

    await createReminder(
      input.student_id as string,
      input.event_id as string,
      input.remind_at as string,
      (input.platform as string) || 'wechat',
    )
    return `Reminder set! George will poke you at ${input.remind_at}. 👻`
  },
)
