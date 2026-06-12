-- Hide seed/test profiles from the public roommate list.
-- Apply via Supabase dashboard SQL editor or `supabase db push`.
--
-- "TEST 1" and "TOMMY TROJAN" are non-real profiles that shipped to prod and
-- show up in the live roommates list. The list query filters on visible = true,
-- so flipping the flag removes them while keeping the rows recoverable. This is
-- a no-op on environments that don't have these rows.
--
-- If you want them gone permanently instead, replace the UPDATE with:
--   DELETE FROM public.roommate_profiles WHERE name IN ('TEST 1', 'TOMMY TROJAN');

UPDATE public.roommate_profiles
SET visible = false
WHERE name IN ('TEST 1', 'TOMMY TROJAN');
