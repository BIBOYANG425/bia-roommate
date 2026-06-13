-- Prevent seed/test profiles from leaking into the public roommates list.
-- Apply via Supabase dashboard SQL editor or `supabase db push`.
--
-- Adds an explicit is_test flag and folds it into the public read policy, so a
-- row marked is_test = true is hidden from everyone regardless of its `visible`
-- value — the durable prevention asked for in issue #77. Enforcing it in RLS
-- (rather than a client-side filter) means no app change is required and the
-- roommates list can't break if the app deploys before this migration runs.

ALTER TABLE public.roommate_profiles
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- The read policy below references is_test. The contact-privacy migration
-- grants anon an explicit column allowlist that omits is_test, so grant it
-- here — before the policy is created — so anon's read path always has the
-- column available.
GRANT SELECT (is_test) ON public.roommate_profiles TO anon;

-- Mark the known seed/test profiles (TEST 1, TOMMY TROJAN). Guarded on
-- user_id IS NULL: seed rows are inserted without an auth user, while every
-- real submission sets user_id (the insert RLS requires auth.uid()), so a
-- genuine signed-up user who happens to share one of these names is never
-- hidden. (A literal id IN (...) match would be stronger, but the canonical
-- row UUIDs aren't reachable from this environment.) No-op where absent.
UPDATE public.roommate_profiles
SET is_test = true
WHERE name IN ('TEST 1', 'TOMMY TROJAN')
  AND user_id IS NULL;

-- Public browse now excludes test rows in addition to invisible ones.
DROP POLICY IF EXISTS "read_visible_profiles" ON public.roommate_profiles;
CREATE POLICY "read_visible_profiles" ON public.roommate_profiles FOR SELECT
  USING (visible = true AND is_test = false);
