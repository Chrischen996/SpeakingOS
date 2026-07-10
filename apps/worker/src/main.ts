import { QueueEvents, Worker } from 'bullmq';
import { FakeAssessmentAgent } from './agents/fake-assessment.agent.js';
import { FakeSpeechTool } from './tools/fake-speech.tool.js';

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  maxRetriesPerRequest: null as null,
};

const speechTool = new FakeSpeechTool();
const assessmentAgent = new FakeAssessmentAgent();

function registerQueueEvents(name: string) {
  const events = new QueueEvents(name, { connection });
  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`[${name}] job ${jobId} failed: ${failedReason}`);
  });
  return events;
}

registerQueueEvents('stt');
registerQueueEvents('assessment');
registerQueueEvents('memory');
registerQueueEvents('review');

new Worker(
  'stt',
  async (job) => {
    const result = await speechTool.transcribe({
      storageKey: String(job.data.storageKey ?? ''),
      mimeType: String(job.data.mimeType ?? 'audio/webm'),
      language: 'en',
    });
    console.log('[stt] transcribed session', job.data.sessionId, result);
    return result;
  },
  { connection },
);

new Worker(
  'assessment',
  async (job) => {
    const result = await assessmentAgent.evaluate({
      question: 'Do you enjoy drinking coffee?',
      transcript: 'Yes, I enjoy drinking coffee because it helps me focus in the morning.',
    });
    console.log('[assessment] assessed session', job.data.sessionId, result.band_score);
    return result;
  },
  { connection },
);

new Worker('memory', async (job) => ({ ok: true, jobId: job.id }), { connection });
new Worker('review', async (job) => ({ ok: true, jobId: job.id }), { connection });

console.log('SpeakingOS worker started. Queues: stt, assessment, memory, review');
