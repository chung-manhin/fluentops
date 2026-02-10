import { IsString, IsOptional, IsIn, IsArray, MaxLength, ArrayMaxSize } from 'class-validator';

export class AssessDto {
  @IsIn(['text', 'recording'])
  inputType!: 'text' | 'recording';

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  recordingId?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  goals?: string[];
}
