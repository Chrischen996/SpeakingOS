import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PracticeController } from './practice.controller.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'stt' }),
    BullModule.registerQueue({ name: 'assessment' }),
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
