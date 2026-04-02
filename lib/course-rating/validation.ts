import { z } from "zod";

const currentYear = new Date().getFullYear();

export const reviewSchema = z.object({
  dept: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().min(2).max(10)),
  course_number: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1).max(10)),
  professor: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(100))
    .optional(),
  term: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .regex(
          /^(Fall|Spring|Summer) \d{4}$/,
          "Must be like 'Fall 2025' or 'Spring 2026'",
        )
        .refine(
          (v) => {
            const year = parseInt(v.split(" ")[1]);
            return year <= currentYear + 1;
          },
          { message: "Term cannot be more than one year in the future" },
        ),
    ),
  difficulty: z.number().int().min(1).max(5),
  workload: z.number().int().min(1).max(5),
  grading: z.number().int().min(1).max(5),
  gpa: z.string().max(5).optional(),
  comment: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(10, "Review must be at least 10 characters").max(2000)),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
