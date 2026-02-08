import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Observable } from 'rxjs';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma';
import { MinioService } from './../src/media';
import { AICoachService } from './../src/ai-coach';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userA = {
    email: `test-a-${Date.now()}@example.com`,
    password: 'password123',
  };
  const userB = {
    email: `test-b-${Date.now()}@example.com`,
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MinioService)
      .useValue({
        onModuleInit: async () => {},
        presignedPutUrl: async () => 'http://localhost:9000/fake-put-url',
        presignedGetUrl: async () => 'http://localhost:9000/fake-get-url',
        deleteObject: async () => {},
      })
      .overrideProvider(AICoachService)
      .useFactory({
        factory: (prisma: PrismaService) => ({
          createAssessment: async (userId: string, dto: { inputType: string; text?: string; recordingId?: string }) => {
            const assessment = await prisma.assessment.create({
              data: {
                userId,
                inputType: dto.inputType === 'text' ? 'TEXT' : 'RECORDING',
                inputText: dto.text,
                recordingId: dto.recordingId,
              },
            });
            // simulate async workflow
            setImmediate(async () => {
              await prisma.assessmentEvent.create({ data: { assessmentId: assessment.id, seq: 0, type: 'PROGRESS', payloadJson: { step: 'diagnose', pct: 25 } } });
              await prisma.assessmentEvent.create({ data: { assessmentId: assessment.id, seq: 1, type: 'PROGRESS', payloadJson: { step: 'score', pct: 75 } } });
              await prisma.assessmentEvent.create({ data: { assessmentId: assessment.id, seq: 2, type: 'FINAL', payloadJson: { rubric: { grammar: 70, vocab: 80, fluency: 60, clarity: 75, naturalness: 65 }, feedback: '**Good effort!**', issues: ['past tense error'], rewrites: ['I went to school yesterday and bought a book.'], drills: ['Fix: I go -> ?'] } } });
              await prisma.assessment.update({ where: { id: assessment.id }, data: { status: 'SUCCEEDED', rubricJson: { grammar: 70, vocab: 80, fluency: 60, clarity: 75, naturalness: 65 }, feedbackMarkdown: '**Good effort!**' } });
            });
            return { assessmentId: assessment.id, traceId: assessment.traceId };
          },
          getAssessment: async (userId: string, id: string) => {
            return prisma.assessment.findFirst({ where: { id, userId }, select: { id: true, status: true, rubricJson: true, feedbackMarkdown: true, traceId: true, inputType: true, inputText: true, createdAt: true } });
          },
          streamEvents: (assessmentId: string) => {
            return new Observable((subscriber) => {
              const check = async () => {
                const events = await prisma.assessmentEvent.findMany({ where: { assessmentId }, orderBy: { seq: 'asc' } });
                for (const event of events) {
                  subscriber.next({ data: JSON.stringify(event.payloadJson), type: event.type.toLowerCase() });
                }
                if (events.some((e) => e.type === 'FINAL' || e.type === 'ERROR')) {
                  subscriber.complete();
                } else {
                  setTimeout(check, 100);
                }
              };
              setTimeout(check, 100);
            });
          },
        }),
        inject: [PrismaService],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.assessmentEvent.deleteMany({ where: { assessment: { user: { email: { in: [userA.email, userB.email] } } } } });
    await prisma.assessment.deleteMany({ where: { user: { email: { in: [userA.email, userB.email] } } } });
    await prisma.recording.deleteMany({ where: { user: { email: { in: [userA.email, userB.email] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true });
  });

  describe('Auth flow: register -> login -> refresh -> me -> logout', () => {
    let accessToken: string;
    let refreshToken: string;

    it('POST /auth/register', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userA)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(userA.email);
    });

    it('POST /auth/login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(userA)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('GET /me with accessToken', async () => {
      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(userA.email);
    });

    it('POST /auth/refresh (rotation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.refreshToken).not.toBe(refreshToken);
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('GET /me with new accessToken', async () => {
      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(userA.email);
    });

    it('POST /auth/logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(204);
    });

    it('POST /auth/refresh with revoked token fails', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Media flow: presign -> complete -> list -> detail + isolation', () => {
    let tokenA: string;
    let tokenB: string;
    let objectKey: string;
    let recordingId: string;

    beforeAll(async () => {
      // login userA
      const resA = await request(app.getHttpServer())
        .post('/auth/login')
        .send(userA)
        .expect(200);
      tokenA = resA.body.accessToken;

      // register + login userB
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userB)
        .expect(201);
      const resB = await request(app.getHttpServer())
        .post('/auth/login')
        .send(userB)
        .expect(200);
      tokenB = resB.body.accessToken;
    });

    it('POST /media/presign returns uploadUrl, objectKey, fileUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/media/presign')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ filename: 'test.webm', contentType: 'audio/webm' })
        .expect(200);

      expect(res.body).toHaveProperty('uploadUrl');
      expect(res.body).toHaveProperty('objectKey');
      expect(res.body).toHaveProperty('fileUrl');
      expect(res.body.objectKey).toContain('recordings/');
      objectKey = res.body.objectKey;
    });

    it('POST /media/presign rejects invalid contentType', async () => {
      await request(app.getHttpServer())
        .post('/media/presign')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ filename: 'test.mp4', contentType: 'video/mp4' })
        .expect(400);
    });

    it('POST /media/complete writes to DB', async () => {
      const res = await request(app.getHttpServer())
        .post('/media/complete')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ objectKey, sizeBytes: 12345, mimeType: 'audio/webm', durationMs: 5000 })
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('url');
      expect(res.body).toHaveProperty('createdAt');
      recordingId = res.body.id;
    });

    it('GET /media lists recordings for current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/media')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('url');
    });

    it('GET /media/:id returns detail with playUrl', async () => {
      const res = await request(app.getHttpServer())
        .get(`/media/${recordingId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.id).toBe(recordingId);
      expect(res.body).toHaveProperty('playUrl');
    });

    it('userB cannot see userA recordings via GET /media', async () => {
      const res = await request(app.getHttpServer())
        .get('/media')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.length).toBe(0);
    });

    it('userB cannot access userA recording detail', async () => {
      await request(app.getHttpServer())
        .get(`/media/${recordingId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('GET /media without auth returns 401', () => {
      return request(app.getHttpServer())
        .get('/media')
        .expect(401);
    });
  });

  describe('AI Coach flow: assess -> poll result -> stream', () => {
    let tokenA: string;
    let assessmentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(userA)
        .expect(200);
      tokenA = res.body.accessToken;
    });

    it('POST /ai/assess (text) returns assessmentId + traceId', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/assess')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ inputType: 'text', text: 'I go to school yesterday and buyed a book' })
        .expect(201);

      expect(res.body).toHaveProperty('assessmentId');
      expect(res.body).toHaveProperty('traceId');
      expect(res.body).toHaveProperty('sseUrl');
      assessmentId = res.body.assessmentId;
    });

    it('GET /ai/assess/:id returns succeeded after mock completes', async () => {
      // wait for mock setImmediate to finish
      await new Promise((r) => setTimeout(r, 500));

      const res = await request(app.getHttpServer())
        .get(`/ai/assess/${assessmentId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.status).toBe('SUCCEEDED');
      expect(res.body.rubricJson).toBeDefined();
      expect(res.body.feedbackMarkdown).toBeDefined();
    });

    it('POST /ai/assess without auth returns 401', () => {
      return request(app.getHttpServer())
        .post('/ai/assess')
        .send({ inputType: 'text', text: 'hello' })
        .expect(401);
    });
  });
});
