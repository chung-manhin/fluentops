# FluentOps Monorepo

This is an enterprise-grade monorepo skeleton for **FluentOps**, an English learning platform.

Planned capabilities include:
- WebRTC recording
- AI correction / feedback streaming (SSE)
- Realtime notifications (WebSocket)
- Subscription billing
- Media storage based on MinIO (S3 compatible)

## Tech stack

- Monorepo: pnpm workspace + Turborepo
- Node.js: 20
- Web: Vue 3 + TypeScript + Vite + Pinia + Vue Router + Axios + Element Plus + TailwindCSS + GSAP
- API Gateway: NestJS + Prisma + JWT + Jest
- Database: PostgreSQL
- Shared: TypeScript `tsc` build (outputs `dist` + `d.ts`)
- Infra: Docker Compose (Postgres + Redis + MinIO)

## Repository layout

```
apps/
  web/                  # Vue3 frontend
  api-gateway/          # NestJS backend with auth
packages/
  shared/               # Shared types/utils
services/
  auth/                 # (placeholder)
  ai-coach/             # (placeholder)
  media/                # (placeholder)
  realtime/             # (placeholder)
  billing/              # (placeholder)
  worker/               # (placeholder)
infra/
  docker-compose.yml
.github/
  workflows/ci.yml
```

## Getting started

### 1) Install dependencies

```bash
corepack prepare pnpm@9.15.4 --activate
corepack pnpm install
```

### 2) Start infra

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3) Setup environment

```bash
cp .env.example .env
# Edit .env with your secrets
```

### 4) Setup database

```bash
cd apps/api-gateway
corepack pnpm prisma migrate dev
```

### 5) Run dev

```bash
corepack pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000

## Auth Module

The API Gateway includes a complete authentication system with dual-token (access + refresh) flow.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns tokens |
| POST | `/auth/refresh` | Refresh tokens (rotation) |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/me` | Get current user (requires Bearer token) |

### curl Examples

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
# Returns: {"accessToken":"...","refreshToken":"..."}

# Get current user
curl http://localhost:3000/me \
  -H "Authorization: Bearer <accessToken>"

# Refresh tokens
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

# Logout
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

### Frontend Auth Flow

The web app implements seamless token refresh:
- Access token attached to all requests via Axios interceptor
- On 401, automatically refreshes tokens and retries request
- Concurrent requests queue during refresh (single refresh call)
- On refresh failure, redirects to login

### Security Features

- Passwords hashed with bcrypt
- Refresh tokens stored as SHA-256 hash in database
- Token rotation on refresh (old token revoked)
- Logout revokes refresh token

## Recording Module

Audio recording pipeline: WebRTC MediaRecorder → presigned MinIO upload → Postgres metadata → list/playback.

### Endpoints (all require Bearer token)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/media/presign` | Get presigned upload URL |
| POST | `/media/complete` | Confirm upload, write metadata to DB |
| GET | `/media` | List current user's recordings |
| GET | `/media/:id` | Recording detail with signed play URL |

### curl Examples

```bash
TOKEN="<accessToken>"

# Presign upload
curl -X POST http://localhost:3000/media/presign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.webm","contentType":"audio/webm"}'
# Returns: {"uploadUrl":"...","objectKey":"...","fileUrl":"..."}

# Upload file to presigned URL
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: audio/webm" \
  --data-binary @test.webm

# Complete upload
curl -X POST http://localhost:3000/media/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"objectKey":"<objectKey>","sizeBytes":12345,"mimeType":"audio/webm","durationMs":5000}'
# Returns: {"id":"...","url":"...","createdAt":"..."}

# List recordings
curl http://localhost:3000/media \
  -H "Authorization: Bearer $TOKEN"

# Get recording detail (with signed play URL)
curl http://localhost:3000/media/<id> \
  -H "Authorization: Bearer $TOKEN"
```

### Security

- contentType whitelist: `audio/webm`, `audio/wav`, `audio/mpeg`
- objectKey prefixed with userId for isolation
- Users can only access their own recordings

## AI Coach Module

AI-powered English assessment: LangGraph 4-step workflow (diagnose → rewrite → drills → score) with SSE streaming.

Requires credits — each assessment costs 1 credit. Buy credits via the Billing module first.

When `AI_PROVIDER=mock` or `OPENAI_API_KEY` is empty, the workflow uses a built-in mock LLM that returns deterministic results — safe for CI and local dev without an API key.

### Endpoints (all require Bearer token)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/assess` | Start assessment (returns assessmentId + SSE URL) |
| GET | `/ai/assess/:id` | Get assessment result |
| GET | `/ai/assess/:id/stream` | SSE stream of progress/final events |
| GET | `/ai/assessments` | List recent assessments (newest first) |

SSE reconnection: pass `?since=<lastSeq>` to resume from a specific event sequence number. Each SSE event includes an `id:` field with the seq number.

### curl Examples

```bash
TOKEN="<accessToken>"

# Start assessment
curl -X POST http://localhost:3000/ai/assess \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputType":"text","text":"I go to school yesterday and buyed a book"}'
# Returns: {"assessmentId":"...","traceId":"...","sseUrl":"/ai/assess/.../stream"}

# Get result
curl http://localhost:3000/ai/assess/<assessmentId> \
  -H "Authorization: Bearer $TOKEN"

# SSE stream
curl -N http://localhost:3000/ai/assess/<assessmentId>/stream \
  -H "Authorization: Bearer $TOKEN"

# SSE reconnect from seq 3
curl -N "http://localhost:3000/ai/assess/<assessmentId>/stream?since=3" \
  -H "Authorization: Bearer $TOKEN"

# List recent assessments
curl http://localhost:3000/ai/assessments \
  -H "Authorization: Bearer $TOKEN"
```

### SSE Event Format

```
event: progress
data: {"stage":"diagnose","pct":5}
id: 0

event: progress
data: {"stage":"diagnose","pct":25}
id: 1

event: final
data: {"rubric":{"grammar":40,...},"issues":[...],"rewrites":[...],"drills":[...],"feedbackMarkdown":"..."}
id: 8

event: error
data: {"message":"..."}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PROVIDER` | No | — | Set to `mock` to use deterministic mock LLM |
| `OPENAI_API_KEY` | No | — | OpenAI API key (mock used if empty) |
| `MODEL_NAME` | No | `gpt-4o-mini` | OpenAI model name |
| `AI_TEMPERATURE` | No | `0.7` | LLM temperature |

## Billing Module

Credit-based billing: users buy credit packs (mock payment for CI/dev, Alipay sandbox for production). Each AI assessment costs 1 credit.

### Endpoints (all require Bearer token)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/plans` | List available credit packs |
| GET | `/billing/balance` | Get current credit balance |
| POST | `/billing/order` | Create a purchase order |
| POST | `/billing/mock/pay` | Pay order via mock provider (dev/CI only) |

### curl Examples

```bash
TOKEN="<accessToken>"

# List plans
curl http://localhost:3000/billing/plans \
  -H "Authorization: Bearer $TOKEN"

# Check balance
curl http://localhost:3000/billing/balance \
  -H "Authorization: Bearer $TOKEN"

# Create order
curl -X POST http://localhost:3000/billing/order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId":"<planId>"}'

# Mock pay
curl -X POST http://localhost:3000/billing/mock/pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<orderId>"}'
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BILLING_PROVIDER` | No | `mock` | Payment provider (`mock` or `alipay`) |

## Commands

```bash
corepack pnpm lint       # ESLint
corepack pnpm typecheck  # TypeScript check
corepack pnpm test       # Unit tests
corepack pnpm build      # Production build

# API Gateway specific
cd apps/api-gateway
corepack pnpm prisma migrate dev   # Run migrations
corepack pnpm prisma studio        # Open Prisma Studio
corepack pnpm test:e2e             # E2E tests (requires DB)
```

## Environment Variables

See `.env.example` for all required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for access tokens |
| `REFRESH_SECRET` | Secret for refresh tokens |
| `ACCESS_TOKEN_TTL` | Access token TTL (e.g., `15m`) |
| `REFRESH_TOKEN_TTL` | Refresh token TTL (e.g., `7d`) |
| `MINIO_ENDPOINT` | MinIO host (e.g., `localhost`) |
| `MINIO_PORT` | MinIO API port (e.g., `9000`) |
| `MINIO_ACCESS_KEY` | MinIO access key |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `MINIO_BUCKET` | MinIO bucket name |
| `MINIO_PUBLIC_URL` | Public URL for file access (optional) |

## FAQ

- **Ports:**
  - Postgres: 5432
  - Redis: 6379
  - MinIO: 9000 (API) / 9001 (Console)
  - API Gateway: 3000
  - Web Dev Server: 5173

- **Missing env vars:** API will fail to start with clear error message listing missing variables.

- **Node version:** Requires Node 20. Use `nvm use 20` or similar.

- **pnpm not found:** Run `corepack prepare pnpm@9.15.4 --activate` first.
