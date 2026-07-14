import { Prisma, PrismaClient } from '@prisma/client';
import { assessmentResultSchema } from '@speakingos/shared';
import { QueueEvents, Worker } from 'bullmq';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { FakeAssessmentAgent } from './agents/fake-assessment.agent.js';
import { FakeSpeechTool } from './tools/fake-speech.tool.js';
import { OpenAiAssessmentAgent } from './agents/openai-assessment.agent.js';
import { OpenAiSpeechTool, type SpeechTool } from './tools/openai-speech.tool.js';
import type { AssessmentAgent } from './agents/openai-assessment.agent.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  maxRetriesPerRequest: null as null,
};

const prisma = new PrismaClient();
const speechTool: SpeechTool = process.env.SPEECH_PROVIDER === 'openai' ? new OpenAiSpeechTool() : new FakeSpeechTool();
const assessmentAgent: AssessmentAgent = process.env.LLM_PROVIDER === 'openai' ? new OpenAiAssessmentAgent() : new FakeAssessmentAgent();
const queueEvents: QueueEvents[] = [];
const workers: Worker[] = [];

function registerQueueEvents(name: string) {
  const events = new QueueEvents(name, { connection });
  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`[${name}] job ${jobId} failed: ${failedReason}`);
  });
  queueEvents.push(events);
}

async function markFailed(sessionId: string, stage: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.practiceSession.updateMany({
    where: { id: sessionId },
    data: { status: 'failed', failedStage: stage, errorCode: `${stage.toUpperCase()}_FAILED`, errorMessage: message },
  });
}

registerQueueEvents('stt');
registerQueueEvents('assessment');
registerQueueEvents('memory');
registerQueueEvents('review');

workers.push(
  new Worker(
    'stt',
    async (job) => {
      const sessionId = String(job.data.sessionId);
      try {
        const session = await prisma.practiceSession.findUnique({
          where: { id: sessionId },
          include: { mediaAsset: true },
        });
        if (!session?.mediaAsset) throw new Error('Session or media asset not found');

        const result = await speechTool.transcribe({
          storageKey: session.mediaAsset.storageKey,
          mimeType: session.mediaAsset.mimeType,
          language: 'en',
        });
        await prisma.$transaction([
          prisma.answer.upsert({
            where: { sessionId },
            update: {
              rawTranscript: result.text,
              confirmedTranscript: null,
              transcriptConfirmedAt: null,
              sttProvider: result.provider,
              sttConfidence: result.confidence,
              durationMs: session.mediaAsset.durationMs,
            },
            create: {
              sessionId,
              userId: session.userId,
              questionId: session.questionId,
              rawTranscript: result.text,
              sttProvider: result.provider,
              sttConfidence: result.confidence,
              durationMs: session.mediaAsset.durationMs,
            },
          }),
          prisma.practiceSession.update({
            where: { id: sessionId },
            data: { status: 'transcribed', failedStage: null, errorCode: null, errorMessage: null },
          }),
        ]);
        console.log('[stt] transcribed session', sessionId);
        return result;
      } catch (error) {
        if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) await markFailed(sessionId, 'stt', error);
        throw error;
      }
    },
    { connection },
  ),
);

workers.push(
  new Worker(
    'assessment',
    async (job) => {
      const sessionId = String(job.data.sessionId);
      try {
        const session = await prisma.practiceSession.findUnique({
          where: { id: sessionId },
          include: { question: true, answer: true },
        });
        if (!session?.answer?.confirmedTranscript) throw new Error('Confirmed transcript not found');

        const result = assessmentResultSchema.parse(
          await assessmentAgent.evaluate({
            question: session.question.content,
            transcript: session.answer.confirmedTranscript,
          }),
        );
        const answer = session.answer;

        await prisma.$transaction(async (tx) => {
          await tx.feedback.upsert({
            where: { answerId: answer.id },
            update: {
              grammarScore: result.scores.grammar,
              vocabularyScore: result.scores.vocabulary,
              fluencyScore: result.scores.fluency,
              coherenceScore: result.scores.coherence,
              naturalnessScore: result.scores.naturalness,
              bandScore: result.band_score,
              grammarComments: result.grammar_comments,
              vocabularySuggestions: result.vocabulary_suggestions,
              nativeVersion: result.native_version,
              band7Version: result.band7_version,
              rationale: result.rationale,
              model: assessmentAgent.model,
              promptVersion: 'assessment/v1',
              rawResponse: result as Prisma.InputJsonValue,
            },
            create: {
              answerId: answer.id,
              grammarScore: result.scores.grammar,
              vocabularyScore: result.scores.vocabulary,
              fluencyScore: result.scores.fluency,
              coherenceScore: result.scores.coherence,
              naturalnessScore: result.scores.naturalness,
              bandScore: result.band_score,
              grammarComments: result.grammar_comments,
              vocabularySuggestions: result.vocabulary_suggestions,
              nativeVersion: result.native_version,
              band7Version: result.band7_version,
              rationale: result.rationale,
              model: assessmentAgent.model,
              promptVersion: 'assessment/v1',
              rawResponse: result as Prisma.InputJsonValue,
            },
          });

          const oldItems = await Promise.all([
            tx.expression.findMany({ where: { answerId: answer.id }, select: { id: true } }),
            tx.mistake.findMany({ where: { answerId: answer.id }, select: { id: true } }),
          ]);
          const oldTargetIds = oldItems.flat().map((item) => item.id);
          if (oldTargetIds.length) await tx.reviewTask.deleteMany({ where: { targetId: { in: oldTargetIds } } });
          await tx.expression.deleteMany({ where: { answerId: answer.id } });
          await tx.mistake.deleteMany({ where: { answerId: answer.id } });

          const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          for (const expression of result.expressions) {
            const saved = await tx.expression.create({
              data: { userId: session.userId, answerId: answer.id, topic: session.question.topic, ...expression },
            });
            await tx.reviewTask.create({
              data: {
                userId: session.userId,
                targetType: 'expression',
                targetId: saved.id,
                prompt: `Use "${saved.text}" in a new answer.`,
                dueAt,
              },
            });
          }
          for (const mistake of result.mistakes) {
            const saved = await tx.mistake.create({
              data: {
                userId: session.userId,
                answerId: answer.id,
                type: mistake.type,
                spanText: mistake.span_text,
                correction: mistake.correction,
                explanation: mistake.explanation,
                severity: mistake.severity,
              },
            });
            if (saved.severity === 'high') {
              await tx.reviewTask.create({
                data: {
                  userId: session.userId,
                  targetType: 'mistake',
                  targetId: saved.id,
                  prompt: `Correct this sentence: "${saved.spanText}"`,
                  dueAt,
                },
              });
            }
          }

          const currentStat = await tx.topicStat.findUnique({
            where: { userId_topic: { userId: session.userId, topic: session.question.topic } },
          });
          const attemptCount = (currentStat?.attemptCount ?? 0) + 1;
          const previousTotal = Number(currentStat?.avgBand ?? 0) * (attemptCount - 1);
          await tx.topicStat.upsert({
            where: { userId_topic: { userId: session.userId, topic: session.question.topic } },
            update: {
              attemptCount,
              avgBand: (previousTotal + result.band_score) / attemptCount,
              lastPracticedAt: new Date(),
            },
            create: {
              userId: session.userId,
              topic: session.question.topic,
              attemptCount: 1,
              avgBand: result.band_score,
              lastPracticedAt: new Date(),
            },
          });
          await tx.user.update({ where: { id: session.userId }, data: { currentBandEstimate: result.band_score } });
          await tx.practiceSession.update({
            where: { id: sessionId },
            data: {
              status: 'completed',
              completedAt: new Date(),
              failedStage: null,
              errorCode: null,
              errorMessage: null,
            },
          });
        });

        console.log('[assessment] completed session', sessionId, result.band_score);
        return result;
      } catch (error) {
        if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) await markFailed(sessionId, 'assessment', error);
        throw error;
      }
    },
    { connection },
  ),
);

workers.push(new Worker('memory', async (job) => ({ ok: true, jobId: job.id }), { connection }));
workers.push(new Worker('review', async (job) => ({ ok: true, jobId: job.id }), { connection }));

async function shutdown() {
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all(queueEvents.map((events) => events.close()));
  await prisma.$disconnect();
}

process.once('SIGINT', () => void shutdown().then(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().then(() => process.exit(0)));

console.log('SpeakingOS worker started. Queues: stt, assessment, memory, review');
