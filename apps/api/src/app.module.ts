import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MemoryModule } from './modules/memory/memory.module.js';
import { PracticeModule } from './modules/practice/practice.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { ReviewModule } from './modules/review/review.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PracticeModule,
    ReviewModule,
    MemoryModule,
    DashboardModule,
  ],
})
export class AppModule {}
