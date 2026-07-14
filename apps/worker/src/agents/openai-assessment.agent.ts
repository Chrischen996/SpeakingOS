import type { AssessmentResult } from '@speakingos/shared';

export interface AssessmentAgent {
  evaluate(input: { question: string; transcript: string }): Promise<AssessmentResult>;
  readonly model: string;
}

const schema = {
  type: 'object', additionalProperties: false,
  required: ['scores', 'band_score', 'grammar_comments', 'vocabulary_suggestions', 'native_version', 'band7_version', 'expressions', 'mistakes', 'rationale'],
  properties: {
    scores: { type: 'object', additionalProperties: false, required: ['grammar', 'vocabulary', 'fluency', 'coherence', 'naturalness'], properties: Object.fromEntries(['grammar', 'vocabulary', 'fluency', 'coherence', 'naturalness'].map((key) => [key, { type: 'number', minimum: 0, maximum: 9 }])) },
    band_score: { type: 'number', minimum: 0, maximum: 9 },
    grammar_comments: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    vocabulary_suggestions: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    native_version: { type: 'string' }, band7_version: { type: 'string' }, rationale: { type: 'string' },
    expressions: { type: 'array', maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['text', 'meaning', 'example'], properties: { text: { type: 'string' }, meaning: { type: 'string' }, example: { type: 'string' } } } },
    mistakes: { type: 'array', maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['type', 'span_text', 'correction', 'explanation', 'severity'], properties: { type: { type: 'string', enum: ['grammar', 'vocabulary', 'coherence', 'fluency'] }, span_text: { type: 'string' }, correction: { type: 'string' }, explanation: { type: 'string' }, severity: { type: 'string', enum: ['low', 'medium', 'high'] } } } },
  },
};

export class OpenAiAssessmentAgent implements AssessmentAgent {
  readonly model = process.env.OPENAI_ASSESSMENT_MODEL ?? 'gpt-4.1-mini';

  async evaluate(input: { question: string; transcript: string }): Promise<AssessmentResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY must be configured when LLM_PROVIDER=openai');
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        instructions: 'You are an IELTS Speaking Part 1 coach. Score only the supplied confirmed transcript. Do not claim this is an official IELTS score. Return concise, evidence-based feedback.',
        input: `Question:\n${input.question}\n\nConfirmed learner answer:\n${input.transcript}`,
        text: { format: { type: 'json_schema', name: 'ielts_assessment', strict: true, schema } },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI assessment failed: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as { output_text?: unknown };
    if (typeof data.output_text !== 'string') throw new Error('OpenAI assessment response did not contain output_text');
    return JSON.parse(data.output_text) as AssessmentResult;
  }
}
