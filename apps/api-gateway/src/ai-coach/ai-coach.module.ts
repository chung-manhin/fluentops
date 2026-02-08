import { Module } from '@nestjs/common';
import { AICoachController } from './ai-coach.controller';
import { AICoachService } from './ai-coach.service';

@Module({
  controllers: [AICoachController],
  providers: [AICoachService],
  exports: [AICoachService],
})
export class AICoachModule {}
