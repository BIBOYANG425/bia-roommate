import { supabase } from './client.js'

export async function createReminder(studentId: string, eventId: string, remindAt: string, platform: string) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({ student_id: studentId, event_id: eventId, remind_at: remindAt, platform })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPendingReminders() {
  const { data } = await supabase
    .from('reminders')
    .select('*, students(id, wechat_open_id, imessage_id, name), events(title, date, location)')
    .eq('sent', false)
    .lte('remind_at', new Date().toISOString())
  return data || []
}

export async function markReminderSent(id: string) {
  await supabase.from('reminders').update({ sent: true }).eq('id', id)
}
