import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PresignDto, CompleteUploadDto } from './dto';
import { AuthenticatedRequest } from '../common/authenticated-request';

@ApiTags('media')
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  presign(@Req() req: AuthenticatedRequest, @Body() dto: PresignDto) {
    return this.mediaService.presign(req.user.id, dto);
  }

  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  complete(@Req() req: AuthenticatedRequest, @Body() dto: CompleteUploadDto) {
    return this.mediaService.complete(req.user.id, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.mediaService.list(req.user.id);
  }

  @Get(':id')
  detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mediaService.detail(req.user.id, id);
  }
}
