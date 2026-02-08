# auth service (placeholder)

## 定位

认证与授权服务（用户注册/登录、token/会话、权限模型）。

## 未来责任边界（占位）

- 用户身份体系（邮箱/手机号/第三方登录）
- Token / Session 发行与校验
- RBAC / ABAC 等权限策略

## 接口/依赖（占位）

- 依赖：Postgres（用户表/权限表）、Redis（会话/黑名单）
- 对外：HTTP（REST）或 gRPC（待定）
