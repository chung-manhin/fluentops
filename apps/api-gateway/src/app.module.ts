import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth';
import { UserModule } from './user/user.module';
import { MediaModule } from './media';
import { BillingModule } from './billing';
import { AICoachModule } from './ai-coach';
import { validate } from './config/env.validation';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: true,
        ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
      },
    }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 20 }] }),
    PrismaModule,
    AuthModule,
    UserModule,
    MediaModule,
    BillingModule,
    AICoachModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
