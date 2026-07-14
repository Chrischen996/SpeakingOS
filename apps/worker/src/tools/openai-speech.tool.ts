import { downloadAudio } from './s3-audio.tool.js';

export type SpeechResult = { text: string; confidence: number | null; provider: string };

export interface SpeechTool {
  transcribe(input: { storageKey: string; mimeType: string; language?: 'en' }): Promise<SpeechResult>;
}

export class OpenAiSpeechTool implements SpeechTool {
  async transcribe(input: { storageKey: string; mimeType: string; language?: 'en' }): Promise<SpeechResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY must be configured when SPEECH_PROVIDER=openai');
    const audio = await downloadAudio(input.storageKey);
    const form = new FormData();
    form.set('model', process.env.OPENAI_TRANSCRIPTION_MODEL ?? 'gpt-4o-transcribe');
    form.set('language', input.language ?? 'en');
    form.set('file', new Blob([audio], { type: input.mimeType }), `answer.${input.mimeType.includes('webm') ? 'webm' : 'audio'}`);
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) throw new Error(`OpenAI transcription failed: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as { text?: unknown };
    if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('OpenAI transcription response did not contain text');
    return { text: data.text.trim(), confidence: null, provider: 'openai' };
  }
}
