import { Injectable, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, interval, from, EMPTY } from 'rxjs';
import { switchMap, concatMap, tap, map, takeWhile } from 'rxjs/operators';
import { PrismaService } from '../prisma';
import { buildGraph } from './ai-coach.workflow';
import { AssessDto } from './dto';

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

    // Fire and forget — workflow runs in background
    this.runWorkflow(assessment.id, dto).catch(() => {});

    return { assessmentId: assessment.id, traceId: assessment.traceId };
  }

  async runWorkflow(assessmentId: string, dto: AssessDto) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      await this.writeEvent(assessmentId, 0, 'ERROR', { message: 'OPENAI_API_KEY not configured' });
      await this.prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'FAILED' } });
      return;
    }

    await this.prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'RUNNING' } });

    const model = this.config.get<string>('MODEL_NAME') || 'gpt-4o-mini';
    const temperature = parseFloat(this.config.get<string>('AI_TEMPERATURE') || '0.7');

    try {
      const graph = buildGraph(apiKey, model, temperature);
      let seq = 0;

      await this.writeEvent(assessmentId, seq++, 'PROGRESS', { step: 'diagnose', pct: 10 });
      const s1 = await graph.invoke({
        text: dto.text || '',
        goals: dto.goals || [],
        issues: [],
        rewrites: [],
        drills: [],
        rubric: {},
        feedback: '',
      });

      // Since LangGraph runs all nodes in sequence via invoke, we get the final state.
      // We write progress events retroactively for the SSE consumer.
      await this.writeEvent(assessmentId, seq++, 'PROGRESS', { step: 'rewrite', pct: 40 });
      await this.writeEvent(assessmentId, seq++, 'PROGRESS', { step: 'drills', pct: 65 });
      await this.writeEvent(assessmentId, seq++, 'PROGRESS', { step: 'score', pct: 90 });

      const rubric = s1.rubric;
      const feedback = s1.feedback;

      await this.writeEvent(assessmentId, seq++, 'FINAL', {
        issues: s1.issues,
        rewrites: s1.rewrites,
        drills: s1.drills,
        rubric,
        feedback,
      });

      await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: 'SUCCEEDED', rubricJson: rubric, feedbackMarkdown: feedback },
      });
    } catch (err) {
      const seq = await this.prisma.assessmentEvent.count({ where: { assessmentId } });
      await this.writeEvent(assessmentId, seq, 'ERROR', { message: String(err) });
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

  streamEvents(assessmentId: string): Observable<MessageEvent> {
    let lastSeq = -1;
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
          }) as MessageEvent,
      ),
      takeWhile((event) => event.type !== 'final' && event.type !== 'error', true),
    );
  }
}
