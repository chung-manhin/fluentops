import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  Matches,
  ValidateIf,
} from 'class-validator';

export class AssessDto {
  @IsIn(['text', 'recording'])
  inputType!: 'text' | 'recording';

  @ValidateIf((o: AssessDto) => o.inputType === 'text')
  @IsString()
  @MaxLength(5000)
  @Matches(/\S/, { message: 'text must not be empty' })
  text?: string;

  @ValidateIf((o: AssessDto) => o.inputType === 'recording')
  @IsString()
  recordingId?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  goals?: string[];
}
