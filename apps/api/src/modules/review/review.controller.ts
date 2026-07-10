import { Body, Controller, Get, Param, Post } from '@nestjs/common';

@Controller('reviews')
export class ReviewController {
  @Get('today')
  today() {
    return { reviews: [] };
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() body: { result: 'remembered' | 'fuzzy' | 'forgot' }) {
    return { id, status: 'completed', result: body.result };
  }
}
