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
  HttpCode,
  HttpStatus,
  NotFoundException,
  HttpException,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from '../billing';
import { AICoachService } from './ai-coach.service';
import { AssessDto } from './dto';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { PaginationDto } from '../common/pagination.dto';

@ApiTags('ai-coach')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AICoachController {
  constructor(
    private aiCoachService: AICoachService,
    private billingService: BillingService,
  ) {}

  @Post('assess')
  @HttpCode(HttpStatus.CREATED)
  async assess(@Req() req: AuthenticatedRequest, @Body() dto: AssessDto) {
    if (!(await this.billingService.hasCredits(req.user.id))) {
      throw new HttpException('INSUFFICIENT_CREDITS', 402);
    }
    const result = await this.aiCoachService.createAssessment(req.user.id, dto);
    return { ...result, sseUrl: `/api/v1/ai/assess/${result.assessmentId}/stream` };
  }

  @Get('assessments')
  listAssessments(@Req() req: AuthenticatedRequest, @Query() pagination: PaginationDto) {
    return this.aiCoachService.listAssessments(req.user.id, pagination);
  }

  @Get('assess/:id')
  async getAssessment(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const assessment = await this.aiCoachService.getAssessment(req.user.id, id);
    if (!assessment) throw new NotFoundException();
    return assessment;
  }

  @Sse('assess/:id/stream')
  stream(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Query('since') since?: string): Observable<MessageEvent> {
    const sinceSeq = since ? parseInt(since, 10) : -1;
    return this.aiCoachService.streamEvents(id, req.user.id, isNaN(sinceSeq) ? -1 : sinceSeq);
  }
}
