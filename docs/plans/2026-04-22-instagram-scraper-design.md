# Instagram APIFY event scraper design

Every week, pull recent posts from a hard coded list of USC student org Instagram
handles (frats, Troy Labs, SEP), use the lightweight LLM to decide which posts
announce an event, and insert valid ones into the existing `events` table so
George's proactive matcher can push them to students.

Status: approved 2026-04-22 (Bob scope confirmed on WeChat same day: frats +
Troy Labs + SEP, weekly cron, APIFY Starter $5/mo plan).
Owner: George agent (`george/src/scrapers/instagram.ts`).

## Problem

George recommends events to students through the `events` table. USC on campus
events get scraped from `events.usc.edu/feed.json` (see `usc-events.ts`), but
student organization events never show up there. Frats, Troy Labs and SEP
announce most of their events on Instagram instead. Without an IG source,
George silently misses the majority of what students actually care about.

An existing placeholder scraper (`george/src/scrapers/instagram.ts`, 86 lines)
was stubbed out earlier but never finished: it targets the wrong actor
(`apify/instagram-post-scraper` instead of the full feature
`apify/instagram-scraper` Bob asked for), its cron fires every four hours with
no account list, `apify-client` is not installed, and it does no validation on
LLM output before writing to the DB.

## Goal

One weekly job that turns ~25 student org IG handles into validated rows in
the existing `events` table with zero changes to the downstream matching or
reminder paths.

Non goals:
- Review/moderation workflow. Scraped events write `status='active'` and go
  live immediately. Bob accepts occasional misfires in return for zero
  operational overhead. If LLM accuracy turns out to be poor in practice we
  revisit (e.g. `status='pending'` + admin approval endpoint).
- Dynamic account management. Adding a handle requires a code change.
- Catchup / backfill if a cron fires miss. Weekly frequency means the next run
  picks up whatever is fresh; an eight day gap is fine.
- Image analysis, comment scraping, hashtag scraping. Captions + `displayUrl`
  only.
- Expanding to all USC RSOs. Scope stays at frats + Troy Labs + SEP for this
  iteration. Wider coverage waits until (a) Starter burn rate data justifies
  the Personal $49/mo upgrade and (b) there is a systematic way to source
  handles for the long tail.

## Architecture

```
weekly cron (Mon 00:00 UTC = Sun 17:00 PT)
    │
    ▼
scrapeInstagram()                         george/src/scrapers/instagram.ts
    │
    ├── apify.actor('apify/instagram-scraper').call({
    │       username: flat(IG_ACCOUNTS),      // ~25 handles, 3 groups
    │       resultsLimit: 3,                   // Starter $5 safe budget
    │       resultsType: 'posts',
    │   })
    │
    └── for each post:
          ├── dedup: SELECT events WHERE source_url = post.url → skip if hit
          ├── extractEventFromPost(post)        // lightweight LLM, JSON mode
          ├── validatePost(llmResult)           // pure fn, rejects garbage
          └── insert events { status='active', source='instagram', ... }
```

### File layout

```
george/src/scrapers/
    instagram.ts          rewritten: actor + validation + resultsLimit=3
    ig-accounts.ts        new: const IG_ACCOUNTS = { frats, troyLabs, sep }
                          with flat() helper. Mirrors USC_EVENT_SOURCES pattern.

george/src/index.ts       cron: '0 */4 * * *' → '0 0 * * 1'

george/package.json       add: apify-client (drops @ts-expect-error dynamic import)
george/.env.example       add: APIFY_TOKEN= (config.ts already reads it, but the
                          example file never documented it)

george/tests/scrapers/
    instagram.test.ts     new: mock apify + mock LLM, covers validation rules,
                          dedup, insert shape, graceful degrade on no token
```

### Validation rules (`validatePost`)

Pure function `(llmOutput: unknown) => { valid: true, event: EventInsert } | { valid: false, reason: string }`. All five rules must pass:

1. `isEvent === true` (LLM must explicitly affirm)
2. `typeof title === 'string' && 5 <= title.length <= 120`
3. `date` parses to a valid ISO date in the window `[now, now + 180 days]`
4. `category` is one of `{social, academic, career, cultural, sports, other}`;
   anything else is coerced to `'other'` (not a reject)
5. JSON.parse on LLM output succeeded (handled upstream by
   `extractEventFromPost`, but `validatePost` also guards against `null`)

The LLM prompt is updated with one sentence of conservative bias:
> "If you are unsure whether the post announces an event, set isEvent=false."

This reduces the false positive rate we care about (fluff posts tagged as
events) at the cost of some false negatives (real events missed), which is the
right tradeoff because the scraper runs weekly and the same account will post
again.

### Data flow is unchanged downstream

Rows are written with `status='active'` and `source='instagram'`. The existing
`searchEvents()` in `db/events.ts` already filters `status='active'`. The
proactive matcher (`jobs/proactive.ts`) already pulls from `events` on a three
hour cron. Nothing else needs to know this scraper exists.

### Error handling

| Failure | Behavior |
|---|---|
| `APIFY_TOKEN` unset | cron logs `instagram_unavailable`, returns; server does not crash on boot |
| APIFY actor call throws (rate limit, network) | log `instagram_unavailable`, return; next week retries |
| Single post: LLM JSON parse fails | skip that post, increment `llm_rejected` counter, continue |
| Single post: validation fails | skip that post, increment `validation_rejected` counter, continue |
| Single post: insert hits unique violation (dedup race) | ignore, continue |

Matches existing project convention that external integrations degrade
gracefully when keys are missing (cf. Google Maps geo tools, WeChat, iMessage).

### Logging

One info log at start, one info log at end with the full counter shape:

```
log('info', 'instagram_scrape_done', {
    accounts: number,
    scraped: number,          // posts returned by apify
    candidates: number,       // posts that weren't already in the DB
    events_inserted: number,  // passed validation
    llm_rejected: number,     // JSON parse or isEvent=false
    validation_rejected: number,
})
```

Lets us eyeball LLM accuracy in the first few weeks without adding a
moderation UI.

## Cost model

| Variable | Value |
|---|---|
| Accounts | ~25 (frats + Troy Labs + SEP) |
| `resultsLimit` | 3 posts per account |
| Cron | weekly (4.3 runs/month) |
| Posts scraped per month | ~325 |
| APIFY actor cost | ~$0.006-0.015 per post |
| Monthly budget | $1.95 - $4.88 |
| Plan | Starter $5/mo |
| Headroom | ~$0.10 - $3.00 |

Resolution if actual burn exceeds $5: first lever is `resultsLimit=2` (cuts
~33%); second lever is dropping to bi weekly; third lever is upgrading Bob to
Personal $49. We log enough data to make this call after 4 weeks of real
operation.

## Testing

Unit tests on `validatePost`:
- 5 happy paths across the category whitelist
- Rejects: `isEvent=false`, title too short, title too long, date null, date
  in the past, date > 180 days out
- Coerces (does not reject): unknown category → `'other'`
- Null / malformed LLM output handled without throwing

Integration test for `scrapeInstagram`:
- Mock `ApifyClient` to return 3 posts (one valid event, one past date, one
  non event)
- Mock `callLightweightLLM` to return the corresponding three JSON payloads
- Assert: 1 insert call with correct shape; 2 skipped; `instagram_scrape_done`
  log has the right counters

No real APIFY calls in tests. Real smoke test is deferred to Bob running
`POST /admin/scrape-instagram` once `APIFY_TOKEN` is set in prod env.

## Risks accepted

Three issues this iteration accepts; revisit if they bite:

1. **Apify single point of failure.** If `apify/instagram-scraper` breaks
   when Instagram ships anti-scrape changes, the pipeline goes dark with
   no internal fallback. Graceful-degrade keeps the rest of George
   running. Long-term mitigation if outages recur: RSS or manual
   submission backfill.

2. **Instagram CDN URLs expire.** `displayUrl` passes through unchanged;
   IG rotates these on a weeks-to-months window so older events end up
   with broken thumbnails. Acceptable for v1 (stale image on a past
   event is low-impact). If users complain, re-host to Supabase storage
   at insert time.

3. **No content moderation on captions.** Frat / Troy Labs / SEP captions
   regularly contain Venmo handles, phone numbers, and party context
   that doesn't belong in a surfaced event card. Direct publish
   (`status='active'`) sends whatever the LLM accepts straight to users.
   Two-line mitigation: regex-strip phone / Venmo / email from the
   description inside `validatePost` before insert. Heavier moderation
   (review queue) deferred to the same follow-up as LLM false-positive
   handling.

## Not doing (YAGNI)

- Pending-review workflow (chose direct publish)
- DB-backed or env-backed account list (chose hardcoded)
- Cron catchup after missed weeks
- LLM `confidence` field
- Per-post retry with exponential backoff (APIFY handles that internally)
- Image download / re-hosting (keep APIFY's `displayUrl` pass through)
- Comment / hashtag scraping

## Follow ups

- After 4 weeks of real data: review `instagram_scrape_done` counters, adjust
  `resultsLimit` or frequency, decide whether Personal upgrade is justified.
- If LLM false positive rate is high enough that Bob complains, revisit with
  `status='pending'` + admin publish endpoint.
- Expansion to more RSOs is out of scope for this iteration.
