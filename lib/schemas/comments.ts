import { z } from "zod";

export const commentCreateSchema = z.object({
  profile_id: z.string().uuid(),
  content: z.string().trim().min(1).max(500),
});

export const commentDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type CommentDeleteInput = z.infer<typeof commentDeleteSchema>;
