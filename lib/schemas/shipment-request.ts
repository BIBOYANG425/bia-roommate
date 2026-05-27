import { z } from "zod";

// Permissive — enum (preferred_method) and weight-range checks stay in the
// handler to preserve Chinese error messages.

export const shipmentRequestCreateSchema = z
  .object({
    description: z.string().min(1).max(1000),
    preferred_method: z.string().max(50).optional(),
    expected_weight_grams: z
      .union([z.number(), z.string(), z.null()])
      .optional(),
    urgency_note: z.string().max(1000).optional(),
    contact: z.string().max(200).optional(),
  })
  .strict();

export type ShipmentRequestCreateInput = z.infer<
  typeof shipmentRequestCreateSchema
>;
