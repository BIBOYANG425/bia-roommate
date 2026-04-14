import { supabase } from './client.js'

export async function searchEvents(filters: {
  query?: string
  category?: string
  fromDate?: string
  toDate?: string
  limit?: number
}) {
  let q = supabase
    .from('events')
    .select('id, title, date, location, category, source')
    .eq('status', 'active')
    .order('date', { ascending: true })
    .limit(filters.limit || 10)

  if (filters.fromDate) q = q.gte('date', filters.fromDate)
  if (filters.toDate) q = q.lte('date', filters.toDate)
  if (filters.category) q = q.eq('category', filters.category)
  if (filters.query) q = q.ilike('title', `%${filters.query}%`)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getEventById(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
  if (error) throw error
  return data
}
