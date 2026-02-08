import { IsString, IsOptional, IsInt } from 'class-validator';

export class PresignDto {
  @IsString()
  filename: string;

  @IsString()
  @IsOptional()
  mimeType?: string;
}

export class CompleteUploadDto {
  @IsInt()
  @IsOptional()
  bytes?: number;

  @IsInt()
  @IsOptional()
  durationMs?: number;
}
