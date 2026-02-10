import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PresignDto, CompleteUploadDto } from './dto';
import { AuthenticatedRequest } from '../common/authenticated-request';
import { PaginationDto } from '../common/pagination.dto';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get presigned upload URL' })
  @ApiResponse({ status: 200, description: 'Upload URL and object key' })
  presign(@Req() req: AuthenticatedRequest, @Body() dto: PresignDto) {
    return this.mediaService.presign(req.user.id, dto);
  }

  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Confirm upload and save recording metadata' })
  @ApiResponse({ status: 201, description: 'Recording created' })
  complete(@Req() req: AuthenticatedRequest, @Body() dto: CompleteUploadDto) {
    return this.mediaService.complete(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user recordings' })
  @ApiResponse({ status: 200, description: 'Paginated list of recordings' })
  list(@Req() req: AuthenticatedRequest, @Query() pagination: PaginationDto) {
    return this.mediaService.list(req.user.id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recording detail with playback URL' })
  @ApiResponse({ status: 200, description: 'Recording detail' })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mediaService.detail(req.user.id, id);
  }
}
