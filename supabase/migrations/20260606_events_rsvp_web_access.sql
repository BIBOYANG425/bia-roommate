-- ──────────────────────────────────────────────────────────────────────────
-- Events RSVP — web access layer  (Retention roadmap · Phase 2 · slice 1)
--
-- events / event_attendance are george-owned tables (service-role access). The
-- student-facing web app (bia-roommate) must NEVER use the service-role key
-- (security boundary), so web access is exposed via RLS + SECURITY DEFINER RPCs
-- — the same pattern as ensure_student_for_current_user. george (service-role)
-- is unaffected (it bypasses RLS).
--
-- Data model: RSVP and check-in are two INDEPENDENT timestamp columns, NOT the
-- legacy `source` text column. The live admin check-in (bia-admin) upserts
-- source 'rsvp'→'checkin' on the same unique(student_id, event_id) key, so a
-- single enum column cannot encode both facts — a check-in would silently
-- erase the RSVP (and the unique key would block the student from ever
-- re-RSVPing). Shared column contract (bia-roommate + bia-admin):
--   · rsvped_at     timestamptz NULL — set when the student RSVPs (rsvp_event),
--                   cleared on un-RSVP.
--   · checked_in_at timestamptz NULL — set by admin check-in, cleared by undo.
--   · RSVP semantics       = rsvped_at IS NOT NULL
--   · attendance semantics = checked_in_at IS NOT NULL
-- `source` STAYS and keeps being written for backward compat (live admin code
-- still writes it), but nothing new reads it for semantics.
-- ──────────────────────────────────────────────────────────────────────────

-- 0. Columns + backfill (additive only — no drops, no type changes).
ALTER TABLE public.event_attendance
  ADD COLUMN IF NOT EXISTS rsvped_at timestamptz NULL;
ALTER TABLE public.event_attendance
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz NULL;

-- Backfill from the legacy source column. created_at is the best available
-- approximation of when the action happened. Idempotent (… IS NULL guards).
UPDATE public.event_attendance
  SET rsvped_at = created_at
  WHERE source = 'rsvp' AND rsvped_at IS NULL;
UPDATE public.event_attendance
  SET checked_in_at = created_at
  WHERE source = 'checkin' AND checked_in_at IS NULL;

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
--    event_attendance rows directly to the client. RSVP = rsvped_at IS NOT NULL
--    (NOT source='rsvp' — see header), so a checked-in student still counts.
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
    WHERE rsvped_at IS NOT NULL
    GROUP BY event_id
  ) c ON c.event_id = e.id
  LEFT JOIN (
    SELECT ea.event_id
    FROM public.event_attendance ea
    JOIN public.students s ON s.id = ea.student_id
    WHERE ea.rsvped_at IS NOT NULL AND s.user_id = auth.uid()
  ) me ON me.event_id = e.id
  WHERE e.status = 'active'
    AND (e.date IS NULL OR e.date >= now() - interval '12 hours')
  ORDER BY e.date ASC NULLS LAST
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.list_events_with_rsvp() FROM public;
GRANT EXECUTE ON FUNCTION public.list_events_with_rsvp() TO anon, authenticated;

-- 3. rsvp_event / unrsvp_event — authenticated only. Bridge the web user to
--    their students row (auto-create via ensure_student_for_current_user) and
--    set/clear rsvped_at on the event_attendance row. Idempotent.
--
--    rsvp_event guards:
--      · event must exist and be status='active'        → 'event_not_open'
--      · capacity (when set) not already reached        → 'event_full'
--    The events row is locked (FOR UPDATE) so two concurrent RSVPs cannot
--    both pass the capacity check. On conflict with an existing row (e.g. a
--    checked-in or reminder row) only rsvped_at is set — checked_in_at and
--    the legacy source value are never overwritten; source='rsvp' is written
--    only on a fresh INSERT.
CREATE OR REPLACE FUNCTION public.rsvp_event(p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sid uuid;
  v_capacity int;
  v_status text;
  v_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT e.capacity, e.status INTO v_capacity, v_status
    FROM public.events e WHERE e.id = p_event_id
    FOR UPDATE;
  IF NOT FOUND OR v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  SELECT s.id INTO sid FROM public.ensure_student_for_current_user(NULL) s LIMIT 1;

  -- Already RSVP'd → idempotent no-op (and never blocked by capacity).
  IF EXISTS (
    SELECT 1 FROM public.event_attendance
    WHERE student_id = sid AND event_id = p_event_id AND rsvped_at IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  IF v_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_count
      FROM public.event_attendance
      WHERE event_id = p_event_id AND rsvped_at IS NOT NULL;
    IF v_count >= v_capacity THEN
      RAISE EXCEPTION 'event_full';
    END IF;
  END IF;

  INSERT INTO public.event_attendance (student_id, event_id, source, rsvped_at)
    VALUES (sid, p_event_id, 'rsvp', now())
    ON CONFLICT (student_id, event_id) DO UPDATE
      SET rsvped_at = COALESCE(event_attendance.rsvped_at, now());
END; $$;
REVOKE ALL ON FUNCTION public.rsvp_event(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid) TO authenticated;

--    unrsvp_event clears rsvped_at; the row itself is deleted ONLY when the
--    student was never checked in (checked_in_at IS NULL) — attendance records
--    must survive an un-RSVP. Rows without rsvped_at (e.g. reminder- or
--    checkin-only rows) are never touched.
CREATE OR REPLACE FUNCTION public.unrsvp_event(p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO sid FROM public.students WHERE user_id = auth.uid();
  IF sid IS NOT NULL THEN
    UPDATE public.event_attendance
      SET rsvped_at = NULL
      WHERE student_id = sid AND event_id = p_event_id
        AND rsvped_at IS NOT NULL AND checked_in_at IS NOT NULL;
    DELETE FROM public.event_attendance
      WHERE student_id = sid AND event_id = p_event_id
        AND rsvped_at IS NOT NULL AND checked_in_at IS NULL;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.unrsvp_event(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.unrsvp_event(uuid) TO authenticated;
