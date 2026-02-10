import { plainToInstance } from 'class-transformer';
import { IsString, IsOptional, IsIn, validateSync } from 'class-validator';

class EnvVars {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  REFRESH_SECRET!: string;

  @IsString()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsString()
  ACCESS_TOKEN_TTL: string = '15m';

  @IsString()
  REFRESH_TOKEN_TTL: string = '7d';

  @IsString()
  MINIO_ENDPOINT: string = 'localhost';

  @IsString()
  MINIO_PORT: string = '9000';

  @IsString()
  MINIO_USE_SSL: string = 'false';

  @IsString()
  MINIO_ACCESS_KEY: string = 'minio';

  @IsString()
  MINIO_SECRET_KEY: string = 'minio123456';

  @IsString()
  MINIO_BUCKET: string = 'fluentops';

  @IsString()
  @IsOptional()
  MINIO_PUBLIC_URL?: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  AI_PROVIDER?: string;

  @IsString()
  MODEL_NAME: string = 'gpt-4o-mini';

  @IsString()
  AI_TEMPERATURE: string = '0.7';

  @IsString()
  BILLING_PROVIDER: string = 'mock';

  @IsString()
  @IsOptional()
  ALIPAY_APP_ID?: string;

  @IsString()
  @IsOptional()
  ALIPAY_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  ALIPAY_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @IsOptional()
  ALIPAY_GATEWAY?: string;

  @IsString()
  @IsOptional()
  ALIPAY_NOTIFY_URL?: string;

  @IsString()
  @IsOptional()
  PORT?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const missing = errors.map((e) => e.property).join(', ');
    throw new Error(`Missing required env vars: ${missing}`);
  }
  // Warn about default secrets in production
  if (validated.NODE_ENV === 'production') {
    if (validated.JWT_SECRET === 'change-me-jwt' || validated.JWT_SECRET.length < 16) {
      throw new Error('JWT_SECRET must be changed from default in production');
    }
    if (validated.REFRESH_SECRET === 'change-me-refresh' || validated.REFRESH_SECRET.length < 16) {
      throw new Error('REFRESH_SECRET must be changed from default in production');
    }
  }
  return validated;
}
