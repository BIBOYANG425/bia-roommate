-- Restrict contact details to signed-in users at the database level.
-- Apply via Supabase dashboard SQL editor or `supabase db push`.
--
-- Background: 20260426_roommate_profiles_grants granted table-wide SELECT to
-- `anon`, so a logged-out visitor could read every student's `contact` and
-- `contact_channels` (WeChat / phone / Instagram) directly over the anon key,
-- even though the profile modal now hides them in the UI. RLS row policies
-- (read_visible_profiles) gate *rows*, not *columns*, so they can't fix this.
--
-- Fix: replace anon's table-wide SELECT with a column-scoped grant that
-- excludes `contact` and `contact_channels`. `authenticated` keeps full SELECT
-- (granted in 20260426), so signed-in users still see contact info. This pairs
-- with the client change that selects an explicit non-contact column list for
-- logged-out visitors (app/roommates/page.tsx PUBLIC_PROFILE_COLUMNS).

REVOKE SELECT ON public.roommate_profiles FROM anon;

GRANT SELECT (
  id,
  user_id,
  name,
  school,
  gender,
  major,
  year,
  enrollment_term,
  sleep_habit,
  clean_level,
  noise_level,
  music_habit,
  study_style,
  hobbies,
  tags,
  avatar_url,
  bio,
  visible,
  created_at,
  updated_at
) ON public.roommate_profiles TO anon;
