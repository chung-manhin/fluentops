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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from '../billing';
import { AICoachService } from './ai-coach.service';
import { AssessDto } from './dto';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { PaginationDto } from '../common/pagination.dto';

@ApiTags('ai-coach')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AICoachController {
  constructor(
    private aiCoachService: AICoachService,
    private billingService: BillingService,
  ) {}

  @Post('assess')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit text for AI assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created, returns SSE URL' })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  async assess(@Req() req: AuthenticatedRequest, @Body() dto: AssessDto) {
    if (!(await this.billingService.hasCredits(req.user.id))) {
      throw new HttpException('INSUFFICIENT_CREDITS', 402);
    }
    const result = await this.aiCoachService.createAssessment(req.user.id, dto);
    return { ...result, sseUrl: `/api/v1/ai/assess/${result.assessmentId}/stream` };
  }

  @Get('assessments')
  @ApiOperation({ summary: 'List recent assessments' })
  @ApiResponse({ status: 200, description: 'Paginated list of assessments' })
  listAssessments(@Req() req: AuthenticatedRequest, @Query() pagination: PaginationDto) {
    return this.aiCoachService.listAssessments(req.user.id, pagination);
  }

  @Get('assess/:id')
  @ApiOperation({ summary: 'Get assessment result by ID' })
  @ApiResponse({ status: 200, description: 'Assessment detail' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async getAssessment(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const assessment = await this.aiCoachService.getAssessment(req.user.id, id);
    if (!assessment) throw new NotFoundException();
    return assessment;
  }

  @Sse('assess/:id/stream')
  @ApiOperation({ summary: 'SSE stream for assessment progress' })
  stream(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('since', new DefaultValuePipe(-1), ParseIntPipe) since: number,
  ): Observable<MessageEvent> {
    return this.aiCoachService.streamEvents(id, req.user.id, since);
  }
}
