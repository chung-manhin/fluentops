# FluentOps

[English](README.md)

全栈英语学习平台 —— Monorepo 工程化展示项目。

## 架构

```
┌─────────────┐    workspace:*    ┌──────────────────┐    workspace:*    ┌─────────────┐
│  apps/web   │ ◄──────────────── │ packages/shared  │ ────────────────► │ api-gateway │
│  Vue 3 SPA  │                   │  TypeScript 类型  │                   │   NestJS    │
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

| 设计决策 | 理由 |
|----------|------|
| Monorepo (pnpm + Turborepo) | 原子提交，`turbo ^build` 增量构建 |
| 共享类型包 | 前后端编译时类型契约 —— 类型漂移会直接破坏 CI |
| 双 Token JWT | 短期 Access Token (15分钟) + 轮换 Refresh Token (SHA-256 哈希存储) |
| LangGraph.js 管道 | 4 步 AI 工作流 + SSE 流式传输 + 序列号断线重连 |
| 积分计费 | Provider 接口 (`mock`/`alipay`) —— CI 用 mock，生产用支付宝沙箱 |
| Docker Compose | Postgres + Redis + MinIO —— 一条命令启动所有依赖 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3, Vite 5, Pinia, Vue Router, Axios, Element Plus, Tailwind CSS v4, GSAP |
| 后端 | NestJS, Prisma 5, JWT, Jest |
| 共享 | TypeScript `tsc` 构建 (类型 + 工具) |
| 基础设施 | Docker Compose, PostgreSQL, Redis, MinIO |
| CI | GitHub Actions — lint, typecheck, build, e2e |
| AI | LangGraph.js, OpenAI (CI 使用 mock provider) |

## 项目结构

```
apps/
  web/                  # Vue 3 SPA
  api-gateway/          # NestJS API (auth, media, ai, billing 模块)
packages/
  shared/               # 共享 TypeScript 类型 (@fluentops/shared)
infra/
  docker-compose.yml    # Postgres + Redis + MinIO
docs/
  api-reference.md      # 详细 curl 示例
  interview-notes.md    # 技术展示 & Q&A
.github/
  workflows/ci.yml
```

## 快速开始

```bash
corepack prepare pnpm@9.15.4 --activate
pnpm install
docker compose -f infra/docker-compose.yml up -d
cp apps/api-gateway/.env.example apps/api-gateway/.env  # 编辑密钥
cd apps/api-gateway && pnpm prisma migrate dev && cd ../..
pnpm dev
```

前端: http://localhost:5173 — API: http://localhost:3000

## 设计亮点

### 类型驱动契约

`packages/shared` 导出类型 (`AuthTokens`, `UserProfile`, `CreditBalance`, `PlanDto`, `HealthResponse`)，前后端共同引用。Turborepo 的 `^build` 依赖确保 shared 先于消费者编译。任何类型变更都会立即在 CI 中暴露不一致。

### 双 Token 认证

Access Token (15分钟) 为无状态 JWT。Refresh Token 每次使用后轮换 —— 旧 Token 被撤销，新 Token 以 SHA-256 哈希存储。前端 Axios 拦截器将并发 401 重试排队到单次 refresh 调用后面，避免竞态条件。

### AI Coach 管道

LangGraph.js 编排 4 步工作流：诊断 → 改写 → 练习 → 评分。结果通过 SSE 流式传输，带 `id:` 序列号支持断线重连 (`?since=N`)。设置 `AI_PROVIDER=mock` 可替换为确定性 mock LLM —— 完整管道可在 CI 中无需 API Key 运行。

### 积分计费

Provider 接口抽象支付：`mock` 用于 CI/开发 (即时完成)，`alipay` 用于沙箱测试 (异步回调通知)。AI 调用前有积分守卫检查余额。

## 安全

- CORS 锁定到 `CORS_ORIGIN` (默认 `localhost:5173`)，`credentials: true`
- Helmet 安全响应头
- 全局限流 (20 req/min)，登录/注册更严格 (5 req/min)
- Refresh Token 轮换为原子操作 (无 TOCTOU 竞态)
- 积分扣减和订单履行使用 Prisma 交互式事务 (防止双花)
- SSE 流验证评估所有权后才发送事件
- 上传文件名防路径穿越
- 支付宝回调验证签名和 `app_id`
- 错误事件返回通用消息 (不泄露堆栈信息)

详见 [docs/audit-report.md](docs/audit-report.md) 完整安全审计报告。

## API 概览

### 认证

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 → `{accessToken, refreshToken}` |
| POST | `/auth/refresh` | 轮换 Token |
| POST | `/auth/logout` | 撤销 Refresh Token |
| GET | `/me` | 当前用户信息 |

### 媒体

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/media/presign` | 获取预签名上传 URL |
| POST | `/media/complete` | 确认上传完成 |
| GET | `/media` | 录音列表 |
| GET | `/media/:id` | 详情 + 签名播放 URL |

### AI Coach

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/ai/assess` | 发起评估 (消耗 1 积分) |
| GET | `/ai/assess/:id` | 获取结果 |
| GET | `/ai/assess/:id/stream` | SSE 流 |
| GET | `/ai/assessments` | 历史列表 |

### 计费

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/billing/plans` | 积分套餐列表 |
| GET | `/billing/balance` | 当前余额 |
| POST | `/billing/order` | 创建订单 |
| POST | `/billing/mock/pay` | Mock 支付 (开发用) |

详见 [docs/api-reference.md](docs/api-reference.md) 获取完整 curl 示例。

## 常用命令

```bash
pnpm lint          # ESLint (全部包)
pnpm typecheck     # TypeScript 检查
pnpm test          # 单元测试
pnpm build         # 生产构建
pnpm dev           # 开发服务器 (web + api)

# API Gateway
cd apps/api-gateway
pnpm prisma migrate dev    # 运行迁移
pnpm prisma studio         # Prisma Studio
pnpm test:e2e              # E2E 测试 (需要数据库)
```

## 环境变量

详见 `apps/api-gateway/.env.example`。关键变量：

| 变量 | 描述 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `JWT_SECRET` / `REFRESH_SECRET` | Token 签名密钥 |
| `MINIO_*` | MinIO 连接 (endpoint, port, keys, bucket) |
| `AI_PROVIDER` | `mock` (默认) 或留空使用 OpenAI |
| `OPENAI_API_KEY` | 不使用 mock 时必填 |
| `BILLING_PROVIDER` | `mock` (默认) 或 `alipay` |

端口: Postgres 5432, Redis 6379, MinIO 9000/9001, API 3000, Web 5173
