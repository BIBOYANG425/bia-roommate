import { z } from "zod";

export const profileLinkSchema = z.object({
  profile_id: z.string().uuid(),
});

export type ProfileLinkInput = z.infer<typeof profileLinkSchema>;
