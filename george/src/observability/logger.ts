import { supabase } from '../db/client.js'

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  event: string
  data: Record<string, unknown>
  timestamp: string
}

export function log(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    level,
    event,
    data,
    timestamp: new Date().toISOString(),
  }

  const output = JSON.stringify(entry)
  if (level === 'error') {
    console.error(output)
  } else if (level === 'warn') {
    console.warn(output)
  } else {
    console.log(output)
  }
}

export async function getStats() {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString()

  const [
    { count: totalStudents },
    { count: totalMessages },
    { count: todayMessages },
    { count: totalEvents },
    { count: activeEvents },
    { count: totalMemories },
    { count: proactiveSent },
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00Z`),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('student_memories').select('id', { count: 'exact', head: true }),
    supabase.from('proactive_log').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', thirtyDaysAgo),
  ])

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const { count: weeklyActive } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .gte('last_active_at', sevenDaysAgo)

  return {
    students: { total: totalStudents || 0, weeklyActive: weeklyActive || 0 },
    messages: { total: totalMessages || 0, today: todayMessages || 0 },
    events: { total: totalEvents || 0, active: activeEvents || 0 },
    memories: totalMemories || 0,
    proactiveMessagesSent30d: proactiveSent || 0,
    uptime: process.uptime(),
    timestamp: now.toISOString(),
  }
}
