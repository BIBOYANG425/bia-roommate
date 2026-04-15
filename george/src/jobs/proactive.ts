import { supabase } from '../db/client.js'
import { callLightweightLLM } from '../agent/llm-providers.js'
import { sendPlatformMessage } from '../adapters/send-message.js'
import { config } from '../config.js'
import { log } from '../observability/logger.js'

const MAX_DAILY_PUSHES = 3
const QUIET_HOURS_START = 22
const QUIET_HOURS_END = 8

export async function matchStudentsToEvents() {
  if (!config.proactive.enabled) return

  const now = new Date()
  const hour = now.getHours()

  if (hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END) {
    log('info', 'proactive_quiet_hours', { hour })
    return
  }

  const { data: students } = await supabase
    .from('students')
    .select('id, wechat_open_id, imessage_id, interests, major, notification_prefs')
    .eq('onboarding_complete', true)

  if (!students || students.length === 0) return

  const rolloutPct = config.proactive.rolloutPct
  const eligibleStudents = students.filter(() => Math.random() * 100 < rolloutPct)

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60_000).toISOString()
  const { data: newEvents } = await supabase
    .from('events')
    .select('id, title, date, location, category, source')
    .eq('status', 'active')
    .gte('created_at', sixHoursAgo)
    .gt('date', now.toISOString())

  if (!newEvents || newEvents.length === 0) return

  for (const student of eligibleStudents) {
    const today = now.toISOString().slice(0, 10)
    const { count: todayPushes } = await supabase
      .from('proactive_log')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .gte('sent_at', `${today}T00:00:00Z`)

    if ((todayPushes || 0) >= MAX_DAILY_PUSHES) continue

    const matchingEvents = newEvents.filter((event) => {
      const interests = student.interests || []
      const major = student.major || ''
      const eventText = `${event.title} ${event.category}`.toLowerCase()
      return interests.some((i: string) => eventText.includes(i.toLowerCase())) ||
        eventText.includes(major.toLowerCase())
    })

    if (matchingEvents.length === 0) continue

    const event = matchingEvents[0]

    const { data: alreadySent } = await supabase
      .from('proactive_log')
      .select('id')
      .eq('student_id', student.id)
      .eq('event_id', event.id)
      .single()

    if (alreadySent) continue

    try {
      const message = await callLightweightLLM([
        {
          role: 'system',
          content: `You are George Tirebiter, a mischievous ghost dog at USC. Write a SHORT (1-2 sentences) proactive event recommendation in George's voice. Mix Chinese and English naturally. Be enthusiastic but not pushy.`,
        },
        {
          role: 'user',
          content: `Event: ${event.title} on ${event.date} at ${event.location}. Category: ${event.category}. Student interests: ${(student.interests || []).join(', ')}. Major: ${student.major || 'unknown'}.`,
        },
      ], { maxTokens: 100 })

      const platform = student.wechat_open_id ? 'wechat' as const : 'imessage' as const
      const platformId = (student.wechat_open_id || student.imessage_id) as string
      await sendPlatformMessage(platform, platformId, message)

      await supabase.from('proactive_log').insert({
        student_id: student.id,
        event_id: event.id,
        platform,
        status: 'sent',
      })

      log('info', 'proactive_sent', { studentId: student.id, eventId: event.id })
    } catch (err) {
      log('error', 'proactive_send_error', { studentId: student.id, error: (err as Error).message })
      await supabase.from('proactive_log').insert({
        student_id: student.id,
        event_id: event.id,
        platform: student.wechat_open_id ? 'wechat' : 'imessage',
        status: 'failed',
      })
    }
  }
}
