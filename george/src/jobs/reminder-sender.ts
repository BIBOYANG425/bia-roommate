import { getPendingReminders, markReminderSent } from '../db/reminders.js'
import { callLightweightLLM } from '../agent/llm-providers.js'
import { log } from '../observability/logger.js'

async function getSendWeChatMessage() {
  const { sendWeChatMessage } = await import('../adapters/wechat.js')
  return sendWeChatMessage
}

async function getSendIMessage() {
  const { sendIMessage } = await import('../adapters/imessage.js')
  return sendIMessage
}

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
          content: 'You are George Tirebiter, a ghost dog. Write a SHORT reminder (1-2 sentences) about an upcoming event. Be enthusiastic. Mix Chinese/English.',
        },
        {
          role: 'user',
          content: `Remind ${student.name || '同学'} about: ${event.title} at ${event.location || 'TBD'} on ${event.date}`,
        },
      ], { maxTokens: 80 })

      if (student.wechat_open_id) {
        const send = await getSendWeChatMessage()
        await send(student.wechat_open_id as string, message)
      } else if (student.imessage_id) {
        const send = await getSendIMessage()
        await send(student.imessage_id as string, message)
      }

      await markReminderSent(reminder.id)
      log('info', 'reminder_sent', { reminderId: reminder.id })
    } catch (err) {
      log('error', 'reminder_send_error', { reminderId: reminder.id, error: (err as Error).message })
    }
  }
}
