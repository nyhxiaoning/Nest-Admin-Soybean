/**
 * Migration Tables Seed Data
 *
 * 为通过迁移添加的表提供种子数据
 * 这些表不存在于 init.sql 中，需要单独维护
 *
 * 运行方式:
 * - npx ts-node prisma/migration-seed.ts
 * - npm run prisma:seed:migration
 *
 * 特性:
 * - 使用 skipDuplicates: true 支持幂等性
 * - 可以安全地重复执行
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始导入迁移表种子数据...\n');

  // ==================== 系统配置表（全局，无租户隔离）====================
  console.log('📝 导入系统配置...');
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
        updateBy: 'system',
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
        updateBy: 'system',
        remark: '是否开启验证码',
      },
      {
        configName: '密码最小长度',
        configKey: 'sys.account.password.minLength',
        configValue: '6',
        configType: 'Y',
        status: '0',
        delFlag: '0',
        createBy: 'system',
        updateBy: 'system',
        remark: '用户密码最小长度',
      },
      {
        configName: '密码最大长度',
        configKey: 'sys.account.password.maxLength',
        configValue: '20',
        configType: 'Y',
        status: '0',
        delFlag: '0',
        createBy: 'system',
        updateBy: 'system',
        remark: '用户密码最大长度',
      },
      {
        configName: '用户初始密码',
        configKey: 'sys.account.initialPassword',
        configValue: '123456',
        configType: 'Y',
        status: '0',
        delFlag: '0',
        createBy: 'system',
        updateBy: 'system',
        remark: '用户初始密码',
      },
      {
        configName: '头像上传大小限制(MB)',
        configKey: 'sys.user.avatar.maxSize',
        configValue: '10',
        configType: 'Y',
        status: '0',
        delFlag: '0',
        createBy: 'system',
        updateBy: 'system',
        remark: '用户头像上传大小限制（MB）',
      },
      {
        configName: '开启注册邮件验证',
        configKey: 'sys.account.registerEmailVerify',
        configValue: 'false',
        configType: 'Y',
        status: '0',
        delFlag: '0',
        createBy: 'system',
        updateBy: 'system',
        remark: '注册时是否需要邮件验证',
      },
      {
        configName: '开启注册短信验证',
        configKey: 'sys.account.registerSmsVerify',
        configValue: 'false',
        configType: 'Y',
        status: '0',
        delFlag: '0',
        createBy: 'system',
        updateBy: 'system',
        remark: '注册时是否需要短信验证',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 租户功能开关表 ====================
  console.log('📝 导入租户功能开关...');
  await prisma.sysTenantFeature.createMany({
    data: [
      {
        tenantId: '000000',
        featureKey: 'sms.enabled',
        enabled: false,
        config: '{}',
        createBy: 'system',
        updateBy: 'system',
      },
      {
        tenantId: '000000',
        featureKey: 'mail.enabled',
        enabled: false,
        config: '{}',
        createBy: 'system',
        updateBy: 'system',
      },
      {
        tenantId: '000000',
        featureKey: 'notify.enabled',
        enabled: true,
        config: '{}',
        createBy: 'system',
        updateBy: 'system',
      },
      {
        tenantId: '000000',
        featureKey: 'oss.enabled',
        enabled: true,
        config: '{}',
        createBy: 'system',
        updateBy: 'system',
      },
      {
        tenantId: '000000',
        featureKey: 'codegen.enabled',
        enabled: true,
        config: '{}',
        createBy: 'system',
        updateBy: 'system',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 租户配额表 ====================
  console.log('📝 导入租户配额...');
  await prisma.sysTenantQuota.createMany({
    data: [
      {
        tenantId: '000000',
        userQuota: -1, // -1 表示无限制
        userUsed: 0,
        storageQuota: -1, // -1 表示无限制
        storageUsed: 0,
        apiQuota: -1, // -1 表示无限制
        apiUsed: 0,
      },
    ],
    skipDuplicates: true,
  });

  // ==================== OSS 配置表 ====================
  console.log('📝 导入 OSS 配置...');
  await prisma.sysOssConfig.createMany({
    data: [
      {
        tenantId: '000000',
        configKey: 'local',
        accessKey: 'local',
        secretKey: 'local',
        bucketName: 'local',
        endpoint: 'localhost:8080',
        status: '1',
        delFlag: '0',
        createBy: 'system',
        updateBy: 'system',
        remark: '本地存储配置',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 站内信模板表 ====================
  console.log('📝 导入站内信模板...');
  await prisma.sysNotifyTemplate.createMany({
    data: [
      {
        code: 'system.welcome',
        name: '欢迎消息',
        nickname: '系统通知',
        content: '欢迎加入{{tenantName}}！您的账户已成功创建。',
        params: '["tenantName"]',
        type: 1,
        status: '1',
        delFlag: '0',
        createBy: 'system',
        remark: '新用户欢迎消息',
      },
      {
        code: 'system.password.reset',
        name: '密码重置',
        nickname: '系统通知',
        content: '您的密码已重置，新密码为：{{newPassword}}',
        params: '["newPassword"]',
        type: 2,
        status: '1',
        delFlag: '0',
        createBy: 'system',
        remark: '密码重置通知',
      },
      {
        code: 'system.role.changed',
        name: '角色变更',
        nickname: '系统通知',
        content: '您的角色已变更为：{{roleName}}',
        params: '["roleName"]',
        type: 2,
        status: '1',
        delFlag: '0',
        createBy: 'system',
        remark: '角色变更通知',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 代码生成器模板组 ====================
  console.log('📝 导入代码生成器模板组...');
  await prisma.genTemplateGroup.createMany({
    data: [
      {
        tenantId: null, // null 表示系统级
        name: '默认模板组',
        description: '系统默认代码生成模板组，包含基础CRUD模板',
        isDefault: true,
        status: '1',
        delFlag: '0',
        createBy: 'system',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 短信渠道表（可选）====================
  console.log('📝 导入短信渠道配置...');
  await prisma.sysSmsChannel.createMany({
    data: [
      {
        code: 'aliyun',
        name: '阿里云短信',
        signature: '',
        apiKey: '',
        apiSecret: '',
        status: '0', // 默认禁用
        delFlag: '0',
        createBy: 'system',
        remark: '阿里云短信服务，需要手动配置',
      },
      {
        code: 'tencent',
        name: '腾讯云短信',
        signature: '',
        apiKey: '',
        apiSecret: '',
        status: '0', // 默认禁用
        delFlag: '0',
        createBy: 'system',
        remark: '腾讯云短信服务，需要手动配置',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 邮件账号表（可选）====================
  console.log('📝 导入邮件账号配置...');
  await prisma.sysMailAccount.createMany({
    data: [
      {
        mail: '',
        username: '',
        password: '',
        host: 'smtp.example.com',
        port: 465,
        sslEnable: true,
        status: '0', // 默认禁用
        delFlag: '0',
        createBy: 'system',
        remark: '默认邮件账号，需要手动配置',
      },
    ],
    skipDuplicates: true,
  });

  // ==================== 审计日志表 ====================
  // 审计日志通常不预置数据，由系统自动生成

  // ==================== 租户账单相关表 ====================
  // 账单数据由业务逻辑生成，不预置

  // ==================== 租户使用统计表 ====================
  // 统计数据由系统自动生成

  console.log('\n✅ 迁移表种子数据导入完成!');
  console.log('💡 提示: 可以使用 npm run prisma:seed:migration 随时重新运行');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据导入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
