import type { AssessmentResult } from '@speakingos/shared';
import type { AssessmentAgent } from './openai-assessment.agent.js';

export class FakeAssessmentAgent implements AssessmentAgent {
  readonly model = 'fake-assessment-v1';
  async evaluate(input: { question: string; transcript: string }): Promise<AssessmentResult> {
    return {
      scores: {
        grammar: 6.5,
        vocabulary: 6.5,
        fluency: 6,
        coherence: 6.5,
        naturalness: 6,
      },
      band_score: 6.5,
      grammar_comments: ['Good basic sentence control; add more complex structures.'],
      vocabulary_suggestions: ['keeps me alert', 'part of my morning routine'],
      native_version:
        'Yes, I do. Coffee is part of my morning routine, and it helps me feel more alert before I start work.',
      band7_version:
        'Yes, I enjoy drinking coffee, especially in the morning. It keeps me alert and has become a small but important part of my daily routine.',
      expressions: [
        {
          text: 'part of my morning routine',
          meaning: 'something you regularly do every morning',
          example: 'Reading the news is part of my morning routine.',
        },
      ],
      mistakes: [],
      rationale: `Fake assessment for question: ${input.question}`,
    };
  }
}
