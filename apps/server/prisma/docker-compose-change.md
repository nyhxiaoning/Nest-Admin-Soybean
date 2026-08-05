# 🔄 Docker Compose 数据库初始化方案变更

## 📋 变更概述

**变更时间**: 2026-08-05
**变更类型**: 数据库初始化策略调整
**影响范围**: Docker Compose 配置、数据库初始化流程

---

## 🎯 变更原因

### 问题背景

1. **Docker 自动执行 init.sql** 与 **Prisma 迁移系统**双重管理数据库
2. `init.sql` 已过时：
   - 仅包含 18 个核心表
   - 缺少 30 个迁移添加的表（如 `sys_system_config`）
   - 与 Prisma Schema（48个表）不一致
3. **导致问题**：
   - 数据库结构与代码不同步
   - 种子数据缺失
   - 迁移历史混乱

### 根本原因

```
init.sql (18表)  ← Docker 自动执行
    ↓ 冲突
Prisma Migrations (48表)  ← 代码管理
```

---

## ✅ 已执行的变更

### 1. Docker Compose 配置更新

**文件**: `docker-compose-postgres-redis.yml`

**变更内容**：
```yaml
# ❌ 移除
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./apps/server/db:/docker-entrypoint-initdb.d  # ← 已移除

# ✅ 保留
volumes:
  - postgres_data:/var/lib/postgresql/data
```

**影响**：
- PostgreSQL 容器启动时**不再自动执行** `init.sql`
- 数据库完全由 Prisma 迁移系统管理

### 2. 备份旧文件

**操作**: 移动 `init.sql` 到备份目录

```bash
apps/server/db/
├── backup/
│   ├── init.sql           # ⚠️  已废弃（仅作参考）
│   └── update_menu_icons.sql  # ⚠️  已废弃
└── README.md              # ✅ 新的初始化指南
```

**原因**：
- 保留历史数据作为参考
- 避免误用旧的初始化脚本
- 确保数据源唯一性

---

## 🆕 新的初始化流程

### 流程对比

#### ❌ 旧流程（已废弃）

```
1. docker-compose up -d postgres
   ↓
2. Docker 自动执行 init.sql
   - 创建 25 个表
   - 插入 18 个表的数据
   ↓
3. Prisma migrate deploy
   - 检测到表已存在
   - 迁移历史混乱
   ↓
4. ❌ 数据不一致
```

#### ✅ 新流程（当前）

```
1. docker-compose up -d postgres
   ↓
2. npm run prisma:init
   - prisma migrate reset --force
     - 创建所有 48 个表
     - 建立迁移历史
   - ts-node prisma/seed.ts
     - 导入 18 个核心表数据
   - ts-node prisma/migration-seed.ts
     - 导入 8 个迁移表数据
   ↓
3. ✅ 数据库结构与 Schema 完全一致
```

### 新开发者设置流程

```bash
# 1. 启动 Docker 服务
docker-compose up -d postgres redis

# 2. 安装依赖
pnpm install

# 3. 初始化数据库（新步骤）
cd apps/server
npm run prisma:init

# 4. 启动应用
npm run dev
```

---

## 📊 影响分析

### 对现有用户的影响

#### 🟢 无影响（推荐操作）

如果你**已经**有完整的数据库（48个表 + 种子数据）：
- ✅ **无需任何操作**
- 现有的 `postgres_data` 卷不受影响
- 继续正常使用即可

#### 🟡 需要执行一次初始化

如果你是**新克隆项目**或**数据库损坏需要重置**：
- ⚠️ 需要运行 `npm run prisma:init`
- ⚠️ 首次启动需要额外 1-2 分钟

#### 🔴 需要手动迁移

如果你**一直使用 init.sql** 初始化：
- 🔴 需要备份重要数据
- 🔴 删除旧数据库（或创建新数据库）
- 🔴 使用 `npm run prisma:init` 重新初始化

---

## 🔧 常见场景处理

### 场景 1：全新环境

```bash
# 1. 启动 PostgreSQL
docker-compose up -d postgres

# 2. 初始化数据库
cd apps/server && npm run prisma:init

# ✅ 完成！数据库已就绪
```

### 场景 2：已有数据库需要升级

如果你已经有使用 init.sql 的数据库，需要迁移到新方案：

```bash
# 1. 备份现有数据
pg_dump $DATABASE_URL > backup_before_migration.sql

# 2. 删除旧数据库（或创建新库）
docker-compose down -v  # ⚠️ 会删除所有数据

# 3. 使用新方案初始化
docker-compose up -d postgres
cd apps/server && npm run prisma:init

# 4. 如果需要恢复数据，从备份导入
# psql $DATABASE_URL < backup_before_migration.sql
```

### 场景 3：CI/CD 环境

```yaml
# .github/workflows/test.yml
- name: Start PostgreSQL
  run: docker-compose up -d postgres

- name: Wait for PostgreSQL
  run: |
    docker-compose exec postgres pg_isready -U postgres -d nest_admin

- name: Initialize Database
  run: |
    cd apps/server
    npm run prisma:init

- name: Run Tests
  run: npm run test
```

### 场景 4：生产环境部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
pnpm install

# 3. 应用迁移（不重置！）
npm run prisma:deploy

# 4. 补充种子数据（如有必要）
npm run prisma:seed:migration

# 5. 重启服务
docker-compose up -d --force-recreate app
```

---

## 📁 文件变更清单

### 修改的文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `docker-compose-postgres-redis.yml` | 修改 | 移除 `./apps/server/db` 挂载 |
| `apps/server/db/init.sql` | 移动 | 移动到 `backup/` 目录 |
| `apps/server/db/update_menu_icons.sql` | 移动 | 移动到 `backup/` 目录 |

### 新增的文件

| 文件 | 用途 |
|------|------|
| `apps/server/prisma/db/README.md` | 数据库初始化指南 |
| `apps/server/prisma/migration-seed.ts` | 迁移表种子数据 |
| `apps/server/scripts/check-seed-coverage.js` | 种子覆盖率检查 |
| `apps/server/prisma/BEST_PRACTICES.md` | 最佳实践指南 |
| `apps/server/prisma/SEED_SOLUTION.md` | 快速入门指南 |
| `apps/server/prisma/FIX_SUMMARY.md` | 问题修复总结 |
| `apps/server/prisma/SOLUTION_SUMMARY.md` | 完整解决方案 |

### 更新的命令

| 命令 | 类型 | 说明 |
|------|------|------|
| `npm run prisma:init` | 新增 | 完整数据库初始化 |
| `npm run prisma:seed:migration` | 新增 | 迁移表种子数据 |
| `npm run prisma:check-seed` | 新增 | 检查种子覆盖率 |
| `npm run prisma:seed` | 更新 | 包含 migration-seed.ts |

---

## ⚠️ 重要注意事项

### 数据安全

1. **备份现有数据**
   ```bash
   # 备份所有数据库
   pg_dumpall -U postgres > full_backup.sql

   # 或备份单个数据库
   pg_dump -U postgres nest_admin > nest_admin_backup.sql
   ```

2. **测试新流程**
   - 在测试环境验证新方案
   - 确认数据完整性后再应用到生产

3. **回滚方案**
   - 如果需要回滚到旧方案：
   ```bash
   # 恢复 Docker Compose 配置
   git revert HEAD~1

   # 恢复 init.sql
   mv apps/server/db/backup/init.sql apps/server/db/

   # 重启 PostgreSQL
   docker-compose down -v
   docker-compose up -d postgres
   ```

### 团队协作

1. **通知团队成员**
   - 告知数据库初始化流程变更
   - 更新开发文档
   - 分享本指南

2. **更新文档**
   - README.md
   - CONTRIBUTING.md
   - 部署文档

3. **统一环境**
   - 确保所有开发人员使用相同的初始化流程
   - 避免 "在我的机器上是好的" 问题

---

## ✅ 验证步骤

### 验证新方案

```bash
# 1. 停止并删除旧数据
docker-compose down -v

# 2. 启动 PostgreSQL
docker-compose up -d postgres

# 3. 初始化数据库
cd apps/server && npm run prisma:init

# 4. 检查表数量
PGPASSWORD=postgres psql -h localhost -U postgres -d nest_admin -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
# 应该看到: 48 (或 49 包含 _prisma_migrations)

# 5. 检查种子数据
npm run prisma:check-seed
# 应该看到: ✅ 所有必需表都有数据

# 6. 测试接口
curl http://localhost:8080/api/v1/registerUser
# 应该返回: {"code":200,"data":true,...}
```

---

## 📚 参考文档

- **数据库初始化指南**: `apps/server/prisma/db/README.md`
- **Prisma 最佳实践**: `apps/server/prisma/BEST_PRACTICES.md`
- **种子数据方案**: `apps/server/prisma/SEED_SOLUTION.md`
- **问题修复总结**: `apps/server/prisma/FIX_SUMMARY.md`

---

## 🎓 关键要点

### 变更总结

| 项目 | 变更前 | 变更后 |
|------|--------|--------|
| **Docker 挂载** | `./apps/server/db:/docker-entrypoint-initdb.d` | ❌ 已移除 |
| **init.sql** | 自动执行 | 📦 已备份（仅参考） |
| **初始化方式** | Docker + SQL | **Prisma 迁移 + 种子脚本** |
| **表覆盖** | 18 个 | **48 个** |
| **数据源** | 双重（SQL + Schema） | **单一（Schema）** |
| **版本控制** | ❌ 无 | ✅ 完整 |
| **可回滚性** | ❌ 难 | ✅ 支持 |

### 必须记住

1. **不再自动执行 init.sql**
2. **使用 `npm run prisma:init` 初始化数据库**
3. **所有表结构由 Prisma Schema 管理**
4. **所有种子数据由 TypeScript 脚本管理**

---

**状态**: ✅ 已完成
**验证**: ✅ 数据库初始化正常
**文档**: ✅ 完整
**回滚**: ✅ 可行（见上方说明）

**最后更新**: 2026-08-05
