# Instagram scraper — real-key smoke test runbook

One-time check to run after setting `APIFY_TOKEN` in prod (or local `.env`).

## Prereq

1. APIFY account on the Starter $5/mo plan.
2. `APIFY_TOKEN` set in the same environment `george` runs in.
3. `ADMIN_TOKEN` env var set on the server (same one used for `/admin/scrape-usc`).
4. George process restarted so the new `APIFY_TOKEN` is picked up (`config.ts` reads env at import).

## Trigger

```bash
curl -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    https://<george-host>/admin/scrape-instagram
```

Expected response: `{"status":"ok"}` (HTTP 200).

The admin endpoint runs the scrape synchronously and returns when it completes
(can take ~30s-3min). If your hosting platform caps request duration (Vercel
free tier: 10s; Pro: 60s), the request will time out even though the scrape
keeps running. If that happens, follow up by switching to a 202+background
pattern (TODO; not in scope until Bob confirms hosting is Vercel-style).

The cron runs separately at Mon 12:00 PT — admin trigger is only for
on-demand smoke tests. Admin triggers do NOT push events to students;
only the cron path fires `matchStudentsToEvents()` after the scrape.

## What to check

1. Server logs should show one `instagram_scrape_start` line followed by one
   `instagram_scrape_done` with counters:
   ```
   {
     accounts: 2,                     # thin slice: troylabsusc + sparksc
     scraped: ~6,                     # 2 accounts × resultsLimit=3
     candidates: ~6,
     events_inserted: 0-3,
     llm_rejected: N,
     validation_rejected: N
   }
   ```
   On a quiet week most posts are not events; expect events_inserted between 0 and 2.

2. Open Supabase dashboard → `events` table. Filter `source = 'instagram'` AND
   `created_at > now() - interval '5 minutes'`. Rows should have:
   - `status='active'`
   - populated `source_url`, `source_account`, `image_url`
   - a future `date`
   - description with phone numbers / Venmo / email replaced by `[contact removed]`

3. APIFY console → Actors → Runs. Verify there is one run for
   `apify/instagram-scraper` and it consumed less than $0.25 in compute credits.

## Rollback

If the inserted rows look wrong, archive them:

```sql
UPDATE events
    SET status = 'archived'
    WHERE source = 'instagram'
    AND created_at > now() - interval '1 hour';
```

Then open a GitHub issue with the logged counters and a screenshot of the
worst offending row. Do not delete the rows — keep them for LLM prompt tuning.

## Leaving it on

After one successful smoke test, the weekly cron at `0 12 * * 1` (Mon noon PT)
picks up automatically. No further action unless APIFY burn rate or LLM
accuracy data says otherwise.

## Open follow-ups (tracked here in lieu of GitHub issues)

- **Wedge confirmation**: `frats: []` in `ig-accounts.ts` until Bob picks
  cultural-org / pre-pro replacement list (CEO review 2026-04-25 finding #2).
- **Hosting platform**: confirm whether george deploys somewhere with a hard
  request cap (Vercel-style) — if yes, convert admin endpoint to 202+background.
- **LLM accuracy review**: after 4 weeks of real data, review
  `instagram_scrape_done` counters and decide whether to add a moderation
  flow (CEO review finding #4).
- **Flyer-image vision model**: CEO review finding #3, deferred until LLM
  accuracy data justifies the cost increase.
