import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth';
import { UserModule } from './user/user.module';
import { MediaModule } from './media';
import { BillingModule } from './billing';
import { AICoachModule } from './ai-coach';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    MediaModule,
    BillingModule,
    AICoachModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
