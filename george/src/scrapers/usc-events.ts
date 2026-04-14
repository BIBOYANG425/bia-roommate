import { supabase } from '../db/client.js'
import { log } from '../observability/logger.js'

const USC_EVENT_SOURCES = [
  'https://events.usc.edu/feed.json',
]

interface USCEvent {
  title: string
  description?: string
  start?: string
  end?: string
  location?: string
  url?: string
  category?: string
}

export async function scrapeUSCEvents() {
  log('info', 'usc_scrape_start', {})
  let eventsFound = 0

  for (const sourceUrl of USC_EVENT_SOURCES) {
    try {
      const res = await fetch(sourceUrl)
      if (!res.ok) {
        log('warn', 'usc_scrape_fetch_error', { url: sourceUrl, status: res.status })
        continue
      }

      const events = (await res.json()) as USCEvent[]

      for (const event of events) {
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('source_url', event.url || sourceUrl)
          .eq('title', event.title)
          .single()

        if (existing) continue

        await supabase.from('events').insert({
          title: event.title,
          description: event.description,
          date: event.start,
          end_date: event.end,
          location: event.location,
          category: event.category || 'other',
          source: 'usc',
          source_url: event.url || sourceUrl,
        })
        eventsFound++
      }
    } catch (err) {
      log('error', 'usc_scrape_error', { url: sourceUrl, error: (err as Error).message })
    }
  }

  log('info', 'usc_scrape_done', { eventsFound })
}
