import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth';
import { UserModule } from './user/user.module';
import { MediaModule } from './media';
import { BillingModule } from './billing';
import { AICoachModule } from './ai-coach';
import { validate } from './config/env.validation';
import { AppThrottlerGuard } from './common/app-throttler.guard';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { RedisModule } from './redis/redis.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            autoLogging: true,
            ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 20 }] }),
    RedisModule,
    PrismaModule,
    AuthModule,
    UserModule,
    MediaModule,
    BillingModule,
    AICoachModule,
    RealtimeModule,
    NotificationsModule,
    MaintenanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppThrottlerGuard,
    { provide: APP_GUARD, useExisting: AppThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
