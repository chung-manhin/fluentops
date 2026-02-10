import { IsString, IsOptional, IsIn, IsArray } from 'class-validator';

export class AssessDto {
  @IsIn(['text', 'recording'])
  inputType!: 'text' | 'recording';

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  recordingId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  goals?: string[];
}
