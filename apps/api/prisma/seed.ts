import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();
const demoUserId = '00000000-0000-0000-0000-000000000001';

await prisma.user.upsert({
  where: { id: demoUserId },
  update: {},
  create: {
    id: demoUserId,
    email: 'demo@speakingos.local',
    passwordHash: 'development-only-demo-user',
    targetBand: 7,
    timezone: 'Asia/Shanghai',
    onboardingStatus: 'done',
  },
});

const questions = [
  { topic: 'Food and drink', difficulty: 'easy' as const, content: 'Do you enjoy drinking coffee?' },
  { topic: 'Work and study', difficulty: 'easy' as const, content: 'Do you prefer studying in the morning or at night?' },
  { topic: 'Hometown', difficulty: 'easy' as const, content: 'What do you like about your hometown?' },
  { topic: 'Technology', difficulty: 'medium' as const, content: 'How often do you use your mobile phone?' },
  { topic: 'Leisure', difficulty: 'medium' as const, content: 'What do you usually do in your free time?' },
];

for (const question of questions) {
  await prisma.question.upsert({
    where: { contentHash: createHash('sha256').update(question.content).digest('hex') },
    update: {},
    create: {
      part: 'part1',
      source: 'curated',
      active: true,
      tags: [question.topic.toLowerCase().replaceAll(' ', '-')],
      contentHash: createHash('sha256').update(question.content).digest('hex'),
      ...question,
    },
  });
}

await prisma.$disconnect();
