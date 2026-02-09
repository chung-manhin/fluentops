import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Sse,
  NotFoundException,
  HttpException,
  MessageEvent,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from '../billing';
import { AICoachService } from './ai-coach.service';
import { AssessDto } from './dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AICoachController {
  constructor(
    private aiCoachService: AICoachService,
    private billingService: BillingService,
  ) {}

  @Post('assess')
  async assess(@Req() req: Request, @Body() dto: AssessDto) {
    const userId = (req.user as { id: string }).id;
    if (!(await this.billingService.hasCredits(userId))) {
      throw new HttpException('INSUFFICIENT_CREDITS', 402);
    }
    const result = await this.aiCoachService.createAssessment(userId, dto);
    return { ...result, sseUrl: `/ai/assess/${result.assessmentId}/stream` };
  }

  @Get('assessments')
  listAssessments(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.aiCoachService.listAssessments(userId);
  }

  @Get('assess/:id')
  async getAssessment(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { id: string }).id;
    const assessment = await this.aiCoachService.getAssessment(userId, id);
    if (!assessment) throw new NotFoundException();
    return assessment;
  }

  @Sse('assess/:id/stream')
  stream(@Req() req: Request, @Param('id') id: string, @Query('since') since?: string): Observable<MessageEvent> {
    const userId = (req.user as { id: string }).id;
    const sinceSeq = since ? parseInt(since, 10) : -1;
    return this.aiCoachService.streamEvents(id, userId, isNaN(sinceSeq) ? -1 : sinceSeq);
  }
}
