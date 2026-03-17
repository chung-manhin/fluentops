import { IsString } from 'class-validator';

export class SendAssessmentEmailDto {
  @IsString()
  assessmentId!: string;
}
