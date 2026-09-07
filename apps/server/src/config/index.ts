/**
 * 类型安全的配置加载器
 * 使用强类型配置类和验证装饰器确保配置正确性
 *
 * @description
 * - 环境变量是单一数据源
 * - 所有配置项都经过类型验证
 * - 支持嵌套配置对象验证
 * - 生产环境自动隐藏敏感信息
 *
 * @see src/config/types/* 查看具体配置类定义
 */

import { ConfigTransformer } from './config.transformer';
import { Logger } from '@nestjs/common';

const logger = new Logger('Configuration');
const env = process.env.NODE_ENV || 'development';

/**
 * 辅助函数：布尔值转换
 */
const bool = (val: string | undefined, fallback: boolean): boolean => {
  if (val === undefined) return fallback;
  return val === 'true' || val === '1';
};

/**
 * 辅助函数：数字转换
 */
const num = (val: string | undefined, fallback: number): number => {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * 辅助函数：JSON 转换,
 * 如果解析失败，返回默认值，并记录警告日志
 * @param val JSON 字符串
 * @param fallback 默认值
 * @returns 解析后的对象或默认值
 */
const json = <T>(val: string | undefined, fallback: T): T => {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch (e) {
    logger.warn(`JSON parse failed for value: ${val}, using fallback`);
    return fallback;
  }
};

/**
 * 默认路由白名单
 */
const defaultWhitelist = [
  { path: '/captchaImage', method: 'GET' },
  { path: '/login', method: 'POST' },
  { path: '/logout', method: 'POST' },
  { path: '/getInfo', method: 'GET' },
];

/**
 * 配置工厂函数
 * 构建完整的应用配置对象
 */
export default () => {
  const rawConfig = {
    app: {
      env,
      // 应用前缀，所有路由都会加上这个前缀，默认 /api
      prefix: process.env.APP_PREFIX || '/api',
      // 应用端口，默认 8080
      port: num(process.env.APP_PORT, 8080),
      // 日志配置
      logger: {
        // 日志目录，生产环境默认使用Docker部署 /var/log/nest-admin-soybean，开发环境使用 ../logs
        dir: process.env.LOG_DIR || (env === 'production' ? '/var/log/nest-admin-soybean' : '../logs'),
        // 日志级别，生产环境默认 info，开发环境默认 debug
        // > Nest 传统默认常量：`log`，**不是 info**；新版文档很多人口语习惯把 `log` 叫成 info。
        // Nest 自带 `Logger` 一共有 **6 个日志等级，优先级从高→低**：error > warn > log > info > debug > verbose
        level: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
        // 是否启用日志美化输出，生产环境默认关闭，开发环境默认开启
        prettyPrint: bool(process.env.LOG_PRETTY_PRINT, env === 'development'),
        // 是否将日志输出到文件，生产环境默认开启，开发环境默认关闭
        toFile: bool(process.env.LOG_TO_FILE, env === 'production'),
        // 日志文件名，生产环境默认使用 nest-admin-soybean.log，开发环境使用 nest-admin-soybean-dev.log
        filename: process.env.LOG_FILENAME || (env === 'production' ? 'nest-admin-soybean.log' : 'nest-admin-soybean-dev.log'),
        // 日志文件最大大小，单位 MB，默认 10MB
        maxSize: num(process.env.LOG_MAX_SIZE, 10),
        // 日志文件最大数量，默认 5 个
        maxFiles: num(process.env.LOG_MAX_FILES, 5),
        // 日志排除路径，支持通配符，默认 ['/health', '/metrics', '/api-docs', '/favicon.ico']
        excludePaths: json(process.env.LOG_EXCLUDE_PATHS, ['/health', '/metrics', '/api-docs', '/favicon.ico']),
        // 日志敏感字段，默认 ['password', 'passwd', 'pwd', 'token', 'accessToken', 'refreshToken', 'access_token', 'refresh_token',
        // 'authorization', 'cookie', 'secret', 'secretKey', 'apiKey', 'api_key']，生产环境默认隐藏这些字段的值，开发环境默认显示
        sensitiveFields: json(process.env.LOG_SENSITIVE_FIELDS, [
          'password',
          'passwd',
          'pwd',
          'token',
          'accessToken',
          'refreshToken',
          'access_token',
          'refresh_token',
          'authorization',
          'cookie',
          'secret',
          'secretKey',
          'apiKey',
          'api_key',
        ]),
      },
      file: {
        // 文件上传配置
        isLocal: bool(process.env.FILE_IS_LOCAL, env !== 'production'),
        // 文件存储位置，生产环境默认使用 /data/upload，开发环境使用 ../upload
        location: process.env.FILE_UPLOAD_LOCATION || (env === 'production' ? '/data/upload' : '../upload'),
        // 文件访问域名，生产环境默认使用 https://your-domain.com，开发环境使用 http://localhost:8080
        domain: process.env.FILE_DOMAIN || (env === 'production' ? 'https://your-domain.com' : 'http://localhost:8080'),
        // 文件访问根路径，生产环境默认使用 /profile，开发环境使用 /profile
        serveRoot: process.env.FILE_SERVE_ROOT || '/profile',
        // 文件最大上传大小，单位 MB，默认 10MB
        maxSize: num(process.env.FILE_MAX_SIZE, 10),
        // 是否启用缩略图生成，默认启用
        thumbnailEnabled: bool(process.env.FILE_THUMBNAIL_ENABLED, true),
      },
    },

    // 腾讯云 COS 配置
    cos: {
      secretId: process.env.COS_SECRET_ID || '',
      secretKey: process.env.COS_SECRET_KEY || '',
      bucket: process.env.COS_BUCKET || '',
      region: process.env.COS_REGION || '',
      domain: process.env.COS_DOMAIN || '',
      location: process.env.COS_LOCATION || '',
    },

    // 阿里云 OSS 配置
    creatorStorage: {
      localImageTtlDays: num(process.env.CREATOR_LOCAL_IMAGE_TTL_DAYS, 7),
      enabled: bool(process.env.CREATOR_OSS_ENABLED, false),
      accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || '',
      roleArn: process.env.CREATOR_OSS_ROLE_ARN || '',
      region: process.env.CREATOR_OSS_REGION || '',
      bucket: process.env.CREATOR_OSS_BUCKET || '',
      endpoint: process.env.CREATOR_OSS_ENDPOINT || '',
      stsEndpoint: process.env.CREATOR_OSS_STS_ENDPOINT || 'sts.cn-hangzhou.aliyuncs.com',
      publicBaseUrl: process.env.CREATOR_OSS_PUBLIC_BASE_URL || '',
      stsDurationSeconds: num(process.env.CREATOR_OSS_STS_DURATION_SECONDS, 900),
    },
    // 数据库配置
    db: {
      postgresql: {
        host: process.env.DB_HOST || '127.0.0.1',
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'nest-admin-soybean',
        port: num(process.env.DB_PORT, 5432),
        ssl: bool(process.env.DB_SSL, env === 'production'),
        schema: process.env.DB_SCHEMA || 'public',
      },
    },
    // Redis 配置
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      password: process.env.REDIS_PASSWORD || '',
      port: num(process.env.REDIS_PORT, 6379),
      db: num(process.env.REDIS_DB, env === 'production' ? 0 : 2),
      keyPrefix: process.env.REDIS_KEY_PREFIX || '',
    },
    // JWT 配置
    jwt: {
      // JWT 密钥，生产环境请务必修改为安全的随机字符串，这里随机串在生产环境如何生成？可以使用 openssl rand -base64 32 生成一个随机字符串，并将其设置为环境变量 JWT_SECRET。
      secretkey: process.env.JWT_SECRET || 'change-me-in-production',
      // JWT 过期时间，默认 1 小时，支持秒、分钟、小时、天等单位，例如：60s、10m、2h、7d
      expiresin: process.env.JWT_EXPIRES_IN || '1h',
      // JWT 刷新令牌过期时间，默认 2 小时，支持秒、分钟、小时、天等单位，例如：60s、10m、2h、7d
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '2h',
    },

    // 权限配置：作用？
    perm: {
      // API 白名单，允许匿名访问的接口列表，支持通配符，例如：`/api/public/*`，默认 ['/health', '/metrics', '/api-docs', '/favicon.ico']
      router: {
        whitelist: json(process.env.PERM_WHITELIST, defaultWhitelist),
      },
    },

    gen: {
      author: process.env.GEN_AUTHOR || 'linlingqin77',
      packageName: process.env.GEN_PACKAGE_NAME || 'system',
      moduleName: process.env.GEN_MODULE_NAME || 'system',
      autoRemovePre: bool(process.env.GEN_AUTO_REMOVE_PRE, false),
      tablePrefix: (process.env.GEN_TABLE_PREFIX || 'sys_').split(','),
    },

    user: {
      initialPassword: process.env.USER_INITIAL_PASSWORD || '123456',
    },

    tenant: {
      enabled: bool(process.env.TENANT_ENABLED, true),
      superTenantId: process.env.TENANT_SUPER_ID || '000000',
      defaultTenantId: process.env.TENANT_DEFAULT_ID || '000000',
    },

    crypto: {
      enabled: bool(process.env.CRYPTO_ENABLED, false),
      rsaPublicKey: process.env.CRYPTO_RSA_PUBLIC_KEY || '',
      rsaPrivateKey: process.env.CRYPTO_RSA_PRIVATE_KEY || '',
      nonceTtl: process.env.CRYPTO_NONCE_TTL
        ? num(process.env.CRYPTO_NONCE_TTL, 5 * 60 * 1000)
        : undefined,
      timestampTolerance: process.env.CRYPTO_TIMESTAMP_TOLERANCE
        ? num(process.env.CRYPTO_TIMESTAMP_TOLERANCE, 5 * 60 * 1000)
        : undefined,
    },

    client: {
      defaultClientId: process.env.CLIENT_DEFAULT_ID || 'pc',
      defaultGrantType: process.env.CLIENT_DEFAULT_GRANT_TYPE || 'password',
    },
  };

  // 应用配置转换器进行类型验证
  try {
    const validatedConfig = ConfigTransformer.transform(rawConfig);

    // 非生产环境打印配置信息 (隐藏敏感信息)
    if (env !== 'production') {
      logger.log('Configuration loaded and validated successfully');
      logger.debug(`Config: ${ConfigTransformer.printSafe(validatedConfig)}`);
    }

    return validatedConfig;
  } catch (error) {
    logger.error('Configuration validation failed:', error.message);
    // 配置验证失败时抛出异常，阻止应用启动
    throw error;
  }
};

// 导出配置类型，供其他模块使用
export * from './types';
