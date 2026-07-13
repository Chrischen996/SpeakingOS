import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { fileURLToPath } from 'node:url';
import { AuthModule } from './modules/auth/auth.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MemoryModule } from './modules/memory/memory.module.js';
import { PracticeModule } from './modules/practice/practice.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { ReviewModule } from './modules/review/review.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: fileURLToPath(new URL('../../../.env', import.meta.url)) }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            ...(redisUrl.username ? { username: redisUrl.username } : {}),
            ...(redisUrl.password ? { password: redisUrl.password } : {}),
          },
        };
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
