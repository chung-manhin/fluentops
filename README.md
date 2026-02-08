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
- API Gateway: NestJS + Jest
- Shared: TypeScript `tsc` build (outputs `dist` + `d.ts`)
- Infra: Docker Compose (Postgres + Redis + MinIO)

## Repository layout

```
apps/
  web/
  api-gateway/
packages/
  shared/
services/
  auth/
  ai-coach/
  media/
  realtime/
  billing/
  worker/
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

### 2) Start infra (optional)

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3) Run dev

```bash
corepack pnpm dev
```

- Web: Vite dev server (URL printed in terminal)
- API: `curl http://localhost:3000/health` -> `{ "ok": true }`

## Commands

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## FAQ

- Ports:
  - Postgres: 5432
  - Redis: 6379
  - MinIO: 9000 (API) / 9001 (Console)
  - API Gateway: 3000
- Env:
  - See `.env.example` (aligned with `infra/docker-compose.yml`).
