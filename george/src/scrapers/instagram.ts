// Weekly scraper for USC student-org Instagram accounts. Pulls recent posts
// through the apify/instagram-scraper actor, asks the lightweight LLM to
// extract structured event info, validates the output with validatePost, and
// inserts status='active' rows into the events table. Degrades gracefully
// when APIFY_TOKEN is unset.
//
// Intentionally does NOT call matchStudentsToEvents() here — that's wired in
// the cron handler in src/index.ts so admin-endpoint scrapes don't trigger
// student pushes (eng-review Finding D, 2026-05-03). Insert errors other than
// Postgres 23505 (unique_violation, expected race resolution) are logged.
//
// See docs/plans/2026-04-22-instagram-scraper-design.md and the spec
// amendment in fix/geo-rate-limit-and-ig-spec.
//
// Header last reviewed: 2026-05-03

import { ApifyClient } from 'apify-client'
import { callLightweightLLM } from '../agent/llm-providers.js'
import { config } from '../config.js'
import { supabase } from '../db/client.js'
import { log } from '../observability/logger.js'
import { flattenHandles } from './ig-accounts.js'
import { validatePost } from './instagram-validate.js'

interface ApifyPost {
  caption?: string
  displayUrl?: string
  timestamp?: string
  url?: string
  ownerUsername?: string
}

const RESULTS_LIMIT = 3
const ACTOR_ID = 'apify/instagram-scraper'

const LLM_SYSTEM_PROMPT =
  'Analyze this Instagram post and decide if it announces an upcoming event. ' +
  'If you are unsure whether the post announces an event, set isEvent=false. ' +
  'Respond in JSON with these exact keys: ' +
  '{"isEvent": true|false, "title": "event name", "description": "brief desc", ' +
  '"date": "ISO 8601 or null", "location": "venue or null", ' +
  '"category": "social|academic|career|cultural|sports|other"}'

async function extractEventFromPost(post: ApifyPost): Promise<unknown> {
  try {
    const raw = await callLightweightLLM(
      [
        { role: 'system', content: LLM_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Caption: ${post.caption || '(no caption)'}\nPosted by: @${post.ownerUsername || ''}\nImage URL: ${post.displayUrl || 'none'}`,
        },
      ],
      { maxTokens: 200, jsonMode: true },
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function scrapeInstagram(): Promise<void> {
  if (!config.apify.token) {
    log('warn', 'instagram_unavailable', { reason: 'no_apify_token' })
    return
  }

  const handles = flattenHandles()
  log('info', 'instagram_scrape_start', { accounts: handles.length })

  let scraped = 0
  let candidates = 0
  let events_inserted = 0
  let llm_rejected = 0
  let validation_rejected = 0

  try {
    const apify = new ApifyClient({ token: config.apify.token })
    const run = await apify.actor(ACTOR_ID).call({
      username: handles,
      resultsLimit: RESULTS_LIMIT,
      resultsType: 'posts',
    })

    const { items } = await apify.dataset(run.defaultDatasetId).listItems()
    scraped = items.length

    for (const post of items as ApifyPost[]) {
      candidates++

      if (post.url) {
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('source_url', post.url)
          .maybeSingle()
        if (existing) continue
      }

      const llmOut = await extractEventFromPost(post)
      if (llmOut === null) {
        llm_rejected++
        continue
      }

      const result = validatePost(llmOut)
      if (!result.valid) {
        if (result.reason === 'not_event' || result.reason === 'not_object') {
          llm_rejected++
        } else {
          validation_rejected++
        }
        continue
      }

      const insertResult = await supabase.from('events').insert({
        title: result.event.title,
        description: result.event.description,
        date: result.event.date,
        location: result.event.location,
        category: result.event.category,
        source: 'instagram',
        source_url: post.url,
        source_account: post.ownerUsername,
        image_url: post.displayUrl,
        status: 'active',
      })
      if (insertResult && insertResult.error) {
        const code = (insertResult.error as { code?: string }).code
        if (code === '23505') {
          continue
        }
        log('warn', 'instagram_insert_failed', {
          code,
          message: (insertResult.error as { message?: string }).message,
        })
        continue
      }
      events_inserted++
    }
  } catch (err) {
    log('warn', 'instagram_unavailable', { error: (err as Error).message })
    return
  }

  log('info', 'instagram_scrape_done', {
    accounts: handles.length,
    scraped,
    candidates,
    events_inserted,
    llm_rejected,
    validation_rejected,
  })
}
