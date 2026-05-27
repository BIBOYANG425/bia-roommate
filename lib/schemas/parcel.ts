import { z } from "zod";

// Permissive shape — enum membership (category/carrier/method) and
// numeric-range checks (declared_value_cny) stay in the handler so we can
// keep the Chinese error messages and avoid coercion edge cases. The schema
// just enforces JSON validity, required-vs-optional, max lengths.

export const parcelCreateSchema = z
  .object({
    description: z.string().min(1).max(500),
    category: z.string().max(50).optional(),
    carrier_cn: z.string().max(50).optional(),
    tracking_cn: z.string().max(100).optional(),
    declared_value_cny: z
      .union([z.number(), z.string(), z.null()])
      .optional(),
    photos: z.array(z.string()).max(20).optional(),
    user_notes: z.string().max(2000).optional(),
    shipping_method: z.string().max(50).optional(),
  })
  .strict();

export const parcelPatchSchema = z
  .object({
    description: z.string().max(500).optional(),
    category: z.string().max(50).optional(),
    carrier_cn: z.string().max(50).optional(),
    tracking_cn: z.string().max(100).optional(),
    declared_value_cny: z
      .union([z.number(), z.string(), z.null()])
      .optional(),
    photos: z.array(z.string()).max(20).optional(),
    user_notes: z.string().max(2000).optional(),
    shipping_method: z.string().max(50).optional(),
  })
  .strict();

export type ParcelCreateInput = z.infer<typeof parcelCreateSchema>;
export type ParcelPatchInput = z.infer<typeof parcelPatchSchema>;
