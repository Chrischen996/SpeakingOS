export class FakeSpeechTool {
  async transcribe(input: { storageKey: string; mimeType: string; language?: 'en' }) {
    return {
      text: 'Yes, I enjoy drinking coffee because it helps me focus in the morning.',
      confidence: 0.92,
      provider: 'fake',
      storageKey: input.storageKey,
    };
  }
}
