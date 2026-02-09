import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    refreshToken: {
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: () => 'access-token' } },
        { provide: ConfigService, useValue: { get: (k: string) => ({ JWT_SECRET: 'secret', ACCESS_TOKEN_TTL: '15m', REFRESH_TOKEN_TTL: '7d' }[k]) } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('refresh — concurrent use', () => {
    it('second concurrent refresh fails when updateMany returns count=0', async () => {
      // First call finds the token
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'tok-1', userId: 'user-1' });
      // But atomic revoke fails (already revoked by concurrent request)
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.refresh('some-refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('succeeds when token is valid and updateMany revokes exactly 1', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'tok-1', userId: 'user-1' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('some-refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('fails when token not found (expired or already revoked)', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
