import { getPendingReminders, markReminderSent } from '../db/reminders.js'
import { callLightweightLLM } from '../agent/llm-providers.js'
import { sendPlatformMessage } from '../adapters/send-message.js'
import { log } from '../observability/logger.js'

export async function sendPendingReminders() {
  const reminders = await getPendingReminders()
  if (reminders.length === 0) return

  for (const reminder of reminders) {
    const student = reminder.students as Record<string, unknown>
    const event = reminder.events as Record<string, unknown>

    if (!student || !event) {
      await markReminderSent(reminder.id)
      continue
    }

    try {
      const message = await callLightweightLLM([
        {
          role: 'system',
          content: 'You are George, the BIA AI companion — a senior USC Chinese international student voice. Write a SHORT (1-2 sentence, <= 60 chars) event reminder. Direct, specific, mix Chinese/English naturally. No bot opener, no emoji unless it\'s 🚩 for a warning. Just the reminder.',
        },
        {
          role: 'user',
          content: `Remind ${student.name || '同学'} about: ${event.title} at ${event.location || 'TBD'} on ${event.date}`,
        },
      ], { maxTokens: 80 })

      const platform = student.wechat_open_id ? 'wechat' as const : 'imessage' as const
      const platformId = (student.wechat_open_id || student.imessage_id) as string
      await sendPlatformMessage(platform, platformId, message)

      await markReminderSent(reminder.id)
      log('info', 'reminder_sent', { reminderId: reminder.id })
    } catch (err) {
      log('error', 'reminder_send_error', { reminderId: reminder.id, error: (err as Error).message })
    }
  }
}
