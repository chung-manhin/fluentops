import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './prisma';
import { HealthResponse } from '@fluentops/shared';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  async health(@Res() res: Response) {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      const body: HealthResponse = { status: 'ok', db: 'up', uptime: process.uptime() };
      res.status(HttpStatus.OK).json(body);
    } catch {
      const body: HealthResponse = { status: 'error', db: 'down', uptime: process.uptime() };
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(body);
    }
  }
}
