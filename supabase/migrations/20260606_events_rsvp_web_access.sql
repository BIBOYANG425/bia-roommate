-- ──────────────────────────────────────────────────────────────────────────
-- Events RSVP — web access layer  (Retention roadmap · Phase 2 · slice 1)
--
-- events / event_attendance are george-owned tables (service-role access). The
-- student-facing web app (bia-roommate) must NEVER use the service-role key
-- (security boundary), so web access is exposed via RLS + SECURITY DEFINER RPCs
-- — the same pattern as ensure_student_for_current_user. george (service-role)
-- is unaffected (it bypasses RLS).
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Public read of active events (anon/authenticated). george/service-role bypass RLS.
DO $$ BEGIN
  ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "public_read_active_events" ON public.events;
CREATE POLICY "public_read_active_events" ON public.events FOR SELECT
  USING (status = 'active');

-- 2. list_events_with_rsvp() — upcoming active events + rsvp_count + whether the
--    caller has RSVP'd (anon → always false). SECURITY DEFINER so it can
--    aggregate attendance and resolve the caller's student without exposing
--    event_attendance rows directly to the client.
CREATE OR REPLACE FUNCTION public.list_events_with_rsvp()
RETURNS TABLE (
  id uuid, title text, description text, date timestamptz, end_date timestamptz,
  location text, category text, source text, source_url text, image_url text,
  capacity int, rsvp_count bigint, is_rsvped boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.title, e.description, e.date, e.end_date, e.location, e.category,
         e.source, e.source_url, e.image_url, e.capacity,
         coalesce(c.cnt, 0) AS rsvp_count,
         (me.event_id IS NOT NULL) AS is_rsvped
  FROM public.events e
  LEFT JOIN (
    SELECT event_id, count(*) AS cnt
    FROM public.event_attendance
    WHERE source = 'rsvp'
    GROUP BY event_id
  ) c ON c.event_id = e.id
  LEFT JOIN (
    SELECT ea.event_id
    FROM public.event_attendance ea
    JOIN public.students s ON s.id = ea.student_id
    WHERE ea.source = 'rsvp' AND s.user_id = auth.uid()
  ) me ON me.event_id = e.id
  WHERE e.status = 'active'
    AND (e.date IS NULL OR e.date >= now() - interval '12 hours')
  ORDER BY e.date ASC NULLS LAST
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.list_events_with_rsvp() FROM public;
GRANT EXECUTE ON FUNCTION public.list_events_with_rsvp() TO anon, authenticated;

-- 3. rsvp_event / unrsvp_event — authenticated only. Bridge the web user to their
--    students row (auto-create via ensure_student_for_current_user) and write/
--    remove the event_attendance(source='rsvp') row. Idempotent.
CREATE OR REPLACE FUNCTION public.rsvp_event(p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT s.id INTO sid FROM public.ensure_student_for_current_user(NULL) s LIMIT 1;
  INSERT INTO public.event_attendance (student_id, event_id, source)
    VALUES (sid, p_event_id, 'rsvp')
    ON CONFLICT (student_id, event_id) DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.rsvp_event(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unrsvp_event(p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO sid FROM public.students WHERE user_id = auth.uid();
  IF sid IS NOT NULL THEN
    DELETE FROM public.event_attendance
      WHERE student_id = sid AND event_id = p_event_id AND source = 'rsvp';
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.unrsvp_event(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.unrsvp_event(uuid) TO authenticated;
