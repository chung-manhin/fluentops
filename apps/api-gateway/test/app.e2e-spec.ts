import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma';
import { MinioService } from './../src/media';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: `test-${Date.now()}@example.com`,
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
    await prisma.recording.deleteMany({ where: { user: { email: testUser.email } } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
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
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testUser.email);
    });

    it('POST /auth/login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
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

      expect(res.body.email).toBe(testUser.email);
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

      expect(res.body.email).toBe(testUser.email);
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

  describe('Media flow: presign -> complete -> list -> detail', () => {
    let accessToken: string;
    let recordingId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200);
      accessToken = res.body.accessToken;
    });

    it('POST /media/presign', async () => {
      const res = await request(app.getHttpServer())
        .post('/media/presign')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ filename: 'test.webm' })
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('uploadUrl');
      expect(res.body).toHaveProperty('objectKey');
      recordingId = res.body.id;
    });

    it('POST /media/:id/complete', async () => {
      const res = await request(app.getHttpServer())
        .post(`/media/${recordingId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bytes: 12345 })
        .expect(200);

      expect(res.body.status).toBe('UPLOADED');
      expect(res.body.bytes).toBe(12345);
    });

    it('GET /media (list)', async () => {
      const res = await request(app.getHttpServer())
        .get('/media')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].filename).toBe('test.webm');
    });

    it('GET /media/:id (detail with playUrl)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/media/${recordingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(recordingId);
      expect(res.body).toHaveProperty('playUrl');
    });

    it('GET /media without auth returns 401', () => {
      return request(app.getHttpServer())
        .get('/media')
        .expect(401);
    });
  });
});
