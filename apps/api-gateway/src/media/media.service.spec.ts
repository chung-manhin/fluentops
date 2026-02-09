import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma';
import { MinioService } from './minio.service';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: Record<string, any>;
  let minio: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      recording: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    minio = {
      presignedPutUrl: jest.fn().mockResolvedValue('http://minio/put'),
      presignedGetUrl: jest.fn().mockResolvedValue('http://minio/get'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: MinioService, useValue: minio },
        { provide: ConfigService, useValue: { get: (k: string, d?: string) => d ?? '' } },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  describe('presign', () => {
    it('sanitizes special chars in filename', async () => {
      const result = await service.presign('u1', { filename: 'héllo wörld!.webm', contentType: 'audio/webm' } as any);
      expect(result.objectKey).toMatch(/^recordings\/u1\/\d+-h_llo_w_rld_.webm$/);
    });

    it('truncates filename to 100 chars', async () => {
      const longName = 'a'.repeat(200) + '.webm';
      const result = await service.presign('u1', { filename: longName, contentType: 'audio/webm' } as any);
      const namePart = result.objectKey.split('/').pop()!;
      // timestamp-name, name part is after the first dash
      const sanitized = namePart.substring(namePart.indexOf('-') + 1);
      expect(sanitized.length).toBeLessThanOrEqual(100);
    });
  });

  describe('complete', () => {
    it('throws ForbiddenException for wrong user prefix', async () => {
      await expect(
        service.complete('u1', { objectKey: 'recordings/u2/file.webm', mimeType: 'audio/webm', sizeBytes: 100 } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates recording on success', async () => {
      const rec = { id: 'r1', objectKey: 'recordings/u1/file.webm', createdAt: new Date() };
      prisma.recording.create.mockResolvedValue(rec);
      const result = await service.complete('u1', { objectKey: 'recordings/u1/file.webm', mimeType: 'audio/webm', sizeBytes: 100 } as any);
      expect(result.id).toBe('r1');
    });
  });

  describe('list', () => {
    it('filters by userId', async () => {
      prisma.recording.findMany.mockResolvedValue([]);
      await service.list('u1');
      expect(prisma.recording.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', status: 'UPLOADED' } }),
      );
    });
  });

  describe('detail', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.recording.findFirst.mockResolvedValue(null);
      await expect(service.detail('u1', 'r1')).rejects.toThrow(NotFoundException);
    });

    it('returns recording with playUrl', async () => {
      prisma.recording.findFirst.mockResolvedValue({ id: 'r1', objectKey: 'recordings/u1/f.webm' });
      const result = await service.detail('u1', 'r1');
      expect(result.playUrl).toBe('http://minio/get');
    });
  });
});
