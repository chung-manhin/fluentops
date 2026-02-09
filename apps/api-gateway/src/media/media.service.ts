import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { MinioService } from './minio.service';
import { PresignDto, CompleteUploadDto } from './dto';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private config: ConfigService,
  ) {}

  async presign(userId: string, dto: PresignDto) {
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const objectKey = `recordings/${userId}/${Date.now()}-${safeName}`;
    const uploadUrl = await this.minio.presignedPutUrl(objectKey);
    const fileUrl = this.buildFileUrl(objectKey);
    return { uploadUrl, objectKey, fileUrl };
  }

  async complete(userId: string, dto: CompleteUploadDto) {
    if (!dto.objectKey.startsWith(`recordings/${userId}/`)) {
      throw new ForbiddenException('Object key does not belong to user');
    }
    const recording = await this.prisma.recording.create({
      data: {
        userId,
        objectKey: dto.objectKey,
        mimeType: dto.mimeType || 'audio/webm',
        sizeBytes: dto.sizeBytes ?? 0,
        durationMs: dto.durationMs,
        status: 'UPLOADED',
      },
    });
    return {
      id: recording.id,
      url: this.buildFileUrl(recording.objectKey),
      createdAt: recording.createdAt,
    };
  }

  async list(userId: string) {
    const recordings = await this.prisma.recording.findMany({
      where: { userId, status: 'UPLOADED' },
      orderBy: { createdAt: 'desc' },
    });
    return recordings.map((r) => ({
      ...r,
      url: this.buildFileUrl(r.objectKey),
    }));
  }

  async detail(userId: string, id: string) {
    const recording = await this.prisma.recording.findFirst({
      where: { id, userId },
    });
    if (!recording) throw new NotFoundException('Recording not found');

    const playUrl = await this.minio.presignedGetUrl(recording.objectKey);
    return { ...recording, playUrl };
  }

  private buildFileUrl(objectKey: string): string {
    const publicUrl = this.config.get('MINIO_PUBLIC_URL');
    if (publicUrl) {
      const bucket = this.config.get('MINIO_BUCKET', 'fluentops');
      return `${publicUrl}/${bucket}/${objectKey}`;
    }
    // fallback: construct from endpoint
    const endpoint = this.config.get('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get('MINIO_PORT', '9000');
    const bucket = this.config.get('MINIO_BUCKET', 'fluentops');
    return `http://${endpoint}:${port}/${bucket}/${objectKey}`;
  }
}
