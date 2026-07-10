import { z } from 'zod';

const bandScoreSchema = z.number().min(0).max(9);

export const assessmentResultSchema = z.object({
  scores: z.object({
    grammar: bandScoreSchema,
    vocabulary: bandScoreSchema,
    fluency: bandScoreSchema,
    coherence: bandScoreSchema,
    naturalness: bandScoreSchema,
  }),
  band_score: bandScoreSchema,
  grammar_comments: z.array(z.string()).max(8),
  vocabulary_suggestions: z.array(z.string()).max(8),
  native_version: z.string(),
  band7_version: z.string(),
  expressions: z
    .array(
      z.object({
        text: z.string(),
        meaning: z.string(),
        example: z.string(),
      }),
    )
    .max(5),
  mistakes: z
    .array(
      z.object({
        type: z.enum(['grammar', 'vocabulary', 'coherence', 'fluency']),
        span_text: z.string(),
        correction: z.string(),
        explanation: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
    )
    .max(5),
  rationale: z.string(),
});

export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
