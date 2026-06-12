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

-- Mark the known seed/test profiles (TEST 1, TOMMY TROJAN). No-op on
-- environments that don't have them.
UPDATE public.roommate_profiles
SET is_test = true
WHERE name IN ('TEST 1', 'TOMMY TROJAN');

-- Public browse now excludes test rows in addition to invisible ones.
DROP POLICY IF EXISTS "read_visible_profiles" ON public.roommate_profiles;
CREATE POLICY "read_visible_profiles" ON public.roommate_profiles FOR SELECT
  USING (visible = true AND is_test = false);
