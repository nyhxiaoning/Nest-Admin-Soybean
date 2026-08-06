# 🗄️ 数据库初始化指南

## 概述

本项目已迁移到 **Prisma 迁移系统**管理数据库结构，不再使用 `init.sql` 自动初始化。

---

## ❌ 已移除的功能

### Docker Compose 自动初始化

**原配置**（已移除）：
```yaml
volumes:
  - ./apps/server/db:/docker-entrypoint-initdb.d  # ❌ 已移除
```

**移除原因**：
1. `init.sql` 只包含 18 个核心表，与当前 48 个表的 Schema 不一致
2. 与 Prisma 迁移系统冲突，导致迁移历史混乱
3. 新增的 30 个表（如 `sys_system_config`、`sys_tenant_feature` 等）无法通过 init.sql 初始化
4. 无法追踪数据库版本变更

---

## ✅ 新的初始化方式

### 方式 1：一键完整初始化（推荐）

```bash
cd apps/server
npm run prisma:init
```

**执行流程**：
1. `prisma migrate reset --force` - 重置数据库并应用所有迁移（48个表）
2. `ts-node prisma/seed.ts` - 导入核心表种子数据（18个表）
3. `ts-node prisma/migration-seed.ts` - 导入迁移表种子数据（8个表）
4. `prisma generate` - 生成 Prisma Client

**适用场景**：
- ✅ 首次拉取项目
- ✅ 数据库结构损坏需要重置
- ✅ 切换到新的开发分支

### 方式 2：Docker 启动后手动初始化

如果你使用 Docker Compose 启动 PostgreSQL：

```bash
# 1. 启动 Docker 服务
docker-compose up -d postgres redis

# 2. 等待 PostgreSQL 就绪
docker-compose exec postgres pg_isready -U postgres -d nest_admin

# 3. 初始化数据库
cd apps/server
npm run prisma:init
```

### 方式 3：增量更新（开发中）

```bash
# 1. 创建新迁移（修改 schema.prisma 后）
npm run prisma:migrate -- --name add_new_feature

# 2. 如果需要种子数据，更新 prisma/migration-seed.ts

# 3. 仅补充种子数据（不影响现有数据）
npm run prisma:seed:migration

# 4. 检查覆盖率
npm run prisma:check-seed
```

---

## 📊 数据库状态对比

### init.sql 覆盖（已废弃）

| 类型 | 数量 | 说明 |
|------|------|------|
| 表结构 | 25 个 | 核心基础表 |
| 种子数据 | 18 个表 | 350 条 INSERT 语句 |

### Prisma 迁移覆盖（当前）

| 类型 | 数量 | 说明 |
|------|------|------|
| 表结构 | 48 个 | 所有表（包括20+个新表） |
| 迁移文件 | 11 个 | 完整的版本历史 |
| 种子数据 | 26 个表 | 可编程、可版本控制 |

---

## 🗂️ 文件结构

```
apps/server/
├── prisma/
│   ├── schema.prisma              # 数据模型定义（唯一数据源）
│   ├── seed.ts                    # 核心表种子数据
│   ├── migration-seed.ts          # 迁移表种子数据
│   ├── migrations/                # 迁移历史
│   │   ├── 20251217031315_*.sql
│   │   ├── 20251218085631_*.sql
│   │   └── ...
│   └── db/
│       ├── README.md              # 本文件
│       └── backup/                # 备份目录
│           ├── init.sql           # ⚠️  已废弃，仅作参考
│           └── update_menu_icons.sql
└── package.json
    ├── prisma:init                # 🔥 完整初始化
    ├── prisma:seed:migration       # 🔥 补充迁移表种子
    └── prisma:check-seed           # 🔥 检查覆盖率
```

---

## 🔧 常用命令

### 开发环境

```bash
# 完整初始化（首次或重置）
npm run prisma:init

# 仅补充迁移表种子
npm run prisma:seed:migration

# 检查种子数据覆盖率
npm run prisma:check-seed

# 创建新迁移
npm run prisma:migrate -- --name add_table_name

# 生成 Prisma Client
npm run prisma:generate

# 重置数据库（破坏性）
npm run prisma:reset
```

### 生产环境

```bash
# 安全应用迁移（不重置）
npm run prisma:deploy

# 补充种子数据（幂等性，安全）
npm run prisma:seed:migration

# 验证
npm run prisma:check-seed
```

### Docker 管理

```bash
# 启动服务
docker-compose up -d postgres redis

# 查看日志
docker-compose logs -f postgres

# 停止服务
docker-compose down

# 停止并删除数据卷（⚠️ 会丢失所有数据）
docker-compose down -v
```

---

## 🚀 新开发者快速开始

### 1. 克隆项目

```bash
git clone <repository>
cd Nest-Admin-Soybean
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cd apps/server
cp .env.development .env
# 根据需要修改 .env
```

### 4. 启动 Docker 服务

```bash
cd ../../
docker-compose up -d postgres redis
```

### 5. 初始化数据库

```bash
cd apps/server
npm run prisma:init
```

### 6. 启动应用

```bash
npm run dev
```

### 7. 验证

```bash
# 检查接口
curl http://localhost:8080/api/v1/registerUser
# 应该返回: {"code":200,"data":true,...}

# 检查种子覆盖率
npm run prisma:check-seed
# 应该显示: ✅ 所有必需表都有数据
```

---

## ❓ 常见问题

### Q1: 为什么移除 init.sql 自动初始化？

**A:** 三个主要原因：
1. **数据不一致**：init.sql 只有 18 个表，Schema 有 48 个表
2. **迁移冲突**：Docker 自动执行 init.sql 会干扰 Prisma 迁移历史
3. **维护困难**：需要手动同步 Schema 变更到 init.sql

### Q2: 新表如何添加种子数据？

**A:** 在 `prisma/migration-seed.ts` 中添加：

```typescript
// ==================== 新表名 ====================
console.log('📝 导入新表...');
await prisma.newTable.createMany({
  data: [
    {
      // 字段名: 值
      field1: 'value1',
      field2: 123,
    },
  ],
  skipDuplicates: true,  // 幂等性
});
```

然后运行：
```bash
npm run prisma:seed:migration
```

### Q3: 如何回滚到之前的数据库版本？

**A:** Prisma 迁移不支持自动回滚，需要手动：

```bash
# 1. 查看迁移历史
npx prisma migrate status

# 2. 手动编写回滚 SQL
# 参考: prisma/migrations/xxx/migration.sql

# 3. 应用回滚
psql $DATABASE_URL -f rollback.sql

# 4. 标记迁移为已回滚
npx prisma migrate resolve --rolled-back <migration_name>
```

### Q4: 生产环境如何安全部署？

**A:** 使用以下流程：

```bash
# 1. 只应用迁移，不重置
npm run prisma:deploy

# 2. 补充种子数据（幂等性保证安全）
npm run prisma:seed:migration

# 3. 验证数据库状态
npm run prisma:check-seed

# 4. 启动服务
npm run start:prod
```

### Q5: init.sql 备份文件有什么用？

**A:**
- 📚 **参考文档**：查看历史数据结构
- 🔍 **数据迁移**：如果需要从旧版本恢复特定数据
- 📊 **对比分析**：了解 Schema 演进过程

**注意**：备份文件**不应**用于数据库初始化。

---

## 📚 相关文档

- **Prisma 迁移指南**：[prisma/BEST_PRACTICES.md](./BEST_PRACTICES.md)
- **种子数据完整方案**：[prisma/SEED_SOLUTION.md](./SEED_SOLUTION.md)
- **问题修复总结**：[prisma/FIX_SUMMARY.md](./FIX_SUMMARY.md)

---

## 🎯 关键要点

### 核心变更

| 项目 | 旧方案 | 新方案 |
|------|--------|--------|
| **初始化方式** | Docker + init.sql | Prisma 迁移 + 种子脚本 |
| **数据源** | SQL + Schema 双重 | Schema 唯一数据源 |
| **版本控制** | ❌ 无 | ✅ 完整迁移历史 |
| **可回滚性** | ❌ 难 | ✅ 支持 |
| **表覆盖** | 18 个 | **48 个** |
| **幂等性** | ⚠️ 部分 | ✅ 完全支持 |

### 必须记住的命令

```bash
# 新开发者首次设置
npm run prisma:init

# 新增表后
npm run prisma:migrate
npm run prisma:seed:migration
npm run prisma:check-seed

# 生产部署
npm run prisma:deploy && npm run prisma:seed:migration
```

---

**最后更新**: 2026-08-05
**维护者**: Nest-Admin-Soybean Team
