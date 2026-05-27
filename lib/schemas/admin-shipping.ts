import { z } from "zod";

// Schemas for /api/admin/shipping/* routes. Like the user-side parcel
// schemas, these only check JSON shape + max lengths; status / enum / range
// validation stays in the handler (where Chinese error messages live).

export const adminParcelPatchSchema = z.object({
  status: z.string().optional(),
  weight_grams: z.number().nullable().optional(),
  dim_cm_l: z.number().nullable().optional(),
  dim_cm_w: z.number().nullable().optional(),
  dim_cm_h: z.number().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  received_at: z.string().nullable().optional(),
  shipment_id: z.string().nullable().optional(),
});

export const adminPackRequestPatchSchema = z.object({
  status: z.string().optional(),
  admin_note: z.string().max(2000).nullable().optional(),
  shipment_id: z.string().nullable().optional(),
});

export const adminPackRequestAttachSchema = z.object({
  shipment_id: z.string().min(1),
});

export const adminRequestPatchSchema = z.object({
  status: z.string().optional(),
  admin_note: z.string().max(2000).nullable().optional(),
});

export const adminShipmentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  carrier: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const adminShipmentPatchSchema = z.object({
  name: z.string().max(200).optional(),
  status: z.string().optional(),
  carrier: z.union([z.string(), z.null()]).optional(),
  international_tracking: z.union([z.string(), z.null()]).optional(),
  departed_cn_at: z.union([z.string(), z.null()]).optional(),
  arrived_us_at: z.union([z.string(), z.null()]).optional(),
  pickup_location: z.union([z.string(), z.null()]).optional(),
  pickup_starts_at: z.union([z.string(), z.null()]).optional(),
  pickup_ends_at: z.union([z.string(), z.null()]).optional(),
  price_per_kg_cents: z.union([z.number(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
});

export const adminShipmentAttachSchema = z.object({
  parcel_ids: z.array(z.string()).min(1).max(500),
});
