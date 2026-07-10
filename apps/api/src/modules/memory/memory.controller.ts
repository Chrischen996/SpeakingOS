import { Controller, Get } from '@nestjs/common';

@Controller('memory')
export class MemoryController {
  @Get('expressions')
  expressions() {
    return { expressions: [] };
  }

  @Get('mistakes')
  mistakes() {
    return { mistakes: [] };
  }
}
