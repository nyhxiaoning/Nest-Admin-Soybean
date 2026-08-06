#!/usr/bin/env node

/**
 * Prisma Seed Coverage Checker
 *
 * 检查数据库中每个表的数据覆盖率
 * 帮助发现缺失种子数据的表
 *
 * 用法:
 *   node scripts/check-seed-coverage.js
 *   npm run prisma:check-seed
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// 核心表种子数据要求（必须要有数据）
const REQUIRED_SEEDS = [
  'SysUser',
  'SysRole',
  'SysMenu',
  'SysDept',
  'SysPost',
  'SysDictType',
  'SysDictData',
  'SysClient',
  'SysConfig',
  'SysSystemConfig',
  'SysTenant',
  'SysTenantPackage',
];

// 可选种子数据（建议有，但不是必须）
const OPTIONAL_SEEDS = [
  'SysNotice',
  'SysLogininfor',
  'SysJob',
  'SysNotifyTemplate',
  'SysOssConfig',
  'SysTenantQuota',
  'SysTenantFeature',
  'GenTemplateGroup',
];

// 不需要种子数据的表（日志、审计等）
const SKIP_TABLES = [
  'SysJobLog',
  'SysOperLog',
  'SysLogininfor',
  'SysMailLog',
  'SysSmsLog',
  'SysNotifyMessage',
  'SysTenantAuditLog',
  'SysTenantBilling',
  'SysTenantBillingItem',
  'SysTenantUsage',
  'SysTenantQuotaLog',
  'GenHistory',
  'SysUpload',
  'SysFileShare',
  'SysFileFolder',
];

async function getModelCounts() {
  const counts = {};

  // 从 schema.prisma 提取所有模型名
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  const modelRegex = /^model\s+(\w+)\s*\{/gm;
  let match;

  const models = [];
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    models.push(match[1]);
  }

  // 查询每个表的数据量
  for (const model of models) {
    try {
      const count = await prisma[model].count();
      counts[model] = count;
    } catch (error) {
      counts[model] = { error: error.message };
    }
  }

  return counts;
}

function categorizeModel(model, count) {
  if (SKIP_TABLES.includes(model)) {
    return { category: 'skip', status: 'info' };
  }

  if (REQUIRED_SEEDS.includes(model)) {
    if (count > 0) {
      return { category: 'required', status: 'ok' };
    }
    return { category: 'required', status: 'error' };
  }

  if (OPTIONAL_SEEDS.includes(model)) {
    if (count > 0) {
      return { category: 'optional', status: 'ok' };
    }
    return { category: 'optional', status: 'warn' };
  }

  // 未分类的模型
  if (count > 0) {
    return { category: 'unknown', status: 'ok' };
  }
  return { category: 'unknown', status: 'warn' };
}

function printResults(counts) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 Prisma Seed Coverage Report');
  console.log('='.repeat(70) + '\n');

  const categories = {
    error: [],
    warn: [],
    ok: [],
    info: [],
  };

  for (const [model, count] of Object.entries(counts)) {
    if (typeof count === 'object' && count.error) {
      categories.error.push({ model, count: -1, error: count.error });
    } else {
      const { category, status } = categorizeModel(model, count);
      categories[status].push({ model, count, category });
    }
  }

  // 错误（必需但无数据）
  if (categories.error.length > 0) {
    console.log('❌ 必需表（缺少种子数据）:\n');
    categories.error.forEach(({ model, count, error }) => {
      console.log(`   ${model.padEnd(30)} ${error ? 'ERROR' : '0 records'}`);
    });
    console.log('');
  }

  // 警告（建议有数据但为空）
  if (categories.warn.length > 0) {
    console.log('⚠️  可选表（建议添加种子数据）:\n');
    categories.warn.forEach(({ model, count }) => {
      console.log(`   ${model.padEnd(30)} 0 records`);
    });
    console.log('');
  }

  // 正常
  if (categories.ok.length > 0) {
    console.log('✅ 有数据的表:\n');
    categories.ok.forEach(({ model, count, category }) => {
      const tag = category === 'required' ? '[必需]' : category === 'optional' ? '[可选]' : '[未分类]';
      console.log(`   ${model.padEnd(30)} ${String(count).padStart(5)} records  ${tag}`);
    });
    console.log('');
  }

  // 信息（跳过的表）
  if (categories.info.length > 0) {
    console.log('ℹ️  系统自动生成的表（跳过检查）:\n');
    categories.info.forEach(({ model, count }) => {
      console.log(`   ${model.padEnd(30)} ${typeof count === 'number' ? count : 'N/A'} records`);
    });
    console.log('');
  }

  // 统计摘要
  const total = Object.keys(counts).length;
  const withData = Object.values(counts).filter(c => typeof c === 'number' && c > 0).length;
  const missing = categories.error.length + categories.warn.length;

  console.log('='.repeat(70));
  console.log('📈 统计摘要:');
  console.log('='.repeat(70));
  console.log(`   总表数:      ${total}`);
  console.log(`   ✅ 有数据:   ${withData}`);
  console.log(`   ⚠️  缺失:     ${missing}`);
  console.log(`   ❌ 必需缺失: ${categories.error.length}`);
  console.log(`   ℹ️  跳过:     ${categories.info.length}`);
  console.log('='.repeat(70));

  if (categories.error.length > 0) {
    console.log('\n💡 解决方案:');
    console.log('   运行 npm run prisma:seed:migration 补充种子数据\n');
    return 1;
  }

  if (categories.warn.length > 0) {
    console.log('\n💡 提示: 部分可选表为空，建议添加种子数据以获得更好的开发体验\n');
    return 0;
  }

  console.log('\n🎉 所有种子数据完整！\n');
  return 0;
}

async function main() {
  try {
    console.log('🔍 正在检查种子数据覆盖率...\n');
    const counts = await getModelCounts();
    const exitCode = printResults(counts);
    await prisma.$disconnect();
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ 检查失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
