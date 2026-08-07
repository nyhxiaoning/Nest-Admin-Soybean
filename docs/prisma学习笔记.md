# Prisma 学习笔记

> **适用人群**: Prisma 初学者，尤其是 NestJS + Prisma 项目开发者
> **学习方法**: 费曼学习法 —— 用你自己的话讲给别人听，如果你讲不清楚，就是还没真正理解
> **项目基准**: 本文档基于 Nest-Admin-Soybean 项目的实际配置编写

---

## 一、先搞懂：Prisma 到底是什么？

### 1.1 用一句话说

> Prisma 是一个**数据库工具包**，它让你用代码定义数据结构（Schema），然后自动帮你完成数据库建表、读写数据、生成类型等所有脏活累活。

### 1.2 它的三个核心组件

| 组件 | 做什么 | 类比理解 |
|------|--------|----------|
| **Prisma Schema** | 用声明式语法描述数据模型 | 像一份"数据字典" |
| **Prisma Migrate** | 根据 Schema 生成并管理 SQL 迁移脚本 | 像 Git，但管的是数据库结构变更 |
| **Prisma Client** | 自动生成的类型安全数据库查询 SDK | 像 ActiveRecord 或 TypeORM 的 Repository |

### 1.3 为什么不用 raw SQL？

想象你要建一张用户表。传统方式你要写：

```sql
CREATE TABLE sys_user (
  user_id SERIAL PRIMARY KEY,
  user_name VARCHAR(30) NOT NULL,
  password VARCHAR(100) NOT NULL,
  status CHAR(1) DEFAULT '0',
  del_flag CHAR(1) DEFAULT '0',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

然后你在 TypeScript 里又要定义一个 interface 来描述它。两处定义，任意一处改了，另一处忘了同步 → **类型错误、SQL 错误、线上崩了**。

Prisma 的做法：**只定义一个 Schema，其他全自动**。

---

## 二、Prisma Schema：一切数据的源头

### 2.1 Schema 长什么样？

打开 `apps/server/prisma/schema.prisma`，结构分为三段：

```prisma
// ① 生成器配置：生成什么客户端
generator client {
  provider = "prisma-client-js"
}

// ② 数据源配置：连哪个数据库
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ③ 模型定义：你的所有表
model SysUser {
  userId    Int      @id @default(autoincrement())
  userName  String   @db.VarChar(30)
  password  String   @db.VarChar(100)
  status    String   @default("0") @db.Char(1)
  delFlag   String   @default("0") @map("del_flag") @db.Char(1)
  createTime DateTime? @default(dbgenerated("CURRENT_TIMESTAMP")) @db.Timestamp(6)

  // 关联关系
  roles     SysRole[]
  dept      SysDept?  @relation(fields: [deptId], references: [deptId])

  // 数据库表名映射
  @@map("sys_user")
}
```

### 2.2 常用字段属性速查

```prisma
model SysUser {
  // ── 主键 ──
  userId   Int    @id                      // 自增主键
  userId   String @id @default(uuid())     // UUID 主键

  // ── 默认值 ──
  status   String @default("0")            // 默认值

  // ── 数据库列映射 ──
  userName String @map("user_name")        // 驼峰 → 蛇形
  delFlag  String @map("del_flag") @db.Char(1)  // 自定义数据库类型

  // ── 可选 / 必填 ──
  nickname String?                          // ? = 可为 null
  email    String                           // 非空

  // ── 关联 ──
  roleId   Int
  role     SysRole @relation(fields: [roleId], references: [roleId])

  // ── 索引 / 唯一约束 ──
  @@unique([tenantId, userName])
  @@index([status])
}
```

### 2.3 关联关系三兄弟

```prisma
// ① 一对一：一篇文章对应一个作者
model Post {
  id        Int      @id
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int      // 外键
}

model User {
  id    Int    @id
  post  Post?           // ? = 可为空（用户可能还没写文章）
}

// ② 一对多：一个角色对应多个用户
model SysRole {
  roleId    Int      @id
  users     SysUser[]  // 复数 = 多个
}

model SysUser {
  userId  Int     @id
  role    SysRole @relation(fields: [roleId], references: [roleId])
  roleId  Int
}

// ③ 多对多：一个用户对应多个角色，一个角色对应多个用户
model SysUser {
  userId Int     @id
  roles  SysRole[]  // 自动生成中间表 sys_user__sys_role
}

model SysRole {
  roleId Int     @id
  users  SysUser[]
}
```

> **费曼检验**：试着给同事解释这三个关联关系的区别，如果他听懂了，你才真正懂了。

---

## 三、CRUD 操作：最核心的四个

### 3.1 项目中的 PrismaService 是怎么工作的？

项目里的 `apps/server/src/infrastructure/prisma/prisma.service.ts` 做了几件事：

1. **读取环境变量配置**：从 `.env` 读 `DATABASE_URL` 拼成连接字符串
2. **创建扩展客户端**：挂载了软删除、租户隔离、慢查询监控三个插件
3. **按需代理模型**：对外暴露 `this.sysUser`、`this.sysRole` 等代理属性

```typescript
// prisma.service.ts 的核心逻辑
@Injectable()
export class PrismaService {
  private readonly _client: ExtendedPrismaClient;

  constructor(config: AppConfigService) {
    const connectionString = PrismaService.buildConnectionString(pgConfig);
    this._client = createExtendedPrismaClient(connectionString, slowQueryLogs);
  }

  // 代理所有模型访问
  get sysUser() { return this._client.sysUser; }
  get sysRole() { return this._client.sysRole; }
  // ... 共 38 个模型

  // 代理核心方法
  get client() { return this._client; }
}
```

### 3.2 增删查改的实际用法

#### 🔵 查 (Read)

```typescript
// ── 根据主键查 ──
const user = await prisma.sysUser.findUnique({
  where: { userId: 1 },
});

// ── 根据条件查第一条 ──
const user = await prisma.sysUser.findFirst({
  where: { userName: 'admin', delFlag: '0' },
});

// ── 查多条（列表） ──
const users = await prisma.sysUser.findMany({
  where: { status: '0', delFlag: '0' },
  orderBy: { createTime: 'desc' },
  skip: 0,
  take: 10,
  include: { roles: true, dept: true },  // 关联查询
});

// ── 计数 ──
const total = await prisma.sysUser.count({
  where: { status: '0' },
});
```

> **关键点**：`findUnique` 用主键，`findFirst` 用条件。在 Nest-Admin 项目里几乎所有查询都带 `delFlag: '0'`，因为项目用软删除。

#### 🟢 增 (Create)

```typescript
// ── 单条创建 ──
const user = await prisma.sysUser.create({
  data: {
    userName: 'zhangsan',
    password: 'hashed_password',
    status: '0',
    delFlag: '0',
    // 关联数据一起创建（嵌套写）
    roles: {
      create: [{ roleId: 1 }],
    },
  },
});

// ── 批量创建 ──
await prisma.sysUser.createMany({
  data: [
    { userName: 'zhangsan', password: 'xxx', delFlag: '0' },
    { userName: 'lisi', password: 'yyy', delFlag: '0' },
  ],
  skipDuplicates: true,  // 幂等：重复数据自动跳过
});
```

#### 🟡 改 (Update)

```typescript
// ── 根据主键更新 ──
const user = await prisma.sysUser.update({
  where: { userId: 1 },
  data: { status: '1', userName: 'zhangsan_new' },
});

// ── 条件更新（可能不匹配任何记录，不报错） ──
const result = await prisma.sysUser.updateMany({
  where: { status: '0' },
  data: { status: '1' },
});
console.log(result.count); // 更新了几条
```

#### 🔴 删 (Delete)

```typescript
// ── 硬删除（真实删除，慎用） ──
await prisma.sysUser.delete({
  where: { userId: 1 },
});

// ── 批量硬删除 ──
await prisma.sysUser.deleteMany({
  where: { status: '1', delFlag: '1' },
});

// ── 软删除（本项目实际使用的方式） ──
await prisma.sysUser.update({
  where: { userId: 1 },
  data: { delFlag: '1' },  // 标记删除，数据仍保留
});
```

### 3.3 项目的分层模式

本项目没有直接在每个 Service 里写 `prisma.sysUser.xxx()`，而是用了三层：

```
Controller
   ↓
Service (业务逻辑)
   ↓
Repository (数据访问)
   ↓
Prisma Client (底层执行)
```

**Repository 层** (`base.repository.ts`) 封装了通用的 CRUD：

```typescript
@Injectable()
export class UserRepository extends SoftDeleteRepository<SysUser, Prisma.SysUserDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma, 'sysUser');
  }
}
```

继承 `SoftDeleteRepository` 后，自动获得 `findAll()`、`findById()`、`softDelete()` 等方法，**每个查询自动带上 `delFlag: '0'`**。

**Service 层** (`base.service.ts`) 在 Repository 基础上封装分页、DTO 转换：

```typescript
export abstract class BaseService<T, R, D> {
  async findAll(query) { /* 分页 + 条件构建 + DTO 转换 */ }
  async findOne(id)   { /* 详情 + DTO 转换 */ }
  async create(dto)   { /* 创建 */ }
  async update(id, dto){ /* 更新 */ }
  async remove(id)    { /* 软删除 */ }
}
```

> **为什么要分层？**
> - Repository 只管查数据，不管业务
> - Service 处理业务逻辑（权限、缓存、事务），不关心 SQL
> - Controller 只管 HTTP 参数校验和响应格式

---

## 四、数据库初始化：从零到可用

### 4.1 三种场景，三种姿势

#### 🟢 场景一：全新环境（第一次 clone 项目）

```bash
# 1. 启动 PostgreSQL（通过 Docker）
docker-compose up -d postgres redis

# 2. 等待 PostgreSQL 就绪
docker-compose exec postgres pg_isready -U postgres -d nest_admin

# 3. 一键初始化（最重要的一步）
cd apps/server
npm run prisma:init

# 4. 启动服务
npm run dev
```

`npm run prisma:init` 到底做了什么？

```
npm run prisma:init
  │
  ├── prisma migrate reset --force      ① 删除所有表 → 重建 48 张表 → 记录迁移历史
  ├── ts-node prisma/seed.ts            ② 导入核心表种子（18 个表）
  ├── ts-node prisma/migration-seed.ts  ③ 导入迁移表种子（8 个表）
  └── prisma generate                   ④ 生成 Prisma Client
```

#### 🟡 场景二：已有数据，只需要添加新表

**千万不要用 `prisma:init`**，那会清空数据！正确姿势：

```bash
# 1. 修改 schema.prisma 添加新模型

# 2. 创建迁移（Prisma 自动生成 SQL 变更脚本）
npm run prisma:migrate -- --name add_new_table

# 3. 只补充种子数据（不影响现有数据）
npm run prisma:seed:migration

# 4. 检查哪些表还没数据
npm run prisma:check-seed
```

#### 🔴 场景三：数据库坏了，需要重置

```bash
npm run prisma:reset
# 相当于：migrate reset --force + seed:only
# 注意：不会执行 migration-seed（迁移表种子）
```

### 4.2 迁移文件的秘密

在 `apps/server/prisma/migrations/` 下，你会看到一堆带时间戳的文件夹：

```
migrations/
├── 20251217031315_init/
│   └── migration.sql        ← 第一步创建核心表
├── 20251218085631_add_tenant/
│   └── migration.sql        ← 第二步增加租户相关表
├── 20251220093000_add_sms/
│   └── migration.sql        ← 第三步增加短信/邮件表
└── ...
```

每个文件夹 = 一次数据库版本变更。Prisma 的 `_prisma_migrations` 表记录了哪些迁移已经执行过。

> **类比理解**：就像 Git 的 commit 历史。每次 `migrate reset` 相当于 "git checkout 到最新并清空工作区再重建"，`migrate deploy` 相当于 "git pull"。

### 4.3 seed.ts vs migration-seed.ts 的区别

| | `seed.ts` | `migration-seed.ts` |
|---|---|---|
| **作用** | 初始化核心基础数据 | 初始化迁移添加的新表数据 |
| **数据量** | ~18 个表 | ~8 个表 |
| **运行时机** | 第一次初始化、数据库重置时 | 新增表后、增量更新时 |
| **脚本命令** | `prisma:seed:only` | `prisma:seed:migration` |
| **幂等性** | ✅ | ✅ (`skipDuplicates: true`) |
| **代表数据** | 租户、角色、菜单、用户等 | 系统配置、功能开关、OSS 配置等 |

---

## 五、数据库迁移：Schema 变了怎么办？

### 5.1 核心命令对比

| 命令 | 用途 | 删除数据？ | 适用环境 |
|------|------|-----------|---------|
| `prisma migrate dev` | 开发：生成迁移 + 执行 + 生成 Client | ❌ | 开发 |
| `prisma migrate reset --force` | 强制重置（删表重建） | ✅ | 开发/测试 |
| `prisma migrate deploy` | 只应用未执行的迁移 | ❌ | **生产** |
| `prisma migrate status` | 查看迁移状态 | ❌ | 任何 |

### 5.2 日常开发流程

```bash
# ── 修改 schema.prisma ──
# 例如：给 SysUser 加一个 nickname 字段

# ── 生成迁移 ──
npm run prisma:migrate -- --name add_user_nickname

# ── Prisma 自动 ──
# 1. 生成迁移 SQL → prisma/migrations/20260101120000_add_user_nickname/migration.sql
# 2. 执行 SQL 更新本地数据库
# 3. 更新 _prisma_migrations 记录

# ── 如果需要种子数据 ──
# 编辑 prisma/migration-seed.ts
npm run prisma:seed:migration
```

### 5.3 迁移 SQL 长什么样？

```sql
-- prisma/migrations/20251217031315_init/migration.sql

-- CreateTable
CREATE TABLE "sys_user" (
    "user_id" SERIAL NOT NULL,
    "user_name" VARCHAR(30) NOT NULL,
    "password" VARCHAR(100) NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT '0',
    "del_flag" CHAR(1) NOT NULL DEFAULT '0',
    "create_time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sys_role" (
    "role_id" SERIAL NOT NULL,
    ...
    CONSTRAINT "sys_role_pkey" PRIMARY KEY ("role_id")
);

-- 迁移历史记录（Prisma 自动维护）
CREATE TABLE "_prisma_migrations" (
    ...
);
```

### 5.4 常见问题：迁移冲突了怎么办？

如果 `_prisma_migrations` 表里的记录和实际文件不一致：

```bash
# 查看当前状态
npx prisma migrate status

# 标记某个迁移为已应用（如果确定已经执行了）
npx prisma migrate resolve --applied <migration_name>

# 标记某个迁移为已回滚
npx prisma migrate resolve --rolled-back <migration_name>

# 极端情况：重置一切
npx prisma migrate reset --force
```

> **⚠️ Prisma 的 migrate reset 是破坏性的！** 它会删除所有数据。绝对不要在生产环境执行。

---

## 六、预置种子数据：让数据库自带数据

### 6.1 seed.ts 的核心逻辑

```typescript
// apps/server/prisma/seed.ts
async function main() {
  // ── 租户 ──
  await prisma.sysTenant.createMany({
    data: [{ tenantId: '000000', companyName: '默认租户', status: '0', delFlag: '0' }],
    skipDuplicates: true,
  });

  // ── 套餐 ──
  await prisma.sysTenantPackage.createMany({
    data: [{ packageName: '默认套餐', menuCheckStrictly: false, status: '0', delFlag: '0' }],
    skipDuplicates: true,
  });

  // ── 角色 ──
  await prisma.sysRole.createMany({
    data: [{ roleName: '超级管理员', roleKey: 'admin', roleSort: 0, status: '0', delFlag: '0' }],
    skipDuplicates: true,
  });

  // ... 更多表
}
```

### 6.2 关键设计：幂等性

```typescript
// ✅ 正确：可以重复执行
await prisma.sysTenant.createMany({
  data: [...],
  skipDuplicates: true,  // 已存在的记录自动跳过
});

// ❌ 错误：重复执行会报唯一键冲突
await prisma.sysTenant.create({
  data: { tenantId: '000000', ... },
});
```

### 6.3 如何在 CI/CD 中验证种子数据覆盖率？

```bash
# 运行检查脚本
npm run prisma:check-seed

# 输出示例：
# Schema 中共有 48 个模型
#
# === 数据覆盖情况 ===
#
# ✅ 有数据: 26 个表
# ⚠️  无数据: 0 个表
# ❌ 出错: 0 个表
#
# ✅ 所有必需表都有数据
```

这个脚本会对比 `schema.prisma` 中的模型数量和数据库中实际有数据的表数量。

---

## 七、生产部署：安全第一

### 7.1 核心原则

| 开发环境 | 生产环境 |
|---------|---------|
| `prisma migrate reset --force` ✅ | ❌ **绝对不能** |
| `prisma migrate dev` ✅ | ❌ **绝对不能** |
| `prisma migrate deploy` ✅ | ✅ **只能用它** |
| 随意修改数据库 | 所有变更必须走迁移 |

### 7.2 生产部署完整流程

```bash
# ── Step 1: 应用迁移（不重置！）──
npm run prisma:deploy
# 内部执行：prisma migrate deploy
# → 对比 _prisma_migrations 表
# → 只执行还没跑过的迁移
# → 不会删除任何数据

# ── Step 2: 补充种子数据 ──
npm run prisma:seed:migration
# → 所有 createMany 都有 skipDuplicates: true
# → 重复执行也不会覆盖已有数据

# ── Step 3: 生成 Client ──
npm run prisma:generate

# ── Step 4: 重启服务 ──
npm run start:prod
```

### 7.3 环境变量配置

项目使用多环境配置（通过 `AppConfigService` 动态拼接连接串）：

```
.env.development  →  开发环境
.env.test         →  测试环境
.env.production   →  生产环境
```

关键环境变量：

```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nest_admin?schema=public"

# 连接池配置
DATABASE_POOL_SIZE=10
DATABASE_CONNECTION_TIMEOUT=5000
DATABASE_IDLE_TIMEOUT=30000
```

> **生产环境注意**：PrismaService 内部使用了 `$extends` 挂载了软删除、租户隔离、慢查询监控三个扩展。如果你单独使用 `PrismaClient`（比如在脚本中），不会自动获得这些能力。

---

## 八、项目特有机制

### 8.1 软删除 (Soft Delete)

项目里所有表都有 `delFlag` 字段。Prisma 通过扩展自动注入过滤：

```typescript
// soft-delete.extension.ts
return prisma.$extends({
  query: {
    $allModels: {
      // 所有 findMany / findFirst / findUnique 自动过滤 delFlag = '0'
      findMany({ model, args }) {
        args.where = { ...args.where, delFlag: '0' };
        return query.findMany(model, args);
      },
    },
  },
});
```

效果：你写 `prisma.sysUser.findMany()` 自动变成 `SELECT * FROM sys_user WHERE del_flag = '0'`。

### 8.2 租户隔离 (Tenant Isolation)

多租户场景下，通过扩展自动给每个查询加上 `tenantId` 过滤：

```typescript
// tenant.extension.ts
return prisma.$extends({
  query: {
    $allModels: {
      findMany({ model, args }, context) {
        const tenantId = context.runner?.tenant?.tenantId;
        if (tenantId) {
          args.where = { ...args.where, tenantId };
        }
        return query.findMany(model, args);
      },
    },
  },
});
```

### 8.3 慢查询监控

```typescript
// slow-query.extension.ts
return prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, args, query }, context) {
        const start = Date.now();
        const result = await query(operation, args);
        const duration = Date.now() - start;

        if (duration > 1000) {  // 超过 1 秒
          context.addToSlowQueries({ operation, duration, model });
        }
        return result;
      },
    },
  },
});
```

---

## 九、常见问题排查

### Q1: `npm run prisma:init` 报连接超时

**原因**：PostgreSQL 还没完全启动就执行了。

**解决**：
```bash
# 确认 PostgreSQL 正在运行
docker-compose ps postgres

# 等它就绪
docker-compose exec postgres pg_isready -U postgres -d nest_admin
# 输出：pg_isready: accepting connections

# 再执行
npm run prisma:init
```

### Q2: 迁移历史对不上

```bash
# 查看状态
npx prisma migrate status

# 如果提示有未执行的迁移
npx prisma migrate deploy

# 极端情况：重置
npx prisma migrate reset --force  # ⚠️ 开发环境可用
```

### Q3: Schema 改了，Client 没更新

```bash
npx prisma generate
```

### Q4: 关联查询返回空

检查：
1. 是否用了 `include` / `select`
2. 关联字段是否写了 `@relation`
3. 软删除是否把关联记录过滤掉了

```typescript
// ❌ 不会返回关联的 roles
const user = await prisma.sysUser.findUnique({ where: { userId: 1 } });

// ✅ 使用 include 加载关联
const user = await prisma.sysUser.findUnique({
  where: { userId: 1 },
  include: { roles: true, dept: true },
});
```

### Q5: 批量插入报唯一键冲突

```typescript
// ❌ 有一条重复就全部失败
await prisma.sysUser.createMany({ data: [...] });

// ✅ 使用 skipDuplicates
await prisma.sysUser.createMany({
  data: [...],
  skipDuplicates: true,
});
```

---

## 十、命令速查卡

```bash
# ─── 初始化 ───
npm run prisma:init              # 完整初始化（重置 + 种子）
npm run prisma:reset             # 仅重置（不执行 migration-seed）
npm run prisma:seed:only         # 只执行 core seed.ts
npm run prisma:seed:migration     # 只执行 migration-seed.ts

# ─── 迁移 ───
npm run prisma:migrate           # 开发迁移（+ 执行 + generate）
npm run prisma:deploy            # 生产迁移（仅执行未跑的迁移）
npx prisma migrate status        # 查看迁移状态
npx prisma migrate resolve --applied <name>  # 手动标记已执行
npx prisma migrate resolve --rolled-back <name>  # 手动标记已回滚

# ─── 代码生成 ───
npm run prisma:generate          # 生成 Prisma Client
npx prisma studio                # 打开可视化数据浏览工具

# ─── 检查 ───
npm run prisma:check-seed         # 检查种子数据覆盖率
```

---

## 十一、费曼检验：用自己的话讲一遍

如果你能把下面这些问题讲清楚，说明你真的理解了：

1. **为什么项目里有两套种子脚本？** `seed.ts` 负责核心基础表（第一次初始化用），`migration-seed.ts` 负责迁移新增的表（增量更新用）。

2. **`findMany` 和 `findFirst` 有什么区别？** `findMany` 返回数组，`findFirst` 返回单条或 null。项目用 `findMany` 做列表，`findFirst` 做存在性检查。

3. **生产环境为什么不能用 `migrate reset`？** 它会删除所有数据并重建。生产环境只能用 `migrate deploy`。

4. **`skipDuplicates: true` 为什么重要？** 让种子数据脚本变成幂等的，重复执行不会报错，CI/CD 和手动补充种子都可以安全运行。

5. **软删除和硬删除的本质区别是什么？** 硬删除是 `DELETE FROM`（数据真没了），软删除是 `UPDATE SET del_flag = '1'`（数据保留，通过扩展自动过滤）。

---

*最后更新：2026-08-07*
*参考代码库：Nest-Admin-Soybean `apps/server/prisma/`*
