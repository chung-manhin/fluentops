import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { MinioService } from './minio.service';
import { PresignDto, CompleteUploadDto } from './dto';
import { PaginationDto } from '../common/pagination.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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

    // Verify actual file size from storage
    try {
      const stat = await this.minio.statObject(dto.objectKey);
      if (stat.size > MediaService.MAX_FILE_SIZE) {
        await this.minio.deleteObject(dto.objectKey);
        await this.prisma.recording.delete({ where: { id: recording.id } });
        throw new BadRequestException(`File exceeds maximum size of ${MediaService.MAX_FILE_SIZE} bytes`);
      }
      // Update with actual size from storage
      if (stat.size !== recording.sizeBytes) {
        await this.prisma.recording.update({
          where: { id: recording.id },
          data: { sizeBytes: stat.size },
        });
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Could not verify file size for ${dto.objectKey}: ${err instanceof Error ? err.message : err}`);
    }
    return {
      id: recording.id,
      url: this.buildFileUrl(recording.objectKey),
      createdAt: recording.createdAt,
    };
  }

  async list(userId: string, pagination?: PaginationDto) {
    const recordings = await this.prisma.recording.findMany({
      where: { userId, status: 'UPLOADED' },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 20,
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
