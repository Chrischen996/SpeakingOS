import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const isoDateTimeSchema = z.string().datetime();

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);

export const ieltsPartSchema = z.enum(['part1', 'part2', 'part3']);

export const apiErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT_STATE',
  'DAILY_LIMIT_REACHED',
  'RATE_LIMITED',
  'UPSTREAM_STT_FAILED',
  'UPSTREAM_LLM_FAILED',
  'INTERNAL_ERROR',
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type IeltsPart = z.infer<typeof ieltsPartSchema>;
