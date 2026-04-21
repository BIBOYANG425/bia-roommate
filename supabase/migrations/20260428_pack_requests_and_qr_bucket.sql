-- Two additions:
--
-- 1. pack_requests + pack_request_parcels tables. Users pick which of
--    their received_cn parcels to consolidate together and submit to BIA.
--    Admin gets the list and contacts them 1:1 to pack/ship.
--
-- 2. shipping-contact-qr public storage bucket, so admins can upload a
--    WeChat group QR image directly from /admin/shipping/contacts instead
--    of pasting a third-party URL.

-- ────────────────────────────────────────────────────────────
-- 1. pack_requests
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pack_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id       uuid REFERENCES public.students(id) ON DELETE SET NULL,
  member_id        text,
  preferred_method public.shipping_method,
  urgency_note     text,
  contact          text,
  user_note        text,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN (
                     'pending',    -- 刚提交
                     'contacted',  -- 已联系用户
                     'approved',   -- 已排入批次
                     'packed',     -- 已打包
                     'shipped',    -- 已发出
                     'declined',   -- 拒绝
                     'cancelled'   -- 用户取消
                   )),
  admin_note       text,
  shipment_id      uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pack_requests_status
  ON public.pack_requests (status);
CREATE INDEX IF NOT EXISTS idx_pack_requests_user
  ON public.pack_requests (user_id);

DROP TRIGGER IF EXISTS trg_pack_requests_updated_at ON public.pack_requests;
CREATE TRIGGER trg_pack_requests_updated_at
  BEFORE UPDATE ON public.pack_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.pack_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert their own pack requests" ON public.pack_requests;
CREATE POLICY "Users insert their own pack requests"
  ON public.pack_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read their own pack requests" ON public.pack_requests;
CREATE POLICY "Users read their own pack requests"
  ON public.pack_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own pending pack requests" ON public.pack_requests;
CREATE POLICY "Users update their own pending pack requests"
  ON public.pack_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

GRANT SELECT, INSERT, UPDATE ON public.pack_requests TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 1b. pack_request_parcels (join table)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pack_request_parcels (
  request_id uuid NOT NULL REFERENCES public.pack_requests(id) ON DELETE CASCADE,
  parcel_id  uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, parcel_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_request_parcels_parcel
  ON public.pack_request_parcels (parcel_id);

ALTER TABLE public.pack_request_parcels ENABLE ROW LEVEL SECURITY;

-- Users read their own join rows by checking parent request ownership
DROP POLICY IF EXISTS "Users read own pack request parcels" ON public.pack_request_parcels;
CREATE POLICY "Users read own pack request parcels"
  ON public.pack_request_parcels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pack_requests r
      WHERE r.id = request_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users insert own pack request parcels" ON public.pack_request_parcels;
CREATE POLICY "Users insert own pack request parcels"
  ON public.pack_request_parcels FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pack_requests r
      WHERE r.id = request_id AND r.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.parcels p
      WHERE p.id = parcel_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.pack_request_parcels TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. shipping-contact-qr public bucket
-- ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shipping-contact-qr',
  'shipping-contact-qr',
  true,
  2 * 1024 * 1024,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read QR codes" ON storage.objects;
CREATE POLICY "Anyone can read QR codes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shipping-contact-qr');

-- Admins write via service-role client (bypasses RLS), but we also let any
-- authenticated user upload to keep the UI simple — admin gate is at the
-- API layer.
DROP POLICY IF EXISTS "Authenticated can upload QR codes" ON storage.objects;
CREATE POLICY "Authenticated can upload QR codes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shipping-contact-qr');

DROP POLICY IF EXISTS "Authenticated can update QR codes" ON storage.objects;
CREATE POLICY "Authenticated can update QR codes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'shipping-contact-qr')
  WITH CHECK (bucket_id = 'shipping-contact-qr');

DROP POLICY IF EXISTS "Authenticated can delete QR codes" ON storage.objects;
CREATE POLICY "Authenticated can delete QR codes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'shipping-contact-qr');
