import { callLightweightLLM } from '../agent/llm-providers.js'
import { config } from '../config.js'
import { supabase } from '../db/client.js'
import { log } from '../observability/logger.js'

interface InstagramPost {
  caption?: string
  displayUrl?: string
  timestamp?: string
  url?: string
  ownerUsername?: string
}

async function extractEventFromPost(post: InstagramPost) {
  try {
    const result = await callLightweightLLM([
      {
        role: 'system',
        content: `Analyze this Instagram post and determine if it's promoting an event. Respond in JSON:
{"isEvent": true/false, "title": "event name", "description": "brief desc", "date": "ISO 8601 or null", "location": "venue or null", "category": "social/academic/career/cultural/sports/other"}`,
      },
      {
        role: 'user',
        content: `Caption: ${post.caption || '(no caption)'}\nPosted by: @${post.ownerUsername}\nImage URL: ${post.displayUrl || 'none'}`,
      },
    ], { maxTokens: 200, jsonMode: true })
    return JSON.parse(result)
  } catch {
    return null
  }
}

export async function scrapeInstagram(accounts?: string[]) {
  const handles = accounts || []
  if (handles.length === 0) {
    log('info', 'instagram_skip', { reason: 'No accounts configured' })
    return
  }

  log('info', 'instagram_scrape_start', { accounts: handles.length })

  try {
    const { ApifyClient } = await import('apify-client')
    const apify = new ApifyClient({ token: config.apify.token })

    const run = await apify.actor('apify/instagram-post-scraper').call({
      username: handles,
      resultsLimit: 10,
    })

    const { items } = await apify.dataset(run.defaultDatasetId).listItems()
    let eventsFound = 0

    for (const post of items as InstagramPost[]) {
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('source_url', post.url || '')
        .single()

      if (existing) continue

      const eventInfo = await extractEventFromPost(post)

      if (eventInfo?.isEvent && eventInfo.title) {
        await supabase.from('events').insert({
          title: eventInfo.title,
          description: eventInfo.description,
          date: eventInfo.date,
          location: eventInfo.location,
          category: eventInfo.category,
          source: 'instagram',
          source_url: post.url,
          source_account: post.ownerUsername,
          image_url: post.displayUrl,
        })
        eventsFound++
      }
    }

    log('info', 'instagram_scrape_done', { eventsFound })
  } catch (err) {
    log('warn', 'instagram_unavailable', { error: (err as Error).message })
  }
}
