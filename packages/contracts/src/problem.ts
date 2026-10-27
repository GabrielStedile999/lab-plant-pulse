import { z } from 'zod';

export const ProblemSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;