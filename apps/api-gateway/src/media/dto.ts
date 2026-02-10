import { IsString, IsOptional, IsInt, IsIn, MaxLength, Min, Max } from 'class-validator';

const ALLOWED_CONTENT_TYPES = ['audio/webm', 'audio/wav', 'audio/mpeg'];

export class PresignDto {
  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType!: string;
}

export class CompleteUploadDto {
  @IsString()
  @MaxLength(500)
  objectKey!: string;

  @IsInt()
  @Min(100)
  @Max(3600000)
  @IsOptional()
  durationMs?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsInt()
  @Min(0)
  @Max(104857600)
  @IsOptional()
  sizeBytes?: number;
}
