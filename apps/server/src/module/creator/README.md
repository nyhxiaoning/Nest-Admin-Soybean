# PC Creator Center 模块分层

`creator` 是独立于后台管理端的业务域。后续新增作品、团队、发布等模块时，继续在本目录增加同级业务模块，不复用 `SysUser`、租户、角色或菜单认证。

```text
creator/
├── auth/                 # 登录业务模块
│   ├── controllers/      # HTTP 接口
│   ├── services/         # 认证业务逻辑
│   ├── dto/              # 请求与响应契约
│   └── creator-auth.module.ts
├── common/               # Creator 各业务模块共享层
│   ├── constants/        # JWT 标记、Redis Key、TTL
│   ├── decorators/       # 当前 Creator 用户参数装饰器
│   ├── guards/           # Creator JWT Guard
│   ├── interfaces/       # Creator Session 类型
│   └── index.ts          # 公共导出入口
├── storage/              # PC Creator Center 可复用存储能力
│   ├── controllers/      # Creator 本地暂存上传接口
│   ├── dto/              # 上传响应契约
│   ├── interfaces/       # 可替换存储与上传凭证契约
│   ├── services/         # 本地暂存、过期清理、阿里云 OSS STS
│   └── creator-storage.module.ts
├── works/                # PC Creator Center 作品业务模块
│   ├── controllers/      # 作品、标签、发布和上传凭证接口
│   ├── dto/              # 请求与响应契约
│   ├── repositories/     # Prisma 数据访问与事务
│   ├── services/         # CRUD、发布状态机、上传凭证
│   └── creator-works.module.ts
└── creator.module.ts     # Creator 业务域入口
```

新增 Creator 受保护接口时：

1. 所属模块导入 `CreatorAuthModule`。
2. Controller 使用 `@NotRequireAuth()` 跳过后台全局 JWT 流程，并使用 `@IgnoreTenant()`。
3. 具体受保护接口添加 `@UseGuards(CreatorJwtGuard)`。
4. 使用 `@CreatorUser()` 获取 `CreatorSession`。

共享能力统一从 `../common` 导入，业务模块之间不要互相引用 Service。

## 作品模块修改位置

- Prisma 模型：`apps/server/prisma/schema.prisma`
- 数据库迁移：`apps/server/prisma/migrations/202608200001_add_creator_works/migration.sql`
- 基础标签 Seed：`apps/server/prisma/seed.ts`
- 模块装配：`apps/server/src/module/creator/creator.module.ts`
- 作品业务：`apps/server/src/module/creator/works/`
- 可复用 STS 存储能力：`apps/server/src/module/creator/storage/`
- STS 配置：`apps/server/src/config/types/creator-storage.config.ts`
- 环境变量校验：`apps/server/src/config/env.validation.ts`
- 环境变量示例：`apps/server/.env.example`
- PC 前端契约：`apps/pc-creator-center/src/api/works.ts`
- PC 前端请求适配：`apps/pc-creator-center/src/http/request.ts`
- PC 前端 OSS 客户端：`apps/pc-creator-center/src/lib/images/AliOSS.ts`

## 作品 API

以下接口都需要 PC Creator Center JWT，但不校验后台角色、菜单权限或租户：

```text
GET    /api/creator/works
POST   /api/creator/works
GET    /api/creator/works/:id
PUT    /api/creator/works/:id
DELETE /api/creator/works/:id
GET    /api/creator/work-tags
POST   /api/creator/works/upload-token
POST   /api/creator/uploads/images
POST   /api/creator/uploads/json
GET    /api/creator/works/releases
GET    /api/creator/works/release-candidates
POST   /api/creator/works/:id/submit
POST   /api/creator/works/:id/submit-update
POST   /api/creator/works/:id/withdraw
POST   /api/creator/works/:id/unpublish
DELETE /api/creator/works/releases/:id
```

线上发布 Prisma 变更时，先在发布包中生成 Client，再执行已提交的迁移；不要在线上运行 `migrate dev`：

```bash
pnpm --dir apps/server prisma:generate
pnpm --dir apps/server prisma:deploy
pnpm --dir apps/server prisma:seed:only
```

`prisma:seed` 脚本包含强制重建数据库，只用于可丢弃数据的本地环境，不得用于线上。

## Creator 图片暂存

`POST /api/creator/uploads/images` 接收 `multipart/form-data` 的 `file` 字段，需要 Creator Bearer Token。接受所有 `image/*` MIME，单文件最大 10 MiB，默认暂存 7 天。

本地路径：

```text
{FILE_UPLOAD_LOCATION}/creator/{creatorId}/images/{yyyy/MM/dd}/{uuid}.{ext}
```

成功响应数据包含 `fileId`、`url`、`originalName`、`contentType`、`size` 和 `expiresAt`。存储实现通过 `CreatorImageStorage` 注入；未来可将 `LocalCreatorImageStorage` 替换为 OSS Provider，不需要修改 Controller 和前端契约。

```env
CREATOR_LOCAL_IMAGE_TTL_DAYS=7
FILE_UPLOAD_LOCATION=../upload
FILE_DOMAIN=http://localhost:8080
FILE_SERVE_ROOT=/profile
```

此功能不使用数据库，无需新增 Prisma 迁移。生产环境允许 SVG 等主动内容时，建议将 `FILE_DOMAIN` 配置为与 API 隔离的静态资源域名。

`POST /api/creator/uploads/json` 接收原始 JSON 请求体，单次最大 20 MiB，写入 `creator/{creatorId}/json/{yyyy/MM/dd}/{uuid}.json`，返回 `fileId`、`url`、`contentType`、`size` 和 `expiresAt`。该接口使用 `CreatorJsonStorage` 契约，未来可以独立替换为 OSS 实现。
