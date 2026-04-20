-- SECURITY DEFINER helpers so admin API writes stamp parcel_events with
-- actor_role='admin' + actor_user_id via the existing
-- log_parcel_status_change trigger (supabase/migrations/20260419_shipping.sql:277).
--
-- The trigger reads GUCs app.actor_user_id / app.actor_role set inside the
-- same transaction. Doing set_config + UPDATE through separate supabase-js
-- calls would land on different pooled connections, so we bundle them here.

CREATE OR REPLACE FUNCTION public.admin_patch_parcel(
  p_id uuid,
  p_actor_user_id uuid,
  p_patch jsonb
)
RETURNS public.parcels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.parcels;
BEGIN
  PERFORM set_config('app.actor_user_id', p_actor_user_id::text, true);
  PERFORM set_config('app.actor_role', 'admin', true);

  UPDATE public.parcels p
  SET
    status       = COALESCE((p_patch->>'status')::public.parcel_status, p.status),
    weight_grams = CASE WHEN p_patch ? 'weight_grams'
                        THEN NULLIF(p_patch->>'weight_grams','')::int
                        ELSE p.weight_grams END,
    dim_cm_l     = CASE WHEN p_patch ? 'dim_cm_l'
                        THEN NULLIF(p_patch->>'dim_cm_l','')::numeric
                        ELSE p.dim_cm_l END,
    dim_cm_w     = CASE WHEN p_patch ? 'dim_cm_w'
                        THEN NULLIF(p_patch->>'dim_cm_w','')::numeric
                        ELSE p.dim_cm_w END,
    dim_cm_h     = CASE WHEN p_patch ? 'dim_cm_h'
                        THEN NULLIF(p_patch->>'dim_cm_h','')::numeric
                        ELSE p.dim_cm_h END,
    notes        = CASE WHEN p_patch ? 'notes'
                        THEN NULLIF(p_patch->>'notes','')
                        ELSE p.notes END,
    received_at  = CASE WHEN p_patch ? 'received_at'
                        THEN NULLIF(p_patch->>'received_at','')::timestamptz
                        ELSE p.received_at END,
    shipment_id  = CASE WHEN p_patch ? 'shipment_id'
                        THEN NULLIF(p_patch->>'shipment_id','')::uuid
                        ELSE p.shipment_id END,
    updated_at   = now()
  WHERE p.id = p_id
  RETURNING p.* INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_attach_parcels_to_shipment(
  p_parcel_ids uuid[],
  p_shipment_id uuid,
  p_actor_user_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  PERFORM set_config('app.actor_user_id', p_actor_user_id::text, true);
  PERFORM set_config('app.actor_role', 'admin', true);

  UPDATE public.parcels
  SET shipment_id = p_shipment_id,
      status      = CASE WHEN status = 'received_cn'::public.parcel_status
                         THEN 'in_transit'::public.parcel_status
                         ELSE status END,
      updated_at  = now()
  WHERE id = ANY(p_parcel_ids);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_patch_parcel(uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_attach_parcels_to_shipment(uuid[], uuid, uuid)
  FROM PUBLIC, anon, authenticated;
