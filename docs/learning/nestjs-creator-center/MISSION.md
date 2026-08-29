# Mission: 从零掌握 NestJS Creator 认证与上传

## Why

能够以当前 PC Creator Center 为真实样板，独立设计和实现一套 NestJS 身份认证、请求鉴权和安全上传能力，而不是只能复制已有代码。

## Success looks like

- 能用自己的话解释一次请求从 Middleware 到 Controller 的完整生命周期。
- 能独立实现 JWT + Redis Session 的登录、鉴权和退出登录闭环。
- 能判断需求应使用 Middleware、Guard、Pipe 还是 Interceptor。
- 能实现受 Creator 身份保护的本地图片、JSON 和 OSS 直传接口。
- 能指出当前实现的安全边界、取舍和常见失败方式。

## Constraints

- 从 NestJS 初学者视角开始，术语必须先用白话解释再映射到代码。
- 所有核心讲解以当前仓库代码和 NestJS 官方文档为准。
- 使用费曼学习法：解释、复述、暴露缺口、再次简化。

## Out of scope

- 暂不展开 OAuth2、OpenID Connect、复杂 RBAC/ABAC 和微服务认证。
- 暂不修改生产代码或真实密钥配置。
