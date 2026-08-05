# Prisma 数据库管理最佳实践

## 📋 目录

1. [问题根源](#问题根源)
2. [推荐方案：统一使用 Prisma 迁移](#推荐方案统一使用-prisma-迁移)
3. [替代方案：保留 init.sql](#替代方案保留-initsql)
4. [自动化脚本](#自动化脚本)
5. [工作流程](#工作流程)
6. [常见问题](#常见问题)

---

## 问题根源

### 当前问题

本项目同时存在两种数据库初始化方式：

1. **`db/init.sql`** - 传统 SQL 脚本（25 个表）
2. **`prisma/migrations/`** - Prisma 迁移系统（45 个表）

导致：
- ❌ 种子数据不完整（仅 17 个表有种子数据）
- ❌ 新增表容易遗漏种子数据
- ❌ 双重维护成本
- ❌ 数据库状态不一致

### 缺失种子数据的表

以下表存在于 Prisma Schema 和迁移中，但**没有种子数据**：

```
GenDataSource, GenHistory, GenTemplate, GenTemplateGroup,
SysAuditLog, SysMailAccount, SysMailLog, SysMailTemplate,
SysNotifyMessage, SysNotifyTemplate,
SysOss, SysOssConfig,
SysSmsChannel, SysSmsLog, SysSmsTemplate,
SysSystemConfig,        ← 本次问题所在
SysTenantAuditLog,
SysTenantBilling, SysTenantBillingItem,
SysTenantFeature, SysTenantQuota, SysTenantQuotaLog, SysTenantUsage
```

---

## 推荐方案：统一使用 Prisma 迁移

### 适用场景

- ✅ 持续迭代的中大型项目
- ✅ 团队协作开发
- ✅ 需要版本控制数据库结构
- ✅ 需要多环境部署（dev/staging/prod）

### 实施步骤

#### 步骤 1：禁用 init.sql 初始化

```bash
# 备份旧的初始化脚本
mv db/init.sql db/init.sql.backup
mv prisma/convert-sql-to-seed.ts prisma/convert-sql-to-seed.ts.backup
```

#### 步骤 2：创建迁移种子数据脚本

创建 `prisma/migration-seed.ts`，为**所有迁移表**生成种子数据：

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始导入迁移表种子数据...');

  // ==================== 系统配置表 ====================
  await prisma.sysSystemConfig.createMany({
    data: [
      {
        configName: '注册用户',
        configKey: 'sys.account.registerUser',
        configValue: 'true',
        configType: 'Y',
        status: '0',
        delFlag: '0',
        createBy: 'system',
        remark: '是否开启注册用户功能',
      },
      {
        configName: '验证码开关',
        configKey: 'sys.account.captchaEnabled',
        configValue: 'true',
        configType: 'Y',
        status: '0',
        delFlag: '0',
        createBy: 'system',
        remark: '是否开启验证码',
      },
      // ... 其他配置
    ],
    skipDuplicates: true,
  });

  // ==================== 租户增强表 ====================
  await prisma.sysTenantFeature.createMany({
    data: [
      {
        tenantId: '000000',
        featureKey: 'sms.enabled',
        enabled: false,
        config: '{}',
        createBy: 'system',
      },
      {
        tenantId: '000000',
        featureKey: 'mail.enabled',
        enabled: false,
        config: '{}',
        createBy: 'system',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.sysTenantQuota.createMany({
    data: [
      {
        tenantId: '000000',
        userQuota: -1,      // 不限
        userUsed: 0,
        storageQuota: -1,   // 不限
        storageUsed: 0,
        apiQuota: -1,       // 不限
        apiUsed: 0,
      },
    ],
    skipDuplicates: true,
  });

  // ==================== OSS 配置表 ====================
  await prisma.sysOssConfig.createMany({
    data: [
      {
        tenantId: '000000',
        configKey: 'local',
        accessKey: 'local',
        secretKey: 'local',
        bucketName: 'local',
        endpoint: 'localhost',
        status: '1',
        delFlag: '0',
        createBy: 'system',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 短信管理表 ====================
  // 可根据需要添加默认渠道配置

  // ==================== 邮件管理表 ====================
  // 可根据需要添加默认账号配置

  // ==================== 站内信模板表 ====================
  await prisma.sysNotifyTemplate.createMany({
    data: [
      {
        code: 'system.welcome',
        name: '欢迎消息',
        nickname: '系统通知',
        content: '欢迎加入{{tenantName}}！',
        params: '["tenantName"]',
        type: 1,
        status: '1',
        delFlag: '0',
        createBy: 'system',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 审计日志表 ====================
  // 审计日志通常不预置数据，由系统自动生成

  // ==================== 代码生成器表 ====================
  await prisma.genTemplateGroup.createMany({
    data: [
      {
        tenantId: null,  // 系统级
        name: '默认模板组',
        description: '系统默认代码生成模板组',
        isDefault: true,
        status: '1',
        delFlag: '0',
        createBy: 'system',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ 迁移表种子数据导入完成!');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据导入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

#### 步骤 3：更新 package.json 脚本

```json
{
  "scripts": {
    "prisma:init": "prisma migrate reset --force && npm run prisma:seed:migration",
    "prisma:seed": "prisma db push --force-reset --accept-data-loss && ts-node prisma/seed.ts && ts-node prisma/migration-seed.ts",
    "prisma:seed:migration": "ts-node prisma/migration-seed.ts",
    "prisma:seed:all": "npm run prisma:seed:only && npm run prisma:seed:migration"
  }
}
```

#### 步骤 4：创建完整的种子数据管理脚本

创建 `scripts/db-bootstrap.js`：

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始数据库初始化...');

// 1. 检查环境
const env = process.env.NODE_ENV || 'development';
console.log(`📝 环境: ${env}`);

if (env === 'production') {
  console.warn('⚠️  生产环境！确认要重置数据库吗？');
  // 生产环境应该使用 migrate deploy，而不是 reset
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  execSync('ts-node prisma/migration-seed.ts', { stdio: 'inherit' });
  process.exit(0);
}

// 2. 开发/测试环境：完整重置
try {
  // 2.1 重置数据库（应用所有迁移）
  console.log('📦 应用数据库迁移...');
  execSync('npx prisma migrate reset --force', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', 'apps', 'server'),
  });

  // 2.2 运行核心表种子数据
  console.log('🌱 导入核心表种子数据...');
  execSync('ts-node prisma/seed.ts', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', 'apps', 'server'),
  });

  // 2.3 运行迁移表种子数据
  console.log('🌱 导入迁移表种子数据...');
  execSync('ts-node prisma/migration-seed.ts', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', 'apps', 'server'),
  });

  // 2.4 生成 Prisma Client
  console.log('🔧 生成 Prisma Client...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', 'apps', 'server'),
  });

  console.log('✅ 数据库初始化完成！');
} catch (error) {
  console.error('❌ 数据库初始化失败:', error.message);
  process.exit(1);
}
```

---

## 替代方案：保留 init.sql

如果仍需保留 `init.sql`（如用于快速部署），则：

### 3.1 更新 convert-sql-to-seed.ts

增强转换脚本，使其能够：

1. **合并迁移 SQL 文件**
2. **生成完整的种子数据**

创建 `scripts/generate-full-seed.js`：

```javascript
const fs = require('fs');
const path = require('path');

// 读取所有迁移文件
const migrationDir = path.join(__dirname, '..', 'apps', 'server', 'prisma', 'migrations');
const migrationFiles = fs.readdirSync(migrationDir)
  .filter(f => fs.statSync(path.join(migrationDir, f)).isDirectory())
  .sort()
  .flatMap(dir => {
    const sqlFile = path.join(migrationDir, dir, 'migration.sql');
    return fs.existsSync(sqlFile) ? [{ dir, content: fs.readFileSync(sqlFile, 'utf-8') }] : [];
  });

console.log(`找到 ${migrationFiles.length} 个迁移文件`);

// 提取所有 INSERT 语句
const allInserts = [];
for (const { dir, content } of migrationFiles) {
  const inserts = extractInserts(content);
  console.log(`${dir}: ${inserts.length} 条 INSERT`);
  allInserts.push(...inserts.map(sql => ({ migration: dir, sql })));
}

// 生成种子数据脚本
generateSeedScript(allInserts);
```

### 3.2 维护映射表

在 `convert-sql-to-seed.ts` 中添加所有表的映射：

```typescript
const tableToModelMap: Record<string, string> = {
  // init.sql 表
  sys_tenant: 'sysTenant',
  sys_tenant_package: 'sysTenantPackage',
  // ... 其他表
  
  // 迁移添加的表
  gen_data_source: 'genDataSource',
  gen_template_group: 'genTemplateGroup',
  gen_template: 'genTemplate',
  gen_history: 'genHistory',
  sys_system_config: 'sysSystemConfig',  // ← 添加这个
  sys_tenant_feature: 'sysTenantFeature',
  sys_tenant_quota: 'sysTenantQuota',
  sys_tenant_billing: 'sysTenantBilling',
  sys_audit_log: 'sysAuditLog',
  sys_mail_account: 'sysMailAccount',
  sys_sms_channel: 'sysSmsChannel',
  // ... 所有其他表
};
```

---

## 自动化脚本

### 4.1 种子数据完整性检查脚本

创建 `scripts/check-seed-coverage.js`：

```javascript
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function checkSeedCoverage() {
  const prisma = new PrismaClient();
  
  // 1. 从 schema.prisma 提取所有模型
  const schemaContent = fs.readFileSync(
    path.join(__dirname, '..', 'apps', 'server', 'prisma', 'schema.prisma'),
    'utf-8'
  );
  
  const models = [];
  const modelRegex = /^model (\w+)\s*\{/gm;
  let match;
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    models.push(match[1]);
  }
  
  console.log(`Schema 中共有 ${models.length} 个模型`);
  
  // 2. 检查每个表的数据量
  const results = [];
  for (const model of models) {
    try {
      const count = await prisma[model].count();
      results.push({ model, count });
    } catch (error) {
      results.push({ model, count: -1, error: error.message });
    }
  }
  
  // 3. 输出结果
  console.log('\n=== 数据覆盖情况 ===\n');
  const empty = results.filter(r => r.count === 0);
  const error = results.filter(r => r.count === -1);
  const ok = results.filter(r => r.count > 0);
  
  console.log(`✅ 有数据: ${ok.length} 个表`);
  console.log(`⚠️  无数据: ${empty.length} 个表`);
  console.log(`❌ 出错: ${error.length} 个表`);
  
  if (empty.length > 0) {
    console.log('\n无数据的表:');
    empty.forEach(r => console.log(`  - ${r.model}`));
  }
  
  if (error.length > 0) {
    console.log('\n出错的表:');
    error.forEach(r => console.log(`  - ${r.model}: ${r.error}`));
  }
  
  await prisma.$disconnect();
  process.exit(empty.length > 0 || error.length > 0 ? 1 : 0);
}

checkSeedCoverage().catch(console.error);
```

### 4.2 集成到 CI/CD

在 `.github/workflows/ci.yml` 或类似配置中添加：

```yaml
- name: 检查种子数据完整性
  run: node scripts/check-seed-coverage.js
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

- name: 数据库迁移测试
  run: |
    npx prisma migrate reset --force --skip-seed
    npm run prisma:seed:migration
```

---

## 工作流程

### 开发流程（新方案）

```bash
# 1. 修改 Prisma Schema
# 编辑 prisma/schema.prisma

# 2. 创建迁移
npm run prisma:migrate

# 3. 如果需要种子数据，更新 migration-seed.ts
# 编辑 prisma/migration-seed.ts

# 4. 完整初始化（第一次或重置）
npm run prisma:init

# 5. 仅运行迁移表种子数据
npm run prisma:seed:migration
```

### 新增表的标准流程

```bash
# 1. 在 schema.prisma 中添加模型
# 2. 创建迁移
npm run prisma:migrate -- --name add_new_table

# 3. 在 migration-seed.ts 中添加种子数据
# 4. 仅运行迁移表种子
npm run prisma:seed:migration

# 5. 提交代码
git add prisma/
git commit -m "feat: add new_table with seed data"
```

### 部署流程

```bash
# 开发/测试环境
npm run prisma:init

# 生产环境（安全）
npm run prisma:deploy      # 只应用迁移，不重置
npm run prisma:seed:migration  # 确保种子数据存在
```

---

## 常见问题

### Q1: 为什么不用 db push？

**A:** `db push` 适合原型开发，但**不适合团队协作或生产环境**，因为它：
- ❌ 无法跟踪迁移历史
- ❌ 可能丢失数据
- ❌ 无法回滚

**推荐：** 使用 `prisma migrate` 进行版本控制。

### Q2: 如何在不重置数据库的情况下添加种子数据？

**A:** 使用 `skipDuplicates: true` 和幂等性设计：

```typescript
await prisma.sysSystemConfig.createMany({
  data: [...],
  skipDuplicates: true,  // 不会覆盖现有数据
});
```

### Q3: 生产环境如何安全地运行种子数据？

**A:** 生产环境建议：

```bash
# 1. 先部署迁移
npm run prisma:deploy

# 2. 使用 --skip-seed 避免覆盖数据
npm run prisma:seed:migration

# 3. 或者在种子脚本中添加检查逻辑
const count = await prisma.sysSystemConfig.count();
if (count === 0) {
  await prisma.sysSystemConfig.createMany({...});
}
```

### Q4: 如何处理种子数据的版本管理？

**A:** 两种策略：

**策略 A：迁移文件附带种子数据**（推荐）
- 每次迁移后更新 `migration-seed.ts`
- 使用 `skipDuplicates: true` 确保幂等性

**策略 B：版本化的种子数据文件**
```
prisma/
  seeds/
    v1/
      sys_system_config.ts
      sys_tenant_quota.ts
    v2/
      sys_oss_config.ts
```

### Q5: 如果忘记添加种子数据怎么办？

**A:** 使用我们的检查脚本：

```bash
npm run db:check-seed  # 检查哪些表没有数据
npm run prisma:seed:migration  # 补充种子数据
```

---

## 总结

### 关键原则

1. **单一数据源**：只使用 Prisma 迁移，废弃 init.sql
2. **完整覆盖**：所有表都要有种子数据
3. **自动化**：通过脚本检查和补充种子数据
4. **幂等性**：种子数据脚本可以重复执行
5. **版本控制**：所有数据库变更都通过迁移管理

### 迁移成本

- ⏱️ **一次性工作**：整理所有缺失的种子数据（1-2小时）
- ✅ **长期收益**：避免未来的数据完整性问题
- ✅ **团队协作**：统一数据库管理流程
- ✅ **部署安全**：减少生产环境意外

---

## 附录：完整脚本清单

```
prisma/
├── seed.ts                    # 核心表种子数据（从 init.sql 生成）
├── migration-seed.ts          # 迁移表种子数据（需手动维护）✨ 新增
└── convert-sql-to-seed.ts     # SQL 转种子脚本（可选保留）

scripts/
├── db-bootstrap.js           # 完整数据库初始化 ✨ 新增
├── check-seed-coverage.js    # 种子数据覆盖率检查 ✨ 新增
└── generate-migration-seed.js # 自动生成迁移种子数据 ✨ 新增

package.json:
├── prisma:init               # 完整初始化
├── prisma:seed:migration      # 迁移表种子
└── db:check-seed             # 检查覆盖率
```
