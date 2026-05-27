import { z } from "zod";

export const likeToggleSchema = z.object({
  profile_id: z.string().uuid(),
});

export type LikeToggleInput = z.infer<typeof likeToggleSchema>;
