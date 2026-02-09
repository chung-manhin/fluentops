# Interview Notes

## 5-Minute Pitch

> I built FluentOps — a full-stack English learning platform — as a monorepo engineering showcase. The interesting part isn't the features themselves, but how the system is structured.

1. **Monorepo with type-driven contracts.** A shared TypeScript package (`@fluentops/shared`) defines the API types that both the NestJS backend and Vue 3 frontend import. Turborepo's `^build` dependency ensures shared types are always compiled before consumers typecheck. A type change in one place breaks the build immediately if either side drifts.

2. **Dual-token auth with silent refresh.** Access tokens are short-lived (15m), refresh tokens rotate on every use (stored as SHA-256 hashes). The frontend Axios interceptor queues concurrent requests during a refresh — no duplicate refresh calls, no race conditions.

3. **AI assessment pipeline.** LangGraph.js orchestrates a 4-step workflow (diagnose → rewrite → drills → score). Results stream to the frontend via SSE with sequence-based reconnection. A mock LLM provider makes the entire pipeline testable in CI without API keys.

4. **Credit billing with payment abstraction.** A provider interface (`mock` / `alipay`) lets CI tests run with mock payments while production uses Alipay sandbox. The credit gate is a simple guard that checks balance before AI calls.

5. **Infrastructure as code.** Docker Compose for Postgres + Redis + MinIO. Prisma for migrations. GitHub Actions CI runs lint, typecheck, build, and e2e tests on every push.

## Likely Follow-Up Questions

### Q1: Why a monorepo instead of separate repos?

- Single atomic commits across frontend + backend + shared types
- Turborepo handles incremental builds — only rebuilds what changed
- pnpm workspace protocol (`workspace:*`) ensures local packages resolve without publishing
- One CI pipeline validates the entire dependency chain
- Trade-off: repo size grows, but for a team < 10 this is net positive

### Q2: How does the shared types package prevent drift?

- `packages/shared` exports types like `AuthTokens`, `HealthResponse`, `PlanDto`
- Both apps declare it as a dependency via `workspace:*`
- `turbo.json` sets `typecheck` to depend on `^build` (shared must compile first)
- If I change a type in shared, both apps fail typecheck until updated
- This is a compile-time contract — no runtime validation overhead

### Q3: How does the token refresh work without race conditions?

- On 401, the interceptor sets `isRefreshing = true` and calls `/auth/refresh`
- Concurrent requests that also get 401 are pushed into a queue (Promise-based)
- When refresh completes, all queued requests are replayed with the new token
- If refresh itself fails, queue is rejected and user is redirected to login
- Refresh tokens rotate: each use invalidates the old token (stored as SHA-256 hash)

### Q4: How did you make the AI pipeline testable?

- `AI_PROVIDER=mock` swaps the LLM with a deterministic mock that returns fixed results
- The LangGraph workflow doesn't know or care — it calls the same interface
- SSE streaming works identically with mock data
- E2e tests seed credits, run an assessment, and verify the SSE event sequence
- No OpenAI API key needed in CI

### Q5: What would you change for production scale?

- Extract AI processing into a background worker (Bull/BullMQ) — currently synchronous in the request
- Add rate limiting on auth endpoints (already have credit gating on AI)
- Move to S3 from MinIO (same API, just config change)
- Add OpenTelemetry tracing — the LangGraph steps are natural span boundaries
- Consider splitting the API gateway if team grows (the NestJS module structure already maps to service boundaries)
