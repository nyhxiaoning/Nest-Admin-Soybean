# primsma开发问题：

## dev开发环境，增加了很多迁移表提交后，另一个同学拉取了代码，直接执行了db push后，启动说一些字段找不到？
> 前提：项目已装好 `prisma`，schema 文件路径：`prisma/schema.prisma`

根因：你的数据库一直是用 db push 维护的（库里没有 _prisma_migrations 历史表），后来手写的 3 个迁移（creator_user、creator_work 等）从未执行过，所以登录时 upsert 找不到 creator_user 表。

Prisma client 缺少 CreatorWork 相关的类型，先检查 schema 和代码的命名是否一致。
第一步：新增了表之后，我们需要prisma generate执行新的prism a/schema.prisma，将生成内容

第二步：.Schema 里模型都在，问题是 Prisma client 没有重新生成。运行 prisma generate 即可。







# 开发环境使用

## 1.配置记录几个命令区别：prisma db push
prisma db push --force-reset --accept-data-loss

会重置数据库并造成数据丢失，不应在现有数据库上随便运行。

## 2.pnpm prisma:seed
- 初始化脚本数据使用；
也就是运行整个 [seed.ts](/Users/henryheng/Code/personCode/Nest-Admin-Soybean/apps/server/prisma/seed.ts)，向数据库写入系统初始化数据，包括租户、用户、菜单、权限、作品分类等。


## 3.开发环境常用（5条核心）
> 前提：项目已装好 `prisma`，schema 文件路径：`prisma/schema.prisma`

### 1. 生成 Prisma Client（改完schema必执行）

```
npx prisma generate
```

作用：根据 schema 生成 TS/JS 查询客户端；新增字段、模型后运行。

### 2. 创建迁移（新建表 / 新增字段，生成迁移SQL文件）

```
npx prisma migrate dev --name add_user_table
```

- `--name`：给本次变更起一个描述名字
- 行为：生成迁移文件夹 `prisma/migrations/xxx` → **自动执行迁移更新本地数据库** → 自动 generate
- ⚠️ **仅限开发环境，不要上生产！**

### 3. 重置本地数据库（清空、重建、执行所有迁移 + 种子数据）

```
npx prisma migrate reset
```

作用：删除本地全部表 → 重新跑完所有迁移 → 运行种子脚本 `prisma/seed.ts` 适合开发阶段想一键重置测试数据。

### 4. 推送 schema 直接同步数据库（快速同步，**不生成迁移文件**）

```
npx prisma db push
```

> 适合：原型快速迭代，临时本地开发，不想维护迁移历史。 ❗ 不要用于正式版本迭代/生产部署，不会记录迁移版本。

### 5. 运行种子脚本，初始化基础数据（管理员账号、字典表、初始配置）

```
npx prisma db seed
```






# 线上部署 Prisma 的核心原则是：开发环境生成迁移文件，生产环境只执行已提交的迁移文件。

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