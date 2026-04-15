-- Onboarding tracking columns
-- - intro_sent_at: stamped after George sends his self-introduction (used to gate first-contact intro across reconnects/races)
-- - onboarding_turn_count: incremented each turn while onboarding is incomplete; drives wrap-up mode after N stuck turns

alter table students
  add column if not exists intro_sent_at timestamptz,
  add column if not exists onboarding_turn_count int default 0;

-- Backfill: any existing student with history is past the intro stage already
update students
set intro_sent_at = coalesce(intro_sent_at, updated_at)
where intro_sent_at is null;
