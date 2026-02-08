import { Injectable, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, interval, from, EMPTY } from 'rxjs';
import { switchMap, concatMap, tap, map, takeWhile } from 'rxjs/operators';
import { PrismaService } from '../prisma';
import { buildGraph, createLLM } from './ai-coach.workflow';
import { AssessDto } from './dto';

const STAGE_PCT: Record<string, [number, number]> = {
  diagnose: [5, 25],
  rewrite: [30, 50],
  drills: [55, 75],
  score: [80, 95],
};

@Injectable()
export class AICoachService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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

    this.runWorkflow(assessment.id, dto).catch(() => {});

    return { assessmentId: assessment.id, traceId: assessment.traceId };
  }

  async runWorkflow(assessmentId: string, dto: AssessDto) {
    const provider = this.config.get<string>('AI_PROVIDER') || '';
    const apiKey = this.config.get<string>('OPENAI_API_KEY') || '';
    const isMock = provider === 'mock' || !apiKey;

    await this.prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'RUNNING' } });

    const model = this.config.get<string>('MODEL_NAME') || 'gpt-4o-mini';
    const temperature = parseFloat(this.config.get<string>('AI_TEMPERATURE') || '0.7');

    try {
      let seq = 0;
      const llm = createLLM(isMock ? 'mock' : 'openai', apiKey, model, temperature);

      const callbacks = {
        beforeNode: async (name: string) => {
          const pct = STAGE_PCT[name]?.[0] ?? 0;
          await this.writeEvent(assessmentId, seq++, 'PROGRESS', { stage: name, pct });
        },
        afterNode: async (name: string) => {
          const pct = STAGE_PCT[name]?.[1] ?? 0;
          await this.writeEvent(assessmentId, seq++, 'PROGRESS', { stage: name, pct });
        },
      };

      const graph = buildGraph(llm, callbacks);
      const result = await graph.invoke({
        text: dto.text || '',
        goals: dto.goals || [],
        issues: [],
        rewrites: [],
        drills: [],
        rubric: {},
        feedback: '',
      });

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
    } catch (err) {
      const count = await this.prisma.assessmentEvent.count({ where: { assessmentId } });
      await this.writeEvent(assessmentId, count, 'ERROR', { message: String(err) });
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

  async listAssessments(userId: string) {
    return this.prisma.assessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        inputType: true,
        inputText: true,
        rubricJson: true,
        createdAt: true,
      },
    });
  }

  streamEvents(assessmentId: string, since = -1): Observable<MessageEvent> {
    let lastSeq = since;
    return interval(500).pipe(
      switchMap(() =>
        from(
          this.prisma.assessmentEvent.findMany({
            where: { assessmentId, seq: { gt: lastSeq } },
            orderBy: { seq: 'asc' },
          }),
        ),
      ),
      concatMap((events) => (events.length ? from(events) : EMPTY)),
      tap((event) => {
        lastSeq = event.seq;
      }),
      map(
        (event) =>
          ({
            data: JSON.stringify(event.payloadJson),
            type: event.type.toLowerCase(),
            id: String(event.seq),
          }) as MessageEvent,
      ),
      takeWhile((event) => event.type !== 'final' && event.type !== 'error', true),
    );
  }
}
