import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { confirmAudioUploadRequestSchema, updateTranscriptRequestSchema } from '@speakingos/shared';
import type { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { createPresignedPutUrl } from './object-storage.js';

const demoUserId = '00000000-0000-0000-0000-000000000001';

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts();
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function databaseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class PracticeService {
  constructor(
    @InjectQueue('stt') private readonly sttQueue: Queue,
    @InjectQueue('assessment') private readonly assessmentQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async getTodayPractice() {
    const user = await this.getDemoUser();
    const date = dateInTimezone(user.timezone);
    const practiceDate = databaseDate(date);
    const existingSession = await this.prisma.practiceSession.findUnique({
      where: { userId_practiceDate: { userId: user.id, practiceDate } },
      include: { question: true },
    });
    const question =
      existingSession?.question ??
      (await this.prisma.question.findFirst({
        where: { active: true, part: 'part1' },
        orderBy: { createdAt: 'asc' },
      }));

    if (!question) throw new NotFoundException('No active IELTS Part 1 question is available');

    const dueReviews = await this.prisma.reviewTask.findMany({
      where: { userId: user.id, status: 'pending', dueAt: { lte: new Date() } },
      orderBy: { dueAt: 'asc' },
    });

    return {
      date,
      newQuestion: {
        questionId: question.id,
        part: question.part,
        topic: question.topic,
        difficulty: question.difficulty,
        content: question.content,
        alreadyCompleted: existingSession?.status === 'completed',
        ...(existingSession && existingSession.status !== 'completed'
          ? { activeSessionId: existingSession.id }
          : {}),
      },
      dueReviews: dueReviews.map((review) => ({
        reviewId: review.id,
        type: review.targetType === 'question' ? 'question_retry' : review.targetType,
        prompt: review.prompt,
        dueAt: review.dueAt.toISOString(),
      })),
    };
  }

  async createSession(questionId: string) {
    const user = await this.getDemoUser();
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, active: true, part: 'part1' },
    });
    if (!question) throw new NotFoundException('Question not found');

    const practiceDate = databaseDate(dateInTimezone(user.timezone));
    const session = await this.prisma.practiceSession.upsert({
      where: { userId_practiceDate: { userId: user.id, practiceDate } },
      update: {},
      create: { userId: user.id, questionId, practiceDate },
    });
    if (session.questionId !== questionId) {
      throw new ConflictException('A different practice question already exists for today');
    }
    return { sessionId: session.id, questionId: session.questionId, status: session.status };
  }

  async createUploadUrl(sessionId: string) {
    const session = await this.getOwnedSession(sessionId);
    if (['transcript_confirmed', 'assessing', 'assessed', 'memory_saved', 'review_scheduled', 'completed'].includes(session.status)) {
      throw new ConflictException('Audio cannot be replaced after the transcript is confirmed');
    }
    await this.prisma.practiceSession.update({ where: { id: sessionId }, data: { status: 'recording' } });
    const storageKey = `audio/${sessionId}.webm`;
    return {
      sessionId,
      storageKey,
      uploadUrl: createPresignedPutUrl(storageKey),
      expiresInSeconds: 600,
    };
  }

  async completeAudio(sessionId: string, input: unknown) {
    const parsed = confirmAudioUploadRequestSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const body = parsed.data;
    const session = await this.getOwnedSession(sessionId);
    if (['transcript_confirmed', 'assessing', 'assessed', 'memory_saved', 'review_scheduled', 'completed'].includes(session.status)) {
      throw new ConflictException('Audio cannot be replaced after the transcript is confirmed');
    }

    await this.prisma.$transaction([
      this.prisma.mediaAsset.upsert({
        where: { sessionId },
        update: body,
        create: { sessionId, ...body },
      }),
      this.prisma.practiceSession.update({ where: { id: sessionId }, data: { status: 'transcribing' } }),
    ]);
    const fingerprint = createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16);
    try {
      await this.sttQueue.add(
        'transcribe_session',
        { sessionId, ...body },
        { jobId: `stt-${sessionId}-${fingerprint}`, attempts: 3, backoff: { type: 'exponential', delay: 1_000 } },
      );
    } catch (error) {
      await this.prisma.practiceSession.update({ where: { id: sessionId }, data: { status: 'audio_uploaded' } });
      throw error;
    }
    return { sessionId, status: 'transcribing' };
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId: demoUserId },
      include: { question: true, mediaAsset: true, answer: { include: { feedback: true } } },
    });
    if (!session) throw new NotFoundException('Practice session not found');

    const feedback = session.answer?.feedback;
    return {
      id: session.id,
      status: session.status,
      question: { id: session.question.id, content: session.question.content, topic: session.question.topic },
      ...(session.mediaAsset ? { audio: { durationMs: session.mediaAsset.durationMs } } : {}),
      ...(session.answer
        ? {
            transcript: {
              rawText: session.answer.rawTranscript,
              ...(session.answer.confirmedTranscript ? { editedText: session.answer.confirmedTranscript } : {}),
              confirmed: Boolean(session.answer.transcriptConfirmedAt),
              ...(session.answer.sttConfidence === null ? {} : { confidence: session.answer.sttConfidence }),
            },
          }
        : {}),
      ...(feedback
        ? {
            feedback: {
              bandScore: Number(feedback.bandScore),
              grammarScore: Number(feedback.grammarScore),
              vocabularyScore: Number(feedback.vocabularyScore),
              fluencyScore: Number(feedback.fluencyScore),
              coherenceScore: Number(feedback.coherenceScore),
              naturalnessScore: Number(feedback.naturalnessScore),
              grammarComments: feedback.grammarComments,
              vocabularySuggestions: feedback.vocabularySuggestions,
              nativeVersion: feedback.nativeVersion,
              band7Version: feedback.band7Version,
            },
          }
        : {}),
      ...(session.status === 'failed'
        ? { error: { stage: session.failedStage, code: session.errorCode, message: session.errorMessage } }
        : {}),
    };
  }

  async confirmTranscript(sessionId: string, input: unknown) {
    const parsed = updateTranscriptRequestSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const body = parsed.data;
    const session = await this.getOwnedSession(sessionId);
    if (session.status === 'transcript_confirmed') {
      return { sessionId, status: session.status, transcript: { editedText: body.text, confirmed: true } };
    }
    if (session.status !== 'transcribed') throw new ConflictException('Transcript is not ready to confirm');

    await this.prisma.$transaction([
      this.prisma.answer.update({
        where: { sessionId },
        data: { confirmedTranscript: body.text, transcriptConfirmedAt: new Date() },
      }),
      this.prisma.practiceSession.update({ where: { id: sessionId }, data: { status: 'transcript_confirmed' } }),
    ]);
    return { sessionId, status: 'transcript_confirmed', transcript: { editedText: body.text, confirmed: true } };
  }

  async enqueueAssessment(sessionId: string) {
    const session = await this.getOwnedSession(sessionId);
    if (['assessing', 'assessed', 'memory_saved', 'review_scheduled', 'completed'].includes(session.status)) {
      return { sessionId, status: session.status };
    }
    if (session.status !== 'transcript_confirmed') {
      throw new ConflictException('Transcript must be confirmed before assessment');
    }

    await this.prisma.practiceSession.update({ where: { id: sessionId }, data: { status: 'assessing' } });
    try {
      await this.assessmentQueue.add(
        'assess_session',
        { sessionId },
        { jobId: `assessment-${sessionId}`, attempts: 3, backoff: { type: 'exponential', delay: 1_000 } },
      );
    } catch (error) {
      await this.prisma.practiceSession.update({ where: { id: sessionId }, data: { status: 'transcript_confirmed' } });
      throw error;
    }
    return { sessionId, status: 'assessing' };
  }

  private async getDemoUser() {
    const user = await this.prisma.user.findUnique({ where: { id: demoUserId } });
    if (!user) throw new NotFoundException('Demo user is missing; run the Prisma seed command');
    return user;
  }

  private async getOwnedSession(sessionId: string) {
    const session = await this.prisma.practiceSession.findFirst({ where: { id: sessionId, userId: demoUserId } });
    if (!session) throw new NotFoundException('Practice session not found');
    return session;
  }
}
