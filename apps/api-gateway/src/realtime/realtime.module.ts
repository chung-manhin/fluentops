import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AssessmentGateway } from './assessment.gateway';
import { AssessmentRealtimeService } from './assessment-realtime.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [AssessmentRealtimeService, AssessmentGateway],
  exports: [AssessmentRealtimeService],
})
export class RealtimeModule {}
