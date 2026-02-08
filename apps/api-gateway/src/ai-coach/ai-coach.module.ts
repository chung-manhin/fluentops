import { Module } from '@nestjs/common';
import { BillingModule } from '../billing';
import { AICoachController } from './ai-coach.controller';
import { AICoachService } from './ai-coach.service';

@Module({
  imports: [BillingModule],
  controllers: [AICoachController],
  providers: [AICoachService],
  exports: [AICoachService],
})
export class AICoachModule {}
