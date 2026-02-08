import { IsString, IsOptional, IsInt, IsIn } from 'class-validator';

const ALLOWED_CONTENT_TYPES = ['audio/webm', 'audio/wav', 'audio/mpeg'];

export class PresignDto {
  @IsString()
  filename: string;

  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType: string;
}

export class CompleteUploadDto {
  @IsString()
  objectKey: string;

  @IsInt()
  @IsOptional()
  durationMs?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsInt()
  @IsOptional()
  sizeBytes?: number;
}
