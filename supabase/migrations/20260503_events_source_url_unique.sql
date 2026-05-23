-- Partial UNIQUE index on events.source_url to make scraper dedup race-safe.
-- Two concurrent scrapeInstagram() runs (cron + admin endpoint) could both
-- pass their .eq('source_url').maybeSingle() check and then both insert;
-- without a UNIQUE constraint that produces duplicate rows that the
-- proactive matcher would push twice. The partial WHERE keeps null
-- source_url permitted (USC events sometimes have nulls).
--
-- The scraper insert path is also updated to swallow Postgres 23505
-- (unique_violation) silently, treating it as the expected race resolution.
-- Any other error is logged with `instagram_insert_failed`.

CREATE UNIQUE INDEX IF NOT EXISTS events_source_url_unique
  ON public.events (source_url)
  WHERE source_url IS NOT NULL;
