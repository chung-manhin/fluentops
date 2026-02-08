import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
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

  describe('AI Coach flow: assess -> poll result -> list', () => {
    let tokenA: string;
    let assessmentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(userA)
        .expect(200);
      tokenA = res.body.accessToken;
    });

    it('POST /ai/assess (text) returns assessmentId + traceId + sseUrl', async () => {
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

    it('GET /ai/assess/:id returns succeeded with rubric structure', async () => {
      // wait for async mock workflow to complete
      await new Promise((r) => setTimeout(r, 3000));

      const res = await request(app.getHttpServer())
        .get(`/ai/assess/${assessmentId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.status).toBe('SUCCEEDED');
      expect(res.body.rubricJson).toBeDefined();
      expect(res.body.rubricJson).toHaveProperty('grammar');
      expect(res.body.rubricJson).toHaveProperty('vocab');
      expect(res.body.rubricJson).toHaveProperty('fluency');
      expect(res.body.rubricJson).toHaveProperty('clarity');
      expect(res.body.rubricJson).toHaveProperty('naturalness');
      expect(res.body.feedbackMarkdown).toBeDefined();
      expect(typeof res.body.feedbackMarkdown).toBe('string');
    });

    it('GET /ai/assessments lists recent assessments', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai/assessments')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('status');
      expect(res.body[0]).toHaveProperty('rubricJson');
    });

    it('POST /ai/assess without auth returns 401', () => {
      return request(app.getHttpServer())
        .post('/ai/assess')
        .send({ inputType: 'text', text: 'hello' })
        .expect(401);
    });
  });
});
