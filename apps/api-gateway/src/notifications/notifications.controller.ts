import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { SendAssessmentEmailDto } from './dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('assessment-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email the user a completed assessment summary' })
  @ApiResponse({ status: 200, description: 'Email accepted for delivery' })
  sendAssessmentEmail(@Req() req: AuthenticatedRequest, @Body() dto: SendAssessmentEmailDto) {
    return this.notificationsService.sendAssessmentSummary(req.user.id, dto.assessmentId);
  }
}
