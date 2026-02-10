import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma';
import { MinioService } from './../src/media';

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
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.assessmentEvent.deleteMany({ where: { assessment: { user: { email: { in: [userA.email, userB.email] } } } } });
    await prisma.assessment.deleteMany({ where: { user: { email: { in: [userA.email, userB.email] } } } });
    await prisma.creditLedger.deleteMany({ where: { user: { email: { in: [userA.email, userB.email] } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: [userA.email, userB.email] } } } });
    await prisma.userBalance.deleteMany({ where: { user: { email: { in: [userA.email, userB.email] } } } });
    await prisma.recording.deleteMany({ where: { user: { email: { in: [userA.email, userB.email] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.db).toBe('up');
        expect(typeof res.body.uptime).toBe('number');
      });
  });

  describe('Auth flow: register -> login -> refresh -> me -> logout', () => {
    let accessToken: string;
    let refreshToken: string;

    it('POST /api/v1/auth/register', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userA)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(userA.email);
    });

    it('POST /api/v1/auth/login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(userA)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('GET /api/v1/me with accessToken', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(userA.email);
    });

    it('POST /api/v1/auth/refresh (rotation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.refreshToken).not.toBe(refreshToken);
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('GET /api/v1/me with new accessToken', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(userA.email);
    });

    it('POST /api/v1/auth/logout', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(204);
    });

    it('POST /api/v1/auth/refresh with revoked token fails', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
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
        .post('/api/v1/auth/login')
        .send(userA)
        .expect(200);
      tokenA = resA.body.accessToken;

      // register + login userB
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userB)
        .expect(201);
      const resB = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(userB)
        .expect(200);
      tokenB = resB.body.accessToken;
    });

    it('POST /api/v1/media/presign returns uploadUrl, objectKey, fileUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/media/presign')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ filename: 'test.webm', contentType: 'audio/webm' })
        .expect(200);

      expect(res.body).toHaveProperty('uploadUrl');
      expect(res.body).toHaveProperty('objectKey');
      expect(res.body).toHaveProperty('fileUrl');
      expect(res.body.objectKey).toContain('recordings/');
      objectKey = res.body.objectKey;
    });

    it('POST /api/v1/media/presign rejects invalid contentType', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/media/presign')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ filename: 'test.mp4', contentType: 'video/mp4' })
        .expect(400);
    });

    it('POST /api/v1/media/complete writes to DB', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/media/complete')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ objectKey, sizeBytes: 12345, mimeType: 'audio/webm', durationMs: 5000 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('url');
      expect(res.body).toHaveProperty('createdAt');
      recordingId = res.body.id;
    });

    it('GET /api/v1/media lists recordings for current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/media')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('url');
    });

    it('GET /api/v1/media/:id returns detail with playUrl', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/media/${recordingId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.id).toBe(recordingId);
      expect(res.body).toHaveProperty('playUrl');
    });

    it('userB cannot see userA recordings via GET /media', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/media')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.length).toBe(0);
    });

    it('userB cannot access userA recording detail', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/media/${recordingId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('GET /api/v1/media without auth returns 401', () => {
      return request(app.getHttpServer())
        .get('/api/v1/media')
        .expect(401);
    });
  });

  describe('AI Coach flow: assess -> poll result -> list', () => {
    let tokenA: string;
    let assessmentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(userA)
        .expect(200);
      tokenA = res.body.accessToken;

      // seed credits so AI assess doesn't return 402
      const user = await prisma.user.findFirstOrThrow({ where: { email: userA.email } });
      await prisma.userBalance.upsert({
        where: { userId: user.id },
        create: { userId: user.id, credits: 10 },
        update: { credits: 10 },
      });
    });

    it('POST /api/v1/ai/assess (text) returns assessmentId + traceId + sseUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/assess')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ inputType: 'text', text: 'I go to school yesterday and buyed a book' })
        .expect(201);

      expect(res.body).toHaveProperty('assessmentId');
      expect(res.body).toHaveProperty('traceId');
      expect(res.body).toHaveProperty('sseUrl');
      assessmentId = res.body.assessmentId;
    });

    it('GET /api/v1/ai/assess/:id returns succeeded with rubric structure', async () => {
      // poll until SUCCEEDED or timeout 5s
      let status = '';
      let body: Record<string, unknown> = {};
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/ai/assess/${assessmentId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .expect(200);
        body = res.body;
        status = res.body.status;
        if (status === 'SUCCEEDED' || status === 'FAILED') break;
        await new Promise((r) => setTimeout(r, 200));
      }

      expect(status).toBe('SUCCEEDED');
      const rubric = body.rubricJson as Record<string, number>;
      expect(rubric).toBeDefined();
      expect(typeof rubric.grammar).toBe('number');
      expect(typeof rubric.vocab).toBe('number');
      expect(typeof rubric.fluency).toBe('number');
      expect(typeof rubric.clarity).toBe('number');
      expect(typeof rubric.naturalness).toBe('number');
      expect(body.feedbackMarkdown).toBeDefined();
      expect(typeof body.feedbackMarkdown).toBe('string');
    });

    it('GET /api/v1/ai/assessments lists recent assessments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/assessments')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('status');
      expect(res.body[0]).toHaveProperty('rubricJson');
    });

    it('POST /api/v1/ai/assess without auth returns 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ai/assess')
        .send({ inputType: 'text', text: 'hello' })
        .expect(401);
    });
  });

  describe('Billing flow: plans -> buy -> credits -> AI gate', () => {
    let tokenA: string;
    let planId: string;
    let orderId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(userA)
        .expect(200);
      tokenA = res.body.accessToken;

      // reset balance so billing tests start from 0
      const user = await prisma.user.findFirstOrThrow({ where: { email: userA.email } });
      await prisma.userBalance.deleteMany({ where: { userId: user.id } });
    });

    it('GET /api/v1/billing/plans returns at least 1 plan', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/billing/plans')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      planId = res.body[0].id;
    });

    it('GET /api/v1/billing/balance returns 0 credits', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/billing/balance')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.credits).toBe(0);
    });

    it('POST /api/v1/billing/order creates a pending order', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/billing/order')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ planId })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PENDING');
      orderId = res.body.id;
    });

    it('POST /api/v1/billing/mock/pay fulfills the order', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/billing/mock/pay')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ orderId })
        .expect(201);
    });

    it('GET /api/v1/billing/balance returns 10 credits after purchase', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/billing/balance')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.credits).toBe(10);
    });

    it('POST /api/v1/ai/assess succeeds with credits', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/assess')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ inputType: 'text', text: 'I go to school yesterday and buyed a book' })
        .expect(201);

      expect(res.body).toHaveProperty('assessmentId');

      // poll until done
      const deadline = Date.now() + 5000;
      let status = '';
      while (Date.now() < deadline) {
        const poll = await request(app.getHttpServer())
          .get(`/api/v1/ai/assess/${res.body.assessmentId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .expect(200);
        status = poll.body.status;
        if (status === 'SUCCEEDED' || status === 'FAILED') break;
        await new Promise((r) => setTimeout(r, 200));
      }
      expect(status).toBe('SUCCEEDED');
    });

    it('GET /api/v1/billing/balance returns 9 credits after assessment', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/billing/balance')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.credits).toBe(9);
    });

    it('POST /api/v1/ai/assess returns 402 when credits exhausted', async () => {
      // set credits to 0 directly
      const user = await prisma.user.findFirstOrThrow({ where: { email: userA.email } });
      await prisma.userBalance.update({ where: { userId: user.id }, data: { credits: 0 } });

      await request(app.getHttpServer())
        .post('/api/v1/ai/assess')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ inputType: 'text', text: 'hello world' })
        .expect(402);
    });
  });
});
