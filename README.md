# FluentOps

[中文文档](README.zh-CN.md)

Full-stack English learning platform — monorepo engineering showcase.

## Architecture

```
┌─────────────┐    workspace:*    ┌──────────────────┐    workspace:*    ┌─────────────┐
│  apps/web   │ ◄──────────────── │ packages/shared  │ ────────────────► │ api-gateway │
│  Vue 3 SPA  │                   │  TypeScript types │                   │   NestJS    │
└──────┬──────┘                   └──────────────────┘                   └──────┬──────┘
       │                                                                        │
       │ Axios + JWT                                              Prisma + JWT  │
       │                                                                        │
       └──────────────────────── REST / SSE ────────────────────────────────────┘
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                       Postgres    Redis      MinIO
```

| Decision | Rationale |
|----------|-----------|
| Monorepo (pnpm + Turborepo) | Single atomic commits, incremental builds via `turbo ^build` |
| Shared types package | Compile-time contract between frontend and backend — type drift breaks CI |
| Dual-token JWT | Short-lived access (15m) + rotating refresh tokens (SHA-256 hashed) |
| LangGraph.js pipeline | 4-step AI workflow with SSE streaming and sequence-based reconnection |
| Credit billing | Provider interface (`mock`/`alipay`) — CI-safe mock, production Alipay sandbox |
| Docker Compose infra | Postgres + Redis + MinIO — one command to spin up all dependencies |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vite 5, Pinia, Vue Router, Axios, Element Plus, Tailwind CSS v4, GSAP |
| Backend | NestJS, Prisma 5, JWT, Jest |
| Shared | TypeScript `tsc` build (types + utils) |
| Infra | Docker Compose, PostgreSQL, Redis, MinIO |
| CI | GitHub Actions — lint, typecheck, build, e2e |
| AI | LangGraph.js, OpenAI (with mock provider for CI) |

## Repository Layout

```
apps/
  web/                  # Vue 3 SPA
  api-gateway/          # NestJS API (auth, media, ai, billing modules)
packages/
  shared/               # Shared TypeScript types (@fluentops/shared)
infra/
  docker-compose.yml    # Postgres + Redis + MinIO
docs/
  api-reference.md      # Detailed curl examples
  interview-notes.md    # Technical pitch & Q&A
.github/
  workflows/ci.yml
```

## Quick Start

```bash
corepack prepare pnpm@9.15.4 --activate
pnpm install
docker compose -f infra/docker-compose.yml up -d
cp apps/api-gateway/.env.example apps/api-gateway/.env  # edit secrets
cd apps/api-gateway && pnpm prisma migrate dev && cd ../..
pnpm dev
```

Web: http://localhost:5173 — API: http://localhost:3000

## Design Highlights

### Type-Driven Contract

`packages/shared` exports types (`AuthTokens`, `UserProfile`, `CreditBalance`, `PlanDto`, `HealthResponse`) imported by both apps. Turborepo's `^build` dependency ensures shared compiles before consumers typecheck. A type change in shared breaks the build immediately if either side drifts.

### Dual-Token Auth

Access tokens (15m) are stateless JWTs. Refresh tokens rotate on every use — the old token is revoked and the new one stored as a SHA-256 hash. The frontend Axios interceptor queues concurrent 401 retries behind a single refresh call, preventing race conditions.

### AI Coach Pipeline

LangGraph.js orchestrates a 4-step workflow: diagnose → rewrite → drills → score. Results stream via SSE with `id:` sequence numbers for reconnection (`?since=N`). Setting `AI_PROVIDER=mock` swaps in a deterministic mock LLM — the full pipeline runs in CI without API keys.

### Credit Billing

A provider interface abstracts payment: `mock` for CI/dev (instant fulfillment), `alipay` for sandbox testing (async notify callback). A credit guard checks balance before AI calls.

## Security

- CORS locked to `CORS_ORIGIN` (default `localhost:5173`), `credentials: true`
- Helmet security headers on all responses
- Global rate limiting (20 req/min), stricter on login/register (5 req/min)
- Refresh token rotation is atomic (no TOCTOU race on concurrent refresh)
- Credit deduction and order fulfillment use interactive Prisma transactions (no double-spend)
- SSE streams verify assessment ownership before emitting events
- Upload filenames sanitized against path traversal
- Alipay notify verifies both signature and `app_id`
- Error events return generic messages (no stack trace leaks)

See [docs/audit-report.md](docs/audit-report.md) for the full security audit.

## API Overview

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login → `{accessToken, refreshToken}` |
| POST | `/auth/refresh` | Rotate tokens |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/me` | Current user profile |

### Media

| Method | Path | Description |
|--------|------|-------------|
| POST | `/media/presign` | Presigned upload URL |
| POST | `/media/complete` | Confirm upload |
| GET | `/media` | List recordings |
| GET | `/media/:id` | Detail + signed play URL |

### AI Coach

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/assess` | Start assessment (costs 1 credit) |
| GET | `/ai/assess/:id` | Get result |
| GET | `/ai/assess/:id/stream` | SSE stream |
| GET | `/ai/assessments` | List recent |

### Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/plans` | List credit packs |
| GET | `/billing/balance` | Current balance |
| POST | `/billing/order` | Create order |
| POST | `/billing/mock/pay` | Mock payment (dev) |

See [docs/api-reference.md](docs/api-reference.md) for detailed curl examples.

## Commands

```bash
pnpm lint          # ESLint (all packages)
pnpm typecheck     # TypeScript check
pnpm test          # Unit tests
pnpm build         # Production build
pnpm dev           # Dev servers (web + api)

# API Gateway
cd apps/api-gateway
pnpm prisma migrate dev    # Run migrations
pnpm prisma studio         # Prisma Studio
pnpm test:e2e              # E2E tests (requires DB)
```

## Environment Variables

See `apps/api-gateway/.env.example` for all variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` / `REFRESH_SECRET` | Token signing secrets |
| `MINIO_*` | MinIO connection (endpoint, port, keys, bucket) |
| `AI_PROVIDER` | `mock` (default) or omit for OpenAI |
| `OPENAI_API_KEY` | Required when not using mock |
| `BILLING_PROVIDER` | `mock` (default) or `alipay` |

Ports: Postgres 5432, Redis 6379, MinIO 9000/9001, API 3000, Web 5173
