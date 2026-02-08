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
import { Request } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PresignDto, CompleteUploadDto } from './dto';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  presign(@Req() req: Request, @Body() dto: PresignDto) {
    return this.mediaService.presign((req.user as { sub: string }).sub, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Req() req: Request, @Param('id') id: string, @Body() dto: CompleteUploadDto) {
    return this.mediaService.completeUpload((req.user as { sub: string }).sub, id, dto);
  }

  @Get()
  list(@Req() req: Request) {
    return this.mediaService.list((req.user as { sub: string }).sub);
  }

  @Get(':id')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.mediaService.detail((req.user as { sub: string }).sub, id);
  }
}
