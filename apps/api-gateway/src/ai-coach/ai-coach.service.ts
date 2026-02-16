import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, timer, from, EMPTY } from 'rxjs';
import { switchMap, concatMap, tap, map, takeWhile, expand } from 'rxjs/operators';
import { PrismaService } from '../prisma';
import { BillingService } from '../billing';
import { buildGraph, createLLM, runMockWorkflow } from './ai-coach.workflow';
import { AssessDto } from './dto';
import { PaginationDto } from '../common/pagination.dto';

const STAGE_PCT: Record<string, [number, number]> = {
  diagnose: [5, 25],
  rewrite: [30, 50],
  drills: [55, 75],
  score: [80, 95],
};

const WORKFLOW_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AICoachService {
  private readonly logger = new Logger(AICoachService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private billingService: BillingService,
  ) {}

  async createAssessment(userId: string, dto: AssessDto) {
    const assessment = await this.prisma.assessment.create({
      data: {
        userId,
        inputType: dto.inputType === 'text' ? 'TEXT' : 'RECORDING',
        inputText: dto.text,
        recordingId: dto.recordingId,
      },
    });

    this.runWorkflowWithTimeout(assessment.id, userId, dto).catch((err) =>
      this.logger.error(`Workflow failed for assessment ${assessment.id}`, err?.stack ?? err),
    );

    return { assessmentId: assessment.id, traceId: assessment.traceId };
  }

  private async runWorkflowWithTimeout(assessmentId: string, userId: string, dto: AssessDto) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Workflow timed out after ${WORKFLOW_TIMEOUT_MS}ms`)), WORKFLOW_TIMEOUT_MS),
    );
    try {
      await Promise.race([this.runWorkflow(assessmentId, userId, dto), timeout]);
    } catch (err) {
      // Ensure status is FAILED regardless of where the error originated — use transaction for atomicity
      try {
        await this.prisma.$transaction(async (tx) => {
          const assessment = await tx.assessment.findUnique({ where: { id: assessmentId } });
          if (assessment && assessment.status === 'RUNNING') {
            const count = await tx.assessmentEvent.count({ where: { assessmentId } });
            await tx.assessmentEvent.create({
              data: { assessmentId, seq: count, type: 'ERROR', payloadJson: { message: 'Assessment timed out or failed unexpectedly' } },
            });
            await tx.assessment.update({ where: { id: assessmentId }, data: { status: 'FAILED' } });
          }
        });
      } catch (txErr) {
        this.logger.error(`Failed to mark assessment ${assessmentId} as FAILED`, txErr instanceof Error ? txErr.stack : txErr);
      }
      throw err;
    }
  }

  async runWorkflow(assessmentId: string, userId: string, dto: AssessDto) {
    const provider = this.config.get<string>('AI_PROVIDER') || '';
    const apiKey = this.config.get<string>('OPENAI_API_KEY') || '';
    const isMock = provider === 'mock' || !apiKey;

    await this.prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'RUNNING' } });

    try {
      let seq = 0;
      const writeProgress = async (stage: string, pct: number) => {
        await this.writeEvent(assessmentId, seq++, 'PROGRESS', { stage, pct });
      };

      let result: { issues: string[]; rewrites: string[]; drills: string[]; rubric: Record<string, number>; feedback: string };

      if (isMock) {
        result = await runMockWorkflow(writeProgress);
      } else {
        const model = this.config.get<string>('MODEL_NAME') || 'gpt-4o-mini';
        const temperature = parseFloat(this.config.get<string>('AI_TEMPERATURE') || '0.7');
        const llm = createLLM(apiKey, model, temperature);

        const callbacks = {
          beforeNode: async (name: string) => {
            await writeProgress(name, STAGE_PCT[name]?.[0] ?? 0);
          },
          afterNode: async (name: string) => {
            await writeProgress(name, STAGE_PCT[name]?.[1] ?? 0);
          },
        };

        const graph = buildGraph(llm, callbacks);
        result = await graph.invoke({
          text: dto.text || '',
          goals: dto.goals || [],
          issues: [],
          rewrites: [],
          drills: [],
          rubric: {},
          feedback: '',
        });
      }

      await this.writeEvent(assessmentId, seq++, 'FINAL', {
        rubric: result.rubric,
        issues: result.issues,
        rewrites: result.rewrites,
        drills: result.drills,
        feedbackMarkdown: result.feedback,
      });

      await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: 'SUCCEEDED', rubricJson: result.rubric, feedbackMarkdown: result.feedback },
      });

      await this.billingService.deductCredit(userId, 'ai_assess', assessmentId);
    } catch (err) {
      this.logger.error(`Assessment ${assessmentId} failed`, err instanceof Error ? err.stack : err);
      const count = await this.prisma.assessmentEvent.count({ where: { assessmentId } });
      await this.writeEvent(assessmentId, count, 'ERROR', { message: 'Assessment failed' });
      await this.prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'FAILED' } });
    }
  }

  private async writeEvent(assessmentId: string, seq: number, type: string, payload: unknown) {
    await this.prisma.assessmentEvent.create({
      data: {
        assessmentId,
        seq,
        type: type as 'PROGRESS' | 'TOKEN' | 'FINAL' | 'ERROR',
        payloadJson: payload as object,
      },
    });
  }

  async getAssessment(userId: string, id: string) {
    return this.prisma.assessment.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        rubricJson: true,
        feedbackMarkdown: true,
        traceId: true,
        inputType: true,
        inputText: true,
        createdAt: true,
      },
    });
  }

  async listAssessments(userId: string, pagination?: PaginationDto) {
    return this.prisma.assessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 20,
      select: {
        id: true,
        status: true,
        inputType: true,
        inputText: true,
        rubricJson: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    });
  }

  streamEvents(assessmentId: string, userId: string, since = -1): Observable<MessageEvent> {
    let lastSeq = since;
    let verified = false;
    let pollMs = 300; // start fast, back off when idle
    const MIN_POLL = 300;
    const MAX_POLL = 3000;

    const fetchEvents = () => {
      if (!verified) {
        return from(
          this.prisma.assessment.findFirst({ where: { id: assessmentId, userId } }).then((a) => {
            if (!a) return [];
            verified = true;
            return this.prisma.assessmentEvent.findMany({
              where: { assessmentId, seq: { gt: lastSeq } },
              orderBy: { seq: 'asc' },
              take: 50,
            });
          }),
        );
      }
      return from(
        this.prisma.assessmentEvent.findMany({
          where: { assessmentId, seq: { gt: lastSeq } },
          orderBy: { seq: 'asc' },
          take: 50,
        }),
      );
    };

    // Use recursive timer for adaptive polling
    return timer(0).pipe(
      expand(() => timer(pollMs)),
      switchMap(() => fetchEvents()),
      tap((events) => {
        if (events.length > 0) {
          pollMs = MIN_POLL; // reset to fast polling on activity
        } else {
          pollMs = Math.min(pollMs * 1.5, MAX_POLL); // back off when idle
        }
      }),
      concatMap((events) => (events.length ? from(events) : EMPTY)),
      tap((event) => {
        lastSeq = event.seq;
      }),
      map(
        (event) =>
          ({
            data: event.payloadJson,
            type: event.type.toLowerCase(),
            id: String(event.seq),
          }) as MessageEvent,
      ),
      takeWhile((event) => event.type !== 'final' && event.type !== 'error', true),
    );
  }
}
