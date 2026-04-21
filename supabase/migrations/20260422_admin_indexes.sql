-- Indexes to support admin dashboard list/filter queries.
-- Without these, /admin/shipping/parcels filtering by status scans
-- the full table on every page load.

CREATE INDEX IF NOT EXISTS idx_parcels_status ON public.parcels (status);
CREATE INDEX IF NOT EXISTS idx_parcels_member_id ON public.parcels (member_id);
CREATE INDEX IF NOT EXISTS idx_parcels_shipment_id
  ON public.parcels (shipment_id)
  WHERE shipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments (status);
