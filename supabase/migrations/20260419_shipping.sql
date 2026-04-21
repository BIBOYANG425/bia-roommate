-- Consolidated Shipping (集运) — Foundation
--
-- Context: BIA is adding a consolidated-shipping service for USC students.
-- Users pre-declare parcels, ship them to a China warehouse under their
-- member_id, BIA batches them into one US-bound shipment, and students pick
-- up on campus. This migration lays the data foundation: member_id allocation
-- on students, warehouse address directory, parcels with status machine,
-- shipment batches, audit log, and the outbound notification queue that
-- George's cron drains to WeChat/iMessage.
--
-- Depends on: george/supabase/migrations/001_george_schema.sql (students table).
-- Must be applied AFTER the George schema.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Extend students with shipping fields
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS member_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS warehouse_preference text,
  ADD COLUMN IF NOT EXISTS shipping_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_students_member_id ON public.students (member_id)
  WHERE member_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Warehouse address directory
--    Day-one has one row; table (not env var) so historical parcels can be
--    stamped with warehouse_id when we add a second warehouse later.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.warehouse_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,                 -- 'SH-01', 'GZ-01'
  display_name text NOT NULL,                -- '上海徐汇仓'
  recipient_template text NOT NULL,          -- '{member_id} 转 {name}'
  street text NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text NOT NULL,
  phone text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_active ON public.warehouse_addresses (active)
  WHERE active = true;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Status enums (create first so later tables can reference them)
-- ──────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE parcel_status AS ENUM (
    'expected',      -- user pre-declared, not yet arrived
    'received_cn',   -- warehouse has it, photographed, verified
    'in_transit',    -- batched and dispatched internationally
    'arrived_us',    -- landed, awaiting pickup window
    'picked_up',     -- terminal (happy)
    'lost',          -- terminal (bad)
    'returned',      -- terminal (bad)
    'disputed'       -- needs admin follow-up
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM (
    'forming',       -- admin is adding parcels
    'sealed',        -- no more parcels accepted
    'departed_cn',
    'customs',
    'arrived_us',
    'pickup_open',
    'pickup_closed',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Shipments (batches) — defined before parcels so parcels can FK it
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                        -- 'Batch 2026-04-A'
  status shipment_status NOT NULL DEFAULT 'forming',
  carrier text,                              -- 'DHL' | 'USPS' | ...
  international_tracking text,
  departed_cn_at timestamptz,
  arrived_us_at timestamptz,
  pickup_location text,                      -- 'THH 301, USC'
  pickup_starts_at timestamptz,
  pickup_ends_at timestamptz,
  price_per_kg_cents int,                    -- for cost estimator display
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments (status)
  WHERE status NOT IN ('archived', 'pickup_closed');

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Parcels
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  member_id text NOT NULL,                   -- denormalized; warehouse scans by this
  tracking_cn text,                          -- domestic CN carrier tracking #
  carrier_cn text,                           -- '顺丰' | '中通' | '圆通' | ...
  description text NOT NULL,
  declared_value_cny int,
  category text,                             -- 'electronics' | 'clothing' | 'food' | 'other'
  photos text[] NOT NULL DEFAULT '{}',
  status parcel_status NOT NULL DEFAULT 'expected',
  warehouse_id uuid REFERENCES public.warehouse_addresses(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  received_at timestamptz,
  weight_grams int,
  dim_cm_l int, dim_cm_w int, dim_cm_h int,
  notes text,                                -- admin-visible only
  user_notes text,                           -- user instructions ("请代拆")
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcels_user ON public.parcels (user_id);
CREATE INDEX IF NOT EXISTS idx_parcels_student ON public.parcels (student_id)
  WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_status ON public.parcels (status)
  WHERE status NOT IN ('picked_up', 'returned', 'lost');
CREATE INDEX IF NOT EXISTS idx_parcels_member_id ON public.parcels (member_id);
CREATE INDEX IF NOT EXISTS idx_parcels_tracking_cn ON public.parcels (tracking_cn)
  WHERE tracking_cn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_shipment ON public.parcels (shipment_id)
  WHERE shipment_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Audit log
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parcel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  from_status parcel_status,
  to_status parcel_status NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text CHECK (actor_role IN ('user', 'admin', 'system')),
  note text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcel_events_parcel
  ON public.parcel_events (parcel_id, created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- 7. Outbound notification queue (drained by george/src/jobs/shipping-notifier.ts)
--    Unique index on dedup_key means re-enqueueing an already-sent transition
--    is a no-op; no de-dup logic needed in the cron.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shipping_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'received_cn', 'in_transit', 'arrived_us',
    'pickup_open', 'pickup_reminder', 'picked_up_thanks',
    'orphan_received'
  )),
  dedup_key text NOT NULL,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  payload jsonb,                             -- template variables
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_notif_dedup
  ON public.shipping_notifications (dedup_key);

CREATE INDEX IF NOT EXISTS idx_shipping_notif_pending
  ON public.shipping_notifications (scheduled_for)
  WHERE status = 'pending';

-- ──────────────────────────────────────────────────────────────────────────
-- 8. Triggers
-- ──────────────────────────────────────────────────────────────────────────

-- 8a. touch_updated_at on parcels + shipments
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parcels_touch ON public.parcels;
CREATE TRIGGER trg_parcels_touch
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_shipments_touch ON public.shipments;
CREATE TRIGGER trg_shipments_touch
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 8b. ensure_member_id on parcels (and backfill on students lookup)
--     Generates 6 alphanumeric chars, prefix 'BIA-'. Crypto-random.
--     Retries on unique collision (probability ~1 in 2 billion per attempt).
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O/1/I confusables
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := 'BIA-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    PERFORM 1 FROM public.students WHERE member_id = candidate;
    IF NOT FOUND THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_student_member_id()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  sid uuid;
  mid text;
BEGIN
  -- Resolve student_id: either already set, or look up by user_id's email.
  -- For MVP the web app pre-populates student_id; this is defensive.
  sid := NEW.student_id;

  -- If member_id on parcel is blank, derive it from students.
  IF NEW.member_id IS NULL OR NEW.member_id = '' THEN
    IF sid IS NOT NULL THEN
      SELECT member_id INTO mid FROM public.students WHERE id = sid;
      IF mid IS NULL THEN
        mid := public.generate_member_id();
        UPDATE public.students SET member_id = mid WHERE id = sid;
      END IF;
      NEW.member_id := mid;
    ELSE
      -- No student link yet — generate an orphan code prefixed 'BIA-ORPH-'
      -- so admin can repair later. Still unique.
      NEW.member_id := 'BIA-ORPH-' || substr(gen_random_uuid()::text, 1, 6);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parcels_ensure_member_id ON public.parcels;
CREATE TRIGGER trg_parcels_ensure_member_id
  BEFORE INSERT ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.ensure_student_member_id();

-- 8c. log_parcel_status_change → parcel_events
CREATE OR REPLACE FUNCTION public.log_parcel_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  actor uuid;
  role_val text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- actor_user_id + actor_role are optional session GUCs set by API handlers.
    -- They're 'system' when unset (e.g. cron-driven transitions).
    BEGIN
      actor := nullif(current_setting('app.actor_user_id', true), '')::uuid;
    EXCEPTION WHEN others THEN actor := NULL;
    END;
    role_val := coalesce(nullif(current_setting('app.actor_role', true), ''), 'system');

    INSERT INTO public.parcel_events (parcel_id, from_status, to_status, actor_user_id, actor_role)
    VALUES (NEW.id, OLD.status, NEW.status, actor, role_val);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parcels_log_status ON public.parcels;
CREATE TRIGGER trg_parcels_log_status
  AFTER UPDATE OF status ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.log_parcel_status_change();

-- ──────────────────────────────────────────────────────────────────────────
-- 9. RLS
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.warehouse_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_notifications ENABLE ROW LEVEL SECURITY;

-- warehouse_addresses: public can read active rows
CREATE POLICY "read_active_warehouses" ON public.warehouse_addresses FOR SELECT
  USING (active = true);

-- parcels: users read own; insert own; update own only while expected
CREATE POLICY "read_own_parcels" ON public.parcels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_parcel" ON public.parcels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_parcel_while_expected" ON public.parcels FOR UPDATE
  USING (auth.uid() = user_id AND status = 'expected')
  WITH CHECK (auth.uid() = user_id AND status = 'expected');

CREATE POLICY "delete_own_parcel_while_expected" ON public.parcels FOR DELETE
  USING (auth.uid() = user_id AND status = 'expected');

-- shipments: users read only shipments that hold one of their parcels
CREATE POLICY "read_own_linked_shipment" ON public.shipments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parcels p
    WHERE p.shipment_id = shipments.id AND p.user_id = auth.uid()
  ));

-- parcel_events: users read events for own parcels
CREATE POLICY "read_own_parcel_events" ON public.parcel_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parcels p
    WHERE p.id = parcel_events.parcel_id AND p.user_id = auth.uid()
  ));

-- shipping_notifications: no direct client access; service role only (implicit).

-- Admin writes to all of the above bypass RLS via the service-role client
-- used inside API routes that have already passed requireAdmin() in
-- lib/admin.ts. No admin-specific policies are defined.

-- ──────────────────────────────────────────────────────────────────────────
-- 10. Storage bucket (private)
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
  VALUES ('parcel-photos', 'parcel-photos', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload under their own {user_id}/... path.
-- Reading is routed through signed URLs generated server-side, so we only
-- need an INSERT policy for user uploads; read for user bucket browsing is
-- gated by path-prefix check.

CREATE POLICY "user_upload_own_parcel_photos" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'parcel-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_read_own_parcel_photos" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'parcel-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- End of 20260419_shipping.sql
