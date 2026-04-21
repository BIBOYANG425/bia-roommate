-- Shipping — web-app auth bridge for students
--
-- Context: the shipping feature (introduced in 20260419_shipping.sql) assumes
-- a way to resolve the currently-signed-in Supabase-Auth user to their
-- students row so we can auto-provision a member_id and address before the
-- user has created their first parcel. The George-maintained students table
-- was originally keyed only on platform IDs (wechat_open_id, imessage_id),
-- so there was no direct bridge from auth.users.
--
-- This migration adds public.students.user_id with a UNIQUE FK to
-- auth.users(id) and a helper that upserts/returns the student row for the
-- current web-app user.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Bridge column
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students (user_id)
  WHERE user_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Upsert helper: call with the current auth.uid() to get/create the row
--    and guarantee member_id is populated. SECURITY DEFINER so the web app's
--    anon JWT can invoke it without needing direct students writes.
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ensure_student_for_current_user(
  p_name text DEFAULT NULL
) RETURNS TABLE (id uuid, member_id text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  sid uuid;
  mid text;
  sname text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT s.id, s.member_id, s.name
    INTO sid, mid, sname
    FROM public.students s
    WHERE s.user_id = uid;

  IF sid IS NULL THEN
    mid := public.generate_member_id();
    INSERT INTO public.students (user_id, name, member_id)
      VALUES (uid, coalesce(p_name, ''), mid)
      RETURNING students.id, students.name INTO sid, sname;
  ELSIF mid IS NULL THEN
    mid := public.generate_member_id();
    UPDATE public.students SET member_id = mid WHERE public.students.id = sid;
  END IF;

  -- Optionally refresh name if provided and changed
  IF p_name IS NOT NULL AND p_name <> '' AND p_name IS DISTINCT FROM sname THEN
    UPDATE public.students SET name = p_name WHERE public.students.id = sid;
    sname := p_name;
  END IF;

  RETURN QUERY SELECT sid, mid, sname;
END;
$$;

-- Only authenticated users can call; anon cannot.
REVOKE ALL ON FUNCTION public.ensure_student_for_current_user(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_student_for_current_user(text) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Self-read policy on students (so the address page can fetch the row
--    after upsert). Users only ever see their own bridged row.
-- ──────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "read_own_student_row" ON public.students;
CREATE POLICY "read_own_student_row" ON public.students FOR SELECT
  USING (user_id = auth.uid());

-- End of 20260419_shipping_user_link.sql
