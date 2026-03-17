process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://fluentops:fluentops@localhost:5432/fluentops_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || 'test-refresh-secret';
process.env.ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
process.env.REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
process.env.MINIO_PORT = process.env.MINIO_PORT || '9000';
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minio';
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minio123456';
process.env.MINIO_BUCKET = process.env.MINIO_BUCKET || 'fluentops-test';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
process.env.MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o-mini';
process.env.AI_TEMPERATURE = process.env.AI_TEMPERATURE || '0.7';
process.env.BILLING_PROVIDER = process.env.BILLING_PROVIDER || 'mock';
process.env.E2E_USE_REAL_DB = process.env.E2E_USE_REAL_DB || 'false';
