# NestJS Creator 认证与上传学习资源

## Knowledge

- [NestJS 官方文档：Authentication](https://docs.nestjs.com/security/authentication)
  JWT 签发、Bearer Token、认证 Guard 和全局认证的官方起点。
- [NestJS 官方文档：Middleware](https://docs.nestjs.com/middleware)
  Middleware 的职责、注册方式和路由范围。
- [NestJS 官方文档：Request lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
  用于核对 Middleware、Guard、Interceptor、Pipe 和 Filter 的执行顺序。
- [NestJS 官方文档：File upload](https://docs.nestjs.com/techniques/file-upload)
  `FileInterceptor`、Multer 和 `@UploadedFile()` 的官方使用方式。
- [NestJS 官方文档：Lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events)
  Module/Provider 初始化和关闭生命周期。
- `apps/server/src/module/creator/auth/`
  当前项目 Creator 登录、JWT 签发和密码处理的真实实现。
- `apps/server/src/module/creator/common/guards/creator-jwt.guard.ts`
  JWT、Redis Session 和数据库账号状态的三段式鉴权。
- `apps/server/src/module/creator/storage/`
  本地图片、JSON 暂存和可替换存储 Provider 的真实实现。
- `apps/server/src/module/creator/works/services/creator-work-upload.service.ts`
  受限 OSS STS 上传凭证的业务约束。
- `apps/server/src/main.ts` 与 `apps/server/src/app.module.ts`
  当前项目 HTTP Middleware、全局 Guard、Interceptor、Pipe 和 Filter 的装配位置。

## Wisdom (Communities)

- [NestJS GitHub Discussions](https://github.com/nestjs/nest/discussions)
  用于验证框架边界、设计取舍和真实项目中的集成问题。
