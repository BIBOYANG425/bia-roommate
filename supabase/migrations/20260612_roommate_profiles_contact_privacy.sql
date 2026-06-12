-- Restrict contact details to signed-in users at the database level.
-- Apply via Supabase dashboard SQL editor or `supabase db push`.
--
-- Background: 20260426_roommate_profiles_grants granted table-wide SELECT to
-- `anon`, so a logged-out visitor could read every student's `contact` and
-- `contact_channels` (WeChat / phone / Instagram) directly over the anon key,
-- even though the profile modal now hides them in the UI. RLS row policies
-- (read_visible_profiles) gate *rows*, not *columns*, so they can't fix this.
--
-- Fix: replace anon's table-wide SELECT with a column-scoped grant covering
-- every column EXCEPT `contact` / `contact_channels`. The column list is built
-- dynamically from the live schema so it stays correct regardless of which
-- optional columns a given environment actually has. `authenticated` keeps
-- full SELECT (granted in 20260426), so signed-in users still see contact info.
-- This pairs with the client change that selects an explicit non-contact column
-- list for logged-out visitors (app/roommates/page.tsx PUBLIC_PROFILE_COLUMNS).

DO $$
DECLARE
  col text;
BEGIN
  -- Drop the table-wide grant; column privileges only take effect once the
  -- broad grant is gone.
  REVOKE SELECT ON public.roommate_profiles FROM anon;

  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'roommate_profiles'
      AND column_name NOT IN ('contact', 'contact_channels')
  LOOP
    EXECUTE format(
      'GRANT SELECT (%I) ON public.roommate_profiles TO anon',
      col
    );
  END LOOP;
END $$;
