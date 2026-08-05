# Prisma 数据库种子数据完整解决方案

## 🎯 问题回顾

### 原始问题
- `sys_system_config` 表不存在导致接口报错
- 数据库中缺失 20+ 个表
- 种子数据不完整

### 根本原因
1. **双重数据源冲突**：`init.sql`（25表） vs Prisma Schema（45表）
2. **种子数据脚本覆盖不全**：`convert-sql-to-seed.ts` 仅处理 17 个核心表
3. **迁移添加的表无种子数据**：新功能开发后遗漏补充

---

## ✅ 解决方案总览

### 架构设计

```
┌─────────────────────────────────────────────────────┐
│                  Prisma Schema                        │
│               (prisma/schema.prisma)                  │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
┌───────▼──────┐   ┌────────▼──────────┐
│   Migrations  │   │   Seed Scripts     │
│ (11 migration │   │                    │
│    files)     │   │ seed.ts            │
└───────┬───────┘   │ (核心表种子数据)    │
        │           └────────┬───────────┘
        │                    │
┌───────▼────────────────────▼───────────┐
│            PostgreSQL Database           │
│  ┌──────────────────────────────────┐  │
│  │ 25 core tables (init.sql)        │← │
│  │ 20 migration tables              │  │
│  │ ──────────────────────────────── │  │
│  │ ✅ seed.ts       (17 tables)     │  │
│  │ ✅ migration-seed.ts (8 tables)  │← │ NEW!
│  │ ⚠️  gen_* (手动配置)              │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 文件结构

```
apps/server/
├── prisma/
│   ├── schema.prisma              # 数据模型定义（唯一数据源）
│   ├── seed.ts                    # 核心表种子数据（已存在）
│   ├── migration-seed.ts          # 迁移表种子数据 ✨ 新增
│   ├── convert-sql-to-seed.ts     # SQL转换脚本（保留用于参考）
│   └── BEST_PRACTICES.md          # 最佳实践文档 ✨ 新增
└── scripts/
    ├── check-seed-coverage.js     # 种子覆盖率检查 ✨ 新增
    └── db-bootstrap.js            # 数据库快速启动 ✨ 新增

package.json (已更新)
├── npm run prisma:init            # 完整初始化
├── npm run prisma:seed:migration   # 迁移表种子
└── npm run prisma:check-seed       # 检查覆盖率
```

---

## 🚀 快速开始

### 场景 1: 全新开发环境

```bash
cd apps/server

# 一键完整初始化（推荐）
npm run prisma:init
```

这会执行：
1. ✅ `prisma migrate reset` - 重置数据库并应用所有迁移
2. ✅ `prisma seed:only` - 导入核心表种子数据（从 init.sql 生成）
3. ✅ `prisma seed:migration` - 导入迁移表种子数据（新建的 migration-seed.ts）

### 场景 2: 开发中新增表

```bash
# 1. 修改 schema.prisma，添加新模型
# 编辑 prisma/schema.prisma

# 2. 创建迁移
npm run prisma:migrate -- --name add_my_new_table

# 3. 在 migration-seed.ts 中添加种子数据
# 编辑 prisma/migration-seed.ts

# 4. 仅运行迁移表种子（不影响其他数据）
npm run prisma:seed:migration

# 5. 提交代码
git add prisma/
git commit -m "feat: add my_new_table with seed data"
```

### 场景 3: 检查种子数据完整性

```bash
# 检查哪些表缺少种子数据
npm run prisma:check-seed

# 输出示例:
# ❌ 必需表（缺少种子数据）:
#    SysSystemConfig                0 records
#
# ✅ 有数据的表:
#    SysUser                        3 records
#    SysRole                        3 records
#    ...
#
# 💡 解决方案:
#   运行 npm run prisma:seed:migration 补充种子数据
```

### 场景 4: 生产环境部署

```bash
# 1. 应用迁移（不重置！）
npm run prisma:deploy

# 2. 补充种子数据（幂等性，不会覆盖）
npm run prisma:seed:migration

# 3. 验证
npm run prisma:check-seed
```

---

## 📝 种子数据维护指南

### 核心原则

1. **幂等性**：种子脚本必须可以安全重复执行
   ```typescript
   skipDuplicates: true  // 使用此选项
   ```

2. **按表分类**：
   - `seed.ts` - 核心基础表（用户、角色、菜单等）
   - `migration-seed.ts` - 新增功能表（配置、模板等）

3. **默认值合理**：
   - 功能开关默认 `enabled: false`
   - 配额默认 `-1`（无限制）
   - 状态默认 `status: '0'`（正常）

### 新增表的流程

```
1. 修改 schema.prisma
         ↓
2. npm run prisma:migrate
         ↓
3. 在 migration-seed.ts 添加种子数据
         ↓
4. npm run prisma:seed:migration
         ↓
5. 验证 npm run prisma:check-seed
         ↓
6. git commit
```

---

## 🛡️ 常见问题

### Q1: 为什么有两个种子文件？

**A:** 历史原因导致的分离：
- `seed.ts` - 从 `init.sql` 生成，包含最核心的基础数据
- `migration-seed.ts` - 新迁移添加的表，手动维护

未来可以考虑合并为一个文件。

### Q2: 如何知道哪些表需要种子数据？

**A:** 运行检查脚本：
```bash
npm run prisma:check-seed
```

或者查看文档：
```bash
cat prisma/BEST_PRACTICES.md
```

### Q3: 可以删除 init.sql 吗？

**A:** **建议删除或移走**，原因：
- ✅ 避免混淆（新旧数据源）
- ✅ 防止误用（`db push` 会忽略迁移）
- ✅ 降低维护成本

如果需要保留，移动到 `backup/` 目录。

### Q4: 如何回滚迁移？

**A:** Prisma 迁移不支持自动回滚，需要手动：

```bash
# 1. 查看迁移历史
npx prisma migrate status

# 2. 手动编写回滚 SQL
# prisma/migrations/20260116100000_add_code_generator_menus/migration.sql

# 3. 标记为已回滚
npx prisma migrate resolve --rolled-back 20260116100000_add_code_generator_menus
```

### Q5: 生产环境如何安全更新种子数据？

**A:** 使用条件判断避免覆盖：

```typescript
// 仅当无数据时才插入
const count = await prisma.sysSystemConfig.count();
if (count === 0) {
  await prisma.sysSystemConfig.createMany({ data: [...] });
}

// 或者使用 upsert（更安全）
await prisma.sysSystemConfig.upsert({
  where: { configKey: 'sys.account.registerUser' },
  update: { configValue: 'true' },
  create: { configKey: 'sys.account.registerUser', ... },
});
```

---

## 📚 参考资源

### 文档
- [Prisma 官方文档](https://www.prisma.io/docs)
- [Prisma 迁移指南](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [种子数据最佳实践](https://www.prisma.io/docs/guides/database/seed-database)

### 项目文档
- `prisma/BEST_PRACTICES.md` - 完整的最佳实践指南
- `prisma/SEED_README.md` - 种子数据说明
- `prisma/migration-seed.ts` - 迁移表种子数据示例

---

## 🎓 核心要点总结

### 问题根源
1. ✅ 同时使用 `init.sql` 和 Prisma 迁移 → 数据源冲突
2. ✅ 种子脚本覆盖不全 → 新表无种子数据
3. ✅ 无检查机制 → 问题发现不及时

### 解决方案
1. ✅ **统一使用 Prisma 迁移** - 废弃 init.sql 作为初始化方式
2. ✅ **分离种子数据** - `seed.ts` + `migration-seed.ts`
3. ✅ **自动化检查** - `npm run prisma:check-seed`
4. ✅ **完整文档** - `BEST_PRACTICES.md`

### 关键命令
```bash
npm run prisma:init         # 完整初始化（开发环境）
npm run prisma:seed:migration # 补充迁移表种子
npm run prisma:check-seed     # 检查覆盖率
npm run prisma:deploy         # 生产环境部署
```

---

## 📞 需要帮助？

如果遇到以下情况，请查看 `prisma/BEST_PRACTICES.md`：
- 新增表时如何添加种子数据
- 生产环境如何安全更新
- 如何处理种子数据版本管理
- 如何回滚迁移

---

**最后更新:** 2026-08-05
**维护者:** Nest-Admin-Soybean Team
