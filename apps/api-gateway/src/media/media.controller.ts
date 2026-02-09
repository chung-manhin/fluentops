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
import { Request } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PresignDto, CompleteUploadDto } from './dto';

@ApiTags('media')
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  presign(@Req() req: Request, @Body() dto: PresignDto) {
    return this.mediaService.presign((req.user as { id: string }).id, dto);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  complete(@Req() req: Request, @Body() dto: CompleteUploadDto) {
    return this.mediaService.complete((req.user as { id: string }).id, dto);
  }

  @Get()
  list(@Req() req: Request) {
    return this.mediaService.list((req.user as { id: string }).id);
  }

  @Get(':id')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.mediaService.detail((req.user as { id: string }).id, id);
  }
}
