import { z } from "zod";

// Squad post create — category and gender enum checks stay in handler to
// keep error messages aligned with the existing UI strings.

export const squadCreateSchema = z
  .object({
    poster_name: z.string().min(1).max(100),
    category: z.string().min(1).max(50),
    content: z.string().min(1).max(2000),
    contact: z.string().min(1).max(200),
    school: z.string().max(100).optional(),
    location: z.string().max(200).optional(),
    max_people: z.coerce.number().int().min(2).max(50),
    deadline: z.string().nullable().optional(),
    gender_restriction: z.string().max(20).optional(),
  })
  .strict();

export const squadJoinSchema = z.object({
  post_id: z.string().uuid(),
});

export type SquadCreateInput = z.infer<typeof squadCreateSchema>;
export type SquadJoinInput = z.infer<typeof squadJoinSchema>;
