import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@fluentops/shared';

@Controller()
export class AppController {
  @Get('health')
  health(): HealthResponse {
    return { ok: true };
  }
}
