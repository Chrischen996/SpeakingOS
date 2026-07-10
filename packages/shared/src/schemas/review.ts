import { z } from 'zod';
import { isoDateTimeSchema, uuidSchema } from './common.js';

export const reviewTargetTypeSchema = z.enum(['expression', 'mistake', 'question']);
export const reviewStatusSchema = z.enum(['pending', 'completed', 'cancelled']);
export const reviewResultSchema = z.enum(['remembered', 'fuzzy', 'forgot']);

export const reviewTaskSchema = z.object({
  id: uuidSchema,
  targetType: reviewTargetTypeSchema,
  targetId: uuidSchema,
  prompt: z.string(),
  dueAt: isoDateTimeSchema,
  intervalDays: z.number().int().nonnegative(),
  repetition: z.number().int().nonnegative(),
  status: reviewStatusSchema,
});

export const completeReviewRequestSchema = z.object({
  result: reviewResultSchema,
});

export type ReviewTask = z.infer<typeof reviewTaskSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
export type CompleteReviewRequest = z.infer<typeof completeReviewRequestSchema>;
