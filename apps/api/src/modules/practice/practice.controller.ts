import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PracticeService } from './practice.service.js';

@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('today')
  today() {
    return this.practiceService.getTodayPractice();
  }

  @Post('sessions')
  createSession(@Body() body: { questionId: string }) {
    return this.practiceService.createSession(body.questionId);
  }

  @Post('sessions/:id/upload-url')
  createUploadUrl(@Param('id') id: string) {
    return this.practiceService.createUploadUrl(id);
  }

  @Post('sessions/:id/audio/complete')
  completeAudio(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.practiceService.completeAudio(id, body);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.practiceService.getSession(id);
  }

  @Patch('sessions/:id/transcript')
  confirmTranscript(@Param('id') id: string, @Body() body: { text: string; confirmed: true }) {
    return this.practiceService.confirmTranscript(id, body.text);
  }

  @Post('sessions/:id/assess')
  assess(@Param('id') id: string) {
    return this.practiceService.enqueueAssessment(id);
  }
}
