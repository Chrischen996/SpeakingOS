import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

const demoQuestionId = '11111111-1111-1111-1111-111111111111';
const demoSessionId = '22222222-2222-2222-2222-222222222222';

@Injectable()
export class PracticeService {
  constructor(
    @InjectQueue('stt') private readonly sttQueue: Queue,
    @InjectQueue('assessment') private readonly assessmentQueue: Queue,
  ) {}

  getTodayPractice() {
    return {
      date: new Date().toISOString().slice(0, 10),
      newQuestion: {
        questionId: demoQuestionId,
        part: 'part1',
        topic: 'Food and drink',
        difficulty: 'easy',
        content: 'Do you enjoy drinking coffee?',
        alreadyCompleted: false,
      },
      dueReviews: [],
    };
  }

  createSession(questionId: string) {
    return { sessionId: demoSessionId, questionId, status: 'created' };
  }

  createUploadUrl(sessionId: string) {
    return {
      sessionId,
      storageKey: `audio/${sessionId}.webm`,
      uploadUrl: `http://localhost:9000/speakingos-audio/audio/${sessionId}.webm`,
      expiresInSeconds: 600,
    };
  }

  async completeAudio(sessionId: string, body: Record<string, unknown>) {
    await this.sttQueue.add('transcribe_session', { sessionId, ...body });
    return { sessionId, status: 'transcribing' };
  }

  getSession(sessionId: string) {
    return {
      id: sessionId,
      status: 'transcribed',
      question: { id: demoQuestionId, content: 'Do you enjoy drinking coffee?', topic: 'Food and drink' },
      transcript: {
        rawText: 'Yes, I enjoy drinking coffee because it helps me focus in the morning.',
        confirmed: false,
        confidence: 0.92,
      },
    };
  }

  confirmTranscript(sessionId: string, text: string) {
    return { sessionId, status: 'transcript_confirmed', transcript: { editedText: text, confirmed: true } };
  }

  async enqueueAssessment(sessionId: string) {
    await this.assessmentQueue.add('assess_session', { sessionId });
    return { sessionId, status: 'assessing' };
  }
}
