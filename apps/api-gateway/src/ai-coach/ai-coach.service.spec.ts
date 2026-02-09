import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AICoachService } from './ai-coach.service';
import { PrismaService } from '../prisma';
import { BillingService } from '../billing';
import { AssessDto } from './dto';

describe('AICoachService', () => {
  let service: AICoachService;
  let prisma: {
    assessment: {
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    assessmentEvent: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      assessment: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      assessmentEvent: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AICoachService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 'mock' } },
        { provide: BillingService, useValue: { deductCredit: jest.fn() } },
      ],
    }).compile();

    service = module.get(AICoachService);
  });

  describe('createAssessment', () => {
    it('creates DB record and returns id + traceId', async () => {
      prisma.assessment.create.mockResolvedValue({ id: 'a1', traceId: 't1' });
      prisma.assessment.update.mockResolvedValue({});
      prisma.assessmentEvent.create.mockResolvedValue({});

      const dto = Object.assign(new AssessDto(), { inputType: 'text', text: 'hello' });
      const result = await service.createAssessment('u1', dto);
      expect(result).toEqual({ assessmentId: 'a1', traceId: 't1' });
      expect(prisma.assessment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', inputType: 'TEXT' }) }),
      );
    });
  });

  describe('listAssessments', () => {
    it('calls findMany with userId', async () => {
      prisma.assessment.findMany.mockResolvedValue([]);
      await service.listAssessments('u1');
      expect(prisma.assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
    });
  });

  describe('getAssessment', () => {
    it('scopes query by userId', async () => {
      prisma.assessment.findFirst.mockResolvedValue({ id: 'a1' });
      await service.getAssessment('u1', 'a1');
      expect(prisma.assessment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1', userId: 'u1' } }),
      );
    });
  });
});
