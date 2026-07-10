import { Controller, Get } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  @Get('summary')
  summary() {
    return {
      streakDays: 0,
      recentBand: null,
      weakTopics: [],
      dueReviews: 0,
    };
  }

  @Get('progress')
  progress() {
    return { points: [] };
  }
}
