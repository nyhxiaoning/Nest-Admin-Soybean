线上部署 Prisma 的核心原则是：开发环境生成迁移文件，生产环境只执行已提交的迁移文件。

## 推荐部署流程

### 1. 开发环境生成迁移

修改 [schema.prisma](/Users/henryning/Documents/code/personCode/Nest-Admin-Soybean/apps/server/prisma/schema.prisma) 后执行：

```
cd apps/server

pnpm prisma:migrate -- --name add_creator_user
pnpm prisma:generate
pnpm exec prisma validate
```

需要提交到 Git：

```
apps/server/prisma/schema.prisma
apps/server/prisma/migrations/**
```

`migrate dev` 只能用于开发环境，不能在线上执行。[Prisma 官方说明](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)

### 2. 构建阶段生成 Prisma Client

```
pnpm install --frozen-lockfile
pnpm --filter @nest-admin/server prisma:generate
pnpm --filter @nest-admin/server build:prod
```

注意：`prisma migrate deploy` 需要 Prisma CLI。当前 [package.json](/Users/henryning/Documents/code/personCode/Nest-Admin-Soybean/apps/server/package.json) 中 `prisma` 如果位于 `devDependencies`，生产镜像构建时不能提前删除开发依赖；也可以单独制作一个包含 Prisma CLI 的 migration 镜像。

### 3. 发布前检查

先备份 PostgreSQL 数据库或创建云数据库快照，然后使用生产数据库环境变量执行：

```
pnpm --filter @nest-admin/server exec prisma migrate status
```

确认迁移状态正常后：

```
pnpm --filter @nest-admin/server prisma:deploy
```

仓库里的 `prisma:deploy` 已对应：

```
prisma migrate deploy
```

它只会执行尚未应用的迁移，不会生成迁移、不会重置数据库，也不会生成 Prisma Client。[Prisma migrate deploy 文档](https://docs.prisma.io/docs/cli/migrate/deploy)

推荐发布顺序：

```
构建应用
   ↓
备份数据库
   ↓
单独执行一次 prisma migrate deploy
   ↓
迁移成功
   ↓
启动/切换新版 NestJS 服务
```

不要让每个 Pod 或每个应用实例都执行迁移，最好作为 CI/CD 中单独且只运行一次的 release job。Prisma 官方也建议在 CI/CD 中执行，而不是把生产数据库地址放到开发机临时部署。[官方部署指南](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)

## 当前项目需要特别注意

目前目录中存在两个迁移：

```
202608190001_add_pc_creator_center_auth
20260819092223_0819creator_user
```

第二个迁移包含大量 `sys_*` 表创建语句，看起来更像现有数据库的全量基线迁移。

如果线上数据库已经存在这些 `sys_*` 表，但没有对应的 `_prisma_migrations` 记录，直接执行：

```
pnpm prisma:deploy
```

很可能会因为“表已经存在”而失败。

推荐在首次上线前整理成：

```
0_init
└── 线上原本已经存在的数据库结构

202608190001_add_pc_creator_center_auth
└── 新增 creator_user
```

对于已有线上数据库：

```
pnpm exec prisma migrate resolve --applied 0_init
pnpm prisma:deploy
```

含义是：将原有结构标记为已经执行，只真正执行后续的 `creator_user` 增量迁移。基线迁移必须先与线上实际表结构核对，不能直接盲目 `resolve`。[Prisma 基线迁移指南](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)

## 生产环境禁止执行

当前项目中以下命令可能重置或破坏数据，线上不要执行：

```
pnpm prisma:migrate
pnpm prisma:seed
pnpm prisma:reset
pnpm prisma:init
prisma db push --force-reset
```

特别是当前 `prisma:seed` 包含：

```
prisma db push --force-reset --accept-data-loss
```

它会清空数据库，只能用于可丢弃的开发数据库。

结论：全新线上数据库可以在备份和预演后直接执行 `prisma:deploy`；已有业务数据库必须先整理并登记 baseline，再执行创作者登录模块的增量迁移。