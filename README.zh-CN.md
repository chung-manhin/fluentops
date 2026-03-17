# FluentOps

[English](README.md)

全栈英语学习平台 —— 面向真实使用场景的 Monorepo 项目。

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
| 前端 | Vue 3、TypeScript、Vite 5、Pinia、Vue Router、Axios、Element Plus、Tailwind CSS v4、GSAP、原生 WebSocket、SSE 回退 |
| 后端 | NestJS、Prisma 5、JWT、WebSocket Gateway、Redis 缓存、定时维护任务、Jest |
| 共享 | TypeScript `tsc` 构建 (类型 + 工具) |
| 基础设施 | Docker Compose, PostgreSQL, Redis, MinIO |
| CI | GitHub Actions — lint, typecheck, build, e2e |
| AI | LangChain.js、LangGraph.js、OpenAI（CI 使用 mock provider） |
| 可视化 | Three.js 3D 视觉、Canvas 海报导出、WebAssembly 音频辅助 |
| 通知 | 邮件摘要服务（`mock` 或 Resend HTTP API） |

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

## 核心用户流程

- 注册 -> 登录 -> 刷新 -> 退出
- 受保护页面自动恢复当前用户状态
- 通过 WebRTC 媒体采集录音 -> 上传到 MinIO -> 回放录音
- 提交文本 -> 优先通过 WebSocket 查看 AI 评测进度，失败时回退到 SSE -> 回看历史结果
- 查询积分 -> 创建订单 -> mock 支付 -> 评测消耗积分
- 将完成的评测结果发送邮件摘要，并导出分享海报
- 关键页面都包含空状态、加载状态和失败兜底

## 快速开始

前置要求：

- Node.js 20.x
- 已启用 Corepack
- Docker Desktop（用于 Postgres、Redis、MinIO）

```bash
corepack prepare pnpm@9.15.4 --activate
pnpm install
docker compose -f infra/docker-compose.yml up -d
```

复制 API 环境变量文件：

```bash
cp apps/api-gateway/.env.example apps/api-gateway/.env
```

PowerShell:

```powershell
Copy-Item apps/api-gateway/.env.example apps/api-gateway/.env
```

执行迁移并启动：

```bash
cd apps/api-gateway && pnpm prisma migrate dev && cd ../..
pnpm dev
```

前端: http://localhost:5173 — API: http://localhost:3000

根级命令（`pnpm dev`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`）已改为跨平台脚本，PowerShell 和 bash 都可以直接运行。

## 设计亮点

### 类型驱动契约

`packages/shared` 导出类型 (`AuthTokens`, `UserProfile`, `CreditBalance`, `PlanDto`, `HealthResponse`)，前后端共同引用。Turborepo 的 `^build` 依赖确保 shared 先于消费者编译。任何类型变更都会立即在 CI 中暴露不一致。

### 双 Token 认证

Access Token (15分钟) 为无状态 JWT。Refresh Token 每次使用后轮换 —— 旧 Token 被撤销，新 Token 以 SHA-256 哈希存储。前端 Axios 拦截器将并发 401 重试排队到单次 refresh 调用后面，避免竞态条件。

### AI Coach 管道

LangGraph.js 编排 4 步工作流：诊断 → 改写 → 练习 → 评分。结果现在会优先通过带 JWT 的 WebSocket Gateway 传输，异常时回退到带 `id:` 序列号的 SSE，支持断线重连 (`?since=N`)。设置 `AI_PROVIDER=mock` 可替换为确定性 mock LLM —— 完整管道可在 CI 中无需 API Key 运行。

### 积分计费

Provider 接口抽象支付：`mock` 用于 CI/开发 (即时完成)，`alipay` 用于沙箱测试 (异步回调通知)。AI 调用前有积分守卫检查余额。

### 实时、缓存与自动化

Redis 作为可选缓存层，用于套餐查询缓存，并在 `/health` 中暴露为 `up`、`down` 或 `disabled`。定时任务会清理过期 refresh token，并取消长时间未支付的订单。已完成评测还可以通过通知接口发送邮件摘要。

## 本轮重点加固

- 根层 Turborepo 脚本改为跨平台，Windows PowerShell 可直接运行
- 本地 e2e 默认改为内存 Prisma 测试适配器，CI 继续保留真实 PostgreSQL 覆盖
- AI 工作流改为先原子预扣积分，失败后幂等退款，避免并发下先跑 AI 再扣费
- 媒体上传完成前会校验对象确实存在，避免写入“幽灵录音”
- 评测详情接口补回历史结果里的 drills / rewrites / issues
- Redis 套餐缓存，且在未配置 `REDIS_URL` 时自动优雅降级
- 新增 WebSocket 评测实时流，前端使用单例 realtime composable 并自动回退 SSE
- 新增 Three.js + GSAP 视觉层、评测海报导出、轻量 WebAssembly 音频辅助
- 新增 mock / Resend 邮件摘要发送能力
- 新增 refresh token / 过期订单定时清理任务
- 全局限流守卫改为初始化安全实现，避免启动阶段偶发认证 500
- 前端注册密码提示和路由鉴权恢复逻辑更贴近真实产品体验
- 通过直接升级和 `pnpm.overrides` 降低依赖安全风险

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
pnpm audit         # 依赖审计（当前已压到 low/moderate）

# API Gateway
cd apps/api-gateway
pnpm prisma migrate dev    # 运行迁移
pnpm prisma studio         # Prisma Studio
pnpm test:e2e              # E2E 测试（本地默认走内存模式）
E2E_USE_REAL_DB=true pnpm test:e2e   # 显式切到真实 PostgreSQL 流程
```

## 环境变量

详见 `apps/api-gateway/.env.example`。关键变量：

| 变量 | 描述 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `JWT_SECRET` / `REFRESH_SECRET` | Token 签名密钥 |
| `MINIO_*` | MinIO 连接 (endpoint, port, keys, bucket) |
| `REDIS_URL` | 可选 Redis 连接串，用于缓存与健康检查 |
| `AI_PROVIDER` | `mock` (默认) 或留空使用 OpenAI |
| `OPENAI_API_KEY` | 不使用 mock 时必填 |
| `BILLING_PROVIDER` | `mock` (默认) 或 `alipay` |
| `EMAIL_PROVIDER` | `mock`（默认）或 `resend` |
| `EMAIL_FROM` / `RESEND_API_KEY` | 可选邮件摘要发送配置 |

端口: Postgres 5432, Redis 6379, MinIO 9000/9001, API 3000, Web 5173

## 排障

- 没有 `docker` 命令：请安装 Docker Desktop，或在 `apps/api-gateway/.env` 中改为你自己的 Postgres / Redis / MinIO。
- `pnpm dev` 提示 Node 版本告警：仓库约定 Node 20.x。Node 22 本地可能能跑，但 CI 和项目约束仍以 Node 20 为准。
- `pnpm test:e2e` 现在本地默认走内存 Prisma 适配器，因此不依赖 Docker。若要验证真实数据库链路，请先启动 Postgres，再执行 `E2E_USE_REAL_DB=true pnpm --filter api-gateway test:e2e`。
