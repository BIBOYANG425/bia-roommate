-- Grant table-level privileges on roommate_profiles. RLS policies exist
-- but Postgres still requires SQL-level grants before those policies are
-- evaluated. Without these grants every authenticated INSERT/UPDATE
-- returns "permission denied for table roommate_profiles".

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roommate_profiles TO authenticated;
GRANT SELECT ON public.roommate_profiles TO anon;
