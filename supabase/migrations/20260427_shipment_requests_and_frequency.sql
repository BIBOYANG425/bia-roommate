-- Add frequency_label (admin-editable cadence) to shipping_routes and
-- introduce shipment_requests for users to apply for a special
-- consolidation arrangement. Admin review + resolution happens via
-- /api/admin/shipping/requests (service-role).

ALTER TABLE public.shipping_routes
  ADD COLUMN IF NOT EXISTS frequency_label text;

UPDATE public.shipping_routes
SET frequency_label = CASE method
  WHEN 'sea'::public.shipping_method THEN '双周发车'
  WHEN 'air'::public.shipping_method THEN '每周发车'
  ELSE frequency_label
END
WHERE frequency_label IS NULL;

CREATE TABLE IF NOT EXISTS public.shipment_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id        uuid REFERENCES public.students(id) ON DELETE SET NULL,
  member_id         text,
  description       text NOT NULL,
  expected_weight_grams int,
  preferred_method  public.shipping_method,
  urgency_note      text,
  contact           text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','contacted','scheduled','declined','completed')),
  admin_note        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_requests_status
  ON public.shipment_requests (status);
CREATE INDEX IF NOT EXISTS idx_shipment_requests_user
  ON public.shipment_requests (user_id);

DROP TRIGGER IF EXISTS trg_shipment_requests_updated_at ON public.shipment_requests;
CREATE TRIGGER trg_shipment_requests_updated_at
  BEFORE UPDATE ON public.shipment_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert their own requests" ON public.shipment_requests;
CREATE POLICY "Users insert their own requests"
  ON public.shipment_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read their own requests" ON public.shipment_requests;
CREATE POLICY "Users read their own requests"
  ON public.shipment_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.shipment_requests TO authenticated;
