import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from './prisma';
import { HealthResponse } from '@fluentops/shared';

@ApiTags('system')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private prisma: PrismaService) {}

  @Get('health')
  async health(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const body: HealthResponse = { status: 'ok', db: 'up', uptime: process.uptime() };
      res.status(HttpStatus.OK).json(body);
    } catch (err) {
      this.logger.error('Health check DB probe failed', err instanceof Error ? err.stack : err);
      const body: HealthResponse = { status: 'error', db: 'down', uptime: process.uptime() };
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(body);
    }
  }
}
