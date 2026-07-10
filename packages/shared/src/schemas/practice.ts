import { z } from 'zod';
import { difficultySchema, ieltsPartSchema, isoDateSchema, isoDateTimeSchema, uuidSchema } from './common.js';

export const practiceSessionStatusSchema = z.enum([
  'created',
  'recording',
  'audio_uploaded',
  'transcribing',
  'transcribed',
  'transcript_confirmed',
  'assessing',
  'assessed',
  'memory_saved',
  'review_scheduled',
  'completed',
  'failed',
]);

export const questionSchema = z.object({
  id: uuidSchema,
  part: ieltsPartSchema,
  topic: z.string(),
  difficulty: difficultySchema,
  content: z.string(),
});

export const todayPracticeResponseSchema = z.object({
  date: isoDateSchema,
  newQuestion: z.object({
    questionId: uuidSchema,
    part: z.literal('part1'),
    topic: z.string(),
    difficulty: difficultySchema,
    content: z.string(),
    alreadyCompleted: z.boolean(),
    activeSessionId: uuidSchema.optional(),
  }),
  dueReviews: z.array(
    z.object({
      reviewId: uuidSchema,
      type: z.enum(['expression', 'mistake', 'question_retry']),
      prompt: z.string(),
      dueAt: isoDateTimeSchema,
    }),
  ),
});

export const createPracticeSessionRequestSchema = z.object({
  questionId: uuidSchema,
});

export const createPracticeSessionResponseSchema = z.object({
  sessionId: uuidSchema,
  status: practiceSessionStatusSchema,
});

export const confirmAudioUploadRequestSchema = z.object({
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  durationMs: z.number().int().min(5_000).max(90_000),
  checksum: z.string().optional(),
});

export const updateTranscriptRequestSchema = z.object({
  text: z.string().min(1),
  confirmed: z.literal(true),
});

export const practiceSessionResponseSchema = z.object({
  id: uuidSchema,
  status: practiceSessionStatusSchema,
  question: z.object({ id: uuidSchema, content: z.string(), topic: z.string() }),
  audio: z
    .object({
      durationMs: z.number().int().optional(),
      url: z.string().url().optional(),
    })
    .optional(),
  transcript: z
    .object({
      rawText: z.string(),
      editedText: z.string().optional(),
      confirmed: z.boolean(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .optional(),
  feedback: z
    .object({
      bandScore: z.number(),
      grammarScore: z.number(),
      vocabularyScore: z.number(),
      fluencyScore: z.number(),
      coherenceScore: z.number(),
      naturalnessScore: z.number(),
      grammarComments: z.array(z.string()),
      vocabularySuggestions: z.array(z.string()),
      nativeVersion: z.string(),
      band7Version: z.string(),
    })
    .optional(),
  memorySummary: z
    .object({
      expressionsSaved: z.number().int().nonnegative(),
      mistakesSaved: z.number().int().nonnegative(),
      reviewsCreated: z.number().int().nonnegative(),
    })
    .optional(),
  error: z
    .object({
      stage: z.string(),
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type PracticeSessionStatus = z.infer<typeof practiceSessionStatusSchema>;
export type TodayPracticeResponse = z.infer<typeof todayPracticeResponseSchema>;
export type PracticeSessionResponse = z.infer<typeof practiceSessionResponseSchema>;
export type CreatePracticeSessionRequest = z.infer<typeof createPracticeSessionRequestSchema>;
export type CreatePracticeSessionResponse = z.infer<typeof createPracticeSessionResponseSchema>;
export type ConfirmAudioUploadRequest = z.infer<typeof confirmAudioUploadRequestSchema>;
export type UpdateTranscriptRequest = z.infer<typeof updateTranscriptRequestSchema>;
