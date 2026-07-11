import { z } from "zod";

export const likeIntentSchema = z.object({
  profile_id: z.string().uuid(),
});

export type LikeIntentInput = z.infer<typeof likeIntentSchema>;
