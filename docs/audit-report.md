# FluentOps Security & Engineering Audit

Date: 2026-02-09

## A. Health Check

| Check | Status |
|-------|--------|
| `pnpm install` | Pass |
| `pnpm turbo build` | Pass (3 packages) |
| `pnpm turbo lint` | Pass |
| `pnpm turbo typecheck` | Pass |
| `pnpm turbo test` | Pass |
| `pnpm turbo test:e2e` | Pass (requires DB) |

## B. Engineering Checklist

| Item | Status |
|------|--------|
| Monorepo builds atomically | Yes — Turborepo `^build` dependency chain |
| Shared types compile-time contract | Yes — `@fluentops/shared` |
| CI runs lint + typecheck + build + e2e | Yes — GitHub Actions |
| CI dependency audit | Added (`pnpm audit --audit-level=high`, advisory) |
| `.gitignore` covers secrets/dumps | Yes — `*.pem`, `*.key`, `*.cert`, `*.p12`, `*.pfx`, `*.sql`, `*.dump`, `.env.*` |
| Environment validation | Yes — `class-validator` in `env.validation.ts` |

## C. Secrets Scan

| Finding | Severity | Status |
|---------|----------|--------|
| Default MinIO creds in `env.validation.ts` | Low | Acceptable for dev defaults; production must override via env |
| `REFRESH_SECRET` required but unused | Low | Kept for future use (httpOnly cookie signing) |
| No secrets committed to git history | Pass | Verified via grep |

## D. Security Review

### CRITICAL — Fixed

1. **SSE stream user isolation**: `streamEvents()` now verifies `{ id, userId }` before streaming events. Unauthenticated assessment access returns empty observable.

2. **CORS lockdown**: `app.enableCors()` replaced with explicit `origin: CORS_ORIGIN` (default `http://localhost:5173`), `credentials: true`.

### HIGH — Fixed

3. **Helmet security headers**: `helmet()` middleware added to `main.ts`.

4. **Rate limiting**: Global `ThrottlerGuard` (20 req/min), stricter on `login`/`register` (5 req/min).

5. **Refresh token TOCTOU**: Replaced `findFirst` + `update` with atomic `updateMany` (revoke-or-fail). Concurrent refresh attempts get 401.

6. **fulfillOrder race**: Moved idempotency check inside interactive `$transaction`. Concurrent Alipay notifies cannot double-credit.

7. **deductCredit TOCTOU**: Interactive `$transaction` with balance check inside the transaction. Concurrent `/ai/assess` cannot bypass credit gate.

8. **Path traversal via filename**: `dto.filename` sanitized to `[a-zA-Z0-9._-]`, max 100 chars.

### MEDIUM — Fixed

9. **Alipay app_id verification**: `handleAlipayNotify()` now checks `params.app_id === ALIPAY_APP_ID` after signature verification.

10. **Error event sanitization**: Error SSE events now emit `{ message: 'Assessment failed' }` instead of raw error strings.

11. **`.gitignore` hardening**: Added `*.key`, `*.cert`, `*.p12`, `*.pfx`, `*.sql`, `*.dump`, `.env.*` (with `!.env.example`).

12. **CI dependency audit**: Added `pnpm audit --audit-level=high || true` step.

### LOW — Documented (acceptable risk or future work)

13. Default MinIO creds in source — dev convenience, overridden in production.
14. `REFRESH_SECRET` required but unused — reserved for future httpOnly cookie signing.
15. `localStorage` token storage — documented known risk; httpOnly cookie migration planned.
16. Docker Compose: no health checks on Redis/MinIO, unauthenticated Redis — dev-only infra.
17. `pnpm audit`: 2 HIGH transitive vulns (glob via @nestjs/cli, fast-xml-parser via minio) — devDependency / no direct exploit path.

## E. Pre-Launch Checklist

| # | Item | Status |
|---|------|--------|
| 1 | SSE user isolation | Done |
| 2 | CORS origin lockdown | Done |
| 3 | Helmet security headers | Done |
| 4 | Rate limiting on auth | Done |
| 5 | Refresh token atomic rotation | Done |
| 6 | fulfillOrder atomic idempotency | Done |
| 7 | Atomic credit deduction | Done |
| 8 | Filename sanitization | Done |
| 9 | Alipay app_id verification | Done |
| 10 | Error message sanitization | Done |
| 11 | CI dependency audit | Done |
| 12 | Gitignore hardening | Done |
| 13 | httpOnly cookie for refresh token | Future — requires frontend refactor |
| 14 | SECURITY.md with disclosure policy | Future — repo governance decision |
| 15 | LICENSE file | Future — repo governance decision |
| 16 | Redis authentication in docker-compose | Future — infra hardening |
| 17 | Production Dockerfile with multi-stage build | Future — deployment |
| 18 | Pin GitHub Actions to SHA | Future — supply chain |
| 19 | Upgrade transitive deps (glob, fast-xml-parser) | Future — pnpm overrides |
| 20 | Password strength validation beyond 6-char min | Future — UX decision |
