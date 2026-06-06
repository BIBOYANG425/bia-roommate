-- ──────────────────────────────────────────────────────────────────────────
-- Parcel-status notification producer  (Retention roadmap · Phase 1a · B1)
--
-- Wires the previously-orphaned public.shipping_notifications queue to a
-- producer: a sibling AFTER-UPDATE trigger on public.parcels that enqueues one
-- notification when a parcel transitions into a status the student should hear
-- about. Additive — does NOT touch the existing log_parcel_status_change audit
-- trigger; both fire on the same UPDATE.
--
-- Status → notification kind:
--     received_cn  → 'received_cn'
--     in_transit   → 'in_transit'
--     arrived_us   → 'arrived_us'
--     picked_up    → 'picked_up_thanks'
--     (expected / lost / returned / disputed have no kind → not enqueued;
--      pickup_open/pickup_reminder/orphan_received are shipment-level, not here)
--
-- Idempotency: dedup_key = '<parcel_id>:<kind>' + ON CONFLICT DO NOTHING, so a
-- parcel emits at most one notification per kind even if a status is re-entered.
-- No new index needed: idx_shipping_notif_pending (status='pending') already
-- exists for the consumer; idx_shipping_notif_dedup (unique dedup_key) enforces
-- the idempotency above.
--
-- The consumer (george) is built separately (B2) and drains WHERE status='pending'.
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enqueue_parcel_notification()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  notif_kind text;
BEGIN
  -- Only on a real status transition, and only for parcels linked to a student
  -- (shipping_notifications.student_id is NOT NULL).
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.student_id IS NOT NULL THEN
    notif_kind := CASE NEW.status
      WHEN 'received_cn' THEN 'received_cn'
      WHEN 'in_transit'  THEN 'in_transit'
      WHEN 'arrived_us'  THEN 'arrived_us'
      WHEN 'picked_up'   THEN 'picked_up_thanks'
      ELSE NULL
    END;

    IF notif_kind IS NOT NULL THEN
      INSERT INTO public.shipping_notifications
        (student_id, parcel_id, kind, dedup_key, payload, status, scheduled_for)
      VALUES (
        NEW.student_id,
        NEW.id,
        notif_kind,
        NEW.id::text || ':' || notif_kind,
        jsonb_build_object(
          'member_id',   NEW.member_id,
          'from_status', OLD.status,
          'to_status',   NEW.status
        ),
        'pending',
        now()
      )
      ON CONFLICT (dedup_key) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parcels_enqueue_notification ON public.parcels;
CREATE TRIGGER trg_parcels_enqueue_notification
  AFTER UPDATE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_parcel_notification();
