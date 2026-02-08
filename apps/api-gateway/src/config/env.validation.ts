import { plainToInstance } from 'class-transformer';
import { IsString, validateSync } from 'class-validator';

class EnvVars {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  REFRESH_SECRET: string;

  @IsString()
  ACCESS_TOKEN_TTL: string = '15m';

  @IsString()
  REFRESH_TOKEN_TTL: string = '7d';
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
  return validated;
}
