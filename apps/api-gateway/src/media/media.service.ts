import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { MinioService } from './minio.service';
import { PresignDto, CompleteUploadDto } from './dto';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async presign(userId: string, dto: PresignDto) {
    const objectKey = `recordings/${userId}/${Date.now()}-${dto.filename}`;
    const recording = await this.prisma.recording.create({
      data: {
        userId,
        objectKey,
        filename: dto.filename,
        mimeType: dto.mimeType || 'audio/webm',
      },
    });
    const uploadUrl = await this.minio.presignedPutUrl(objectKey);
    return { id: recording.id, uploadUrl, objectKey };
  }

  async completeUpload(userId: string, id: string, dto: CompleteUploadDto) {
    const recording = await this.prisma.recording.findFirst({
      where: { id, userId },
    });
    if (!recording) throw new NotFoundException('Recording not found');

    return this.prisma.recording.update({
      where: { id },
      data: {
        status: 'UPLOADED',
        bytes: dto.bytes ?? 0,
        durationMs: dto.durationMs,
      },
    });
  }

  async list(userId: string) {
    return this.prisma.recording.findMany({
      where: { userId, status: 'UPLOADED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detail(userId: string, id: string) {
    const recording = await this.prisma.recording.findFirst({
      where: { id, userId },
    });
    if (!recording) throw new NotFoundException('Recording not found');

    const playUrl = await this.minio.presignedGetUrl(recording.objectKey);
    return { ...recording, playUrl };
  }
}
