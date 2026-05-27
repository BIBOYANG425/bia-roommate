import { z } from "zod";

// `courses` and `schedule_data` come from the course-planner client which
// produces opaque JSON. Validate only the shape we read directly (length /
// non-null); deeper validation happens downstream in the recommender layer.
export const scheduleCreateSchema = z.object({
  name: z.string().trim().max(100).optional(),
  semester: z.string().trim().min(1).max(50),
  courses: z.array(z.unknown()).min(1),
  preferences: z.record(z.string(), z.unknown()).nullable().optional(),
  schedule_data: z.record(z.string(), z.unknown()),
});

export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;
