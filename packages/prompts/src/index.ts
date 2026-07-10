import { assessmentResultSchema } from '@speakingos/shared';

export const promptVersions = {
  assessment: 'assessment/v1',
  memory: 'memory/v1',
  planner: 'planner/v1',
  review: 'review/v1',
} as const;

export const promptSchemas = {
  assessment: assessmentResultSchema,
} as const;

export type PromptPurpose = keyof typeof promptVersions;
