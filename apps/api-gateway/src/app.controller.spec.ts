import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AppController } from './app.controller';
import { PrismaService } from './prisma';

describe('AppController', () => {
  let appController: AppController;
  let prisma: { $queryRawUnsafe: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRawUnsafe: jest.fn() };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('GET /health returns ok when DB is up', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
    const json = jest.fn();
    const res = { status: jest.fn().mockReturnValue({ json }) } as unknown as Response;
    await appController.health(res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok', db: 'up' }));
  });

  it('GET /health returns 503 when DB is down', async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('connection refused'));
    const json = jest.fn();
    const res = { status: jest.fn().mockReturnValue({ json }) } as unknown as Response;
    await appController.health(res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', db: 'down' }));
  });
});
