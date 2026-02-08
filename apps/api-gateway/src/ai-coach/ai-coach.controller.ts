import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Sse,
  NotFoundException,
  MessageEvent,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AICoachService } from './ai-coach.service';
import { AssessDto } from './dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AICoachController {
  constructor(private aiCoachService: AICoachService) {}

  @Post('assess')
  async assess(@Req() req: Request, @Body() dto: AssessDto) {
    const userId = (req.user as { id: string }).id;
    const result = await this.aiCoachService.createAssessment(userId, dto);
    return { ...result, sseUrl: `/ai/assess/${result.assessmentId}/stream` };
  }

  @Get('assess/:id')
  async getAssessment(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { id: string }).id;
    const assessment = await this.aiCoachService.getAssessment(userId, id);
    if (!assessment) throw new NotFoundException();
    return assessment;
  }

  @Sse('assess/:id/stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.aiCoachService.streamEvents(id);
  }
}
