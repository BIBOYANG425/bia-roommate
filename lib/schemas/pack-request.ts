import { z } from "zod";

// See parcel.ts for the philosophy: schema does shape + length + count;
// status / ownership / enum checks stay in the handler.

export const packRequestCreateSchema = z.object({
  parcel_ids: z.array(z.string()).min(1).max(50),
  preferred_method: z.string().max(50).optional(),
  urgency_note: z.string().max(1000).optional(),
  contact: z.string().max(200).optional(),
  user_note: z.string().max(2000).optional(),
});

export type PackRequestCreateInput = z.infer<typeof packRequestCreateSchema>;
