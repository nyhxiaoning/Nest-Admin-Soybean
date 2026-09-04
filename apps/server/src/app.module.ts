// NestJS 应用程序的主模块，负责引导整个应用程序的模块和服务。
import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
// 导入配置模块，提供全局配置服务
import { ConfigModule } from '@nestjs/config';
// 导入自定义配置服务，提供类型安全的配置访问
import { AppConfigService } from './config/app-config.service';
// 导入中间件和守卫，用于请求处理和安全控制
import { ThrottlerModule } from '@nestjs/throttler';
// 导入自定义守卫和拦截器，用于请求处理和安全控制
import { EventEmitterModule } from '@nestjs/event-emitter';
// 导入自定义守卫和拦截器，用于请求处理和安全控制
import { BullModule } from '@nestjs/bull';
// 导入自定义守卫和拦截器，用于请求处理和安全控制
import configuration from './config/index';
// 导入自定义守卫和拦截器，用于请求处理和安全控制
import { validate } from './config/env.validation';

// 导入自定义守卫和拦截器，用于请求处理和安全控制
import { AppConfigModule } from './config/app-config.module';
// TODO:全局的常用模版文件：服务模块
// APP_FILTER、APP_GUARD、APP_INTERCEPTOR 是 NestJS 提供的全局注入令牌，用于注册全局异常过滤器、守卫和拦截器。通过在 AppModule 中使用这些令牌，可以确保这些服务在整个应用程序中都是全局可用的，而不需要在每个模块中单独导入和提供它们。
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
// 导入全局验证管道，用于请求参数验证和转换: JwtAuthGuard,PermissionGuard,RolesGuard,CustomThrottlerGuard
import { JwtAuthGuard, PermissionGuard, RolesGuard, CustomThrottlerGuard } from './core/guards';
import { TenantGuard, TenantModule, ClsModule } from './tenant';
import { CryptoModule, DecryptInterceptor } from './security/crypto';
import { LoggerModule } from './infrastructure/logging';
import { MetricsModule, MetricsInterceptor } from './observability/metrics';
import { TracingModule } from './observability/tracing';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';
import { AuditModule } from './observability/audit';
import { LoginSecurityModule } from './security/login';
import { MfaModule } from './security/mfa';
import { DataLoaderModule } from './infrastructure/dataloader';
import { SharedServicesModule } from './shared/services/shared-services.module';

// 业务模块
import { MainModule } from './module/main/main.module';
import { UploadModule } from './module/upload/upload.module';
import { SystemModule } from './module/system/system.module';
import { CommonModule } from './module/common/common.module';
import { MonitorModule } from './module/monitor/monitor.module';
import { ResourceModule } from './module/resource/resource.module';
import { PrismaModule } from './infrastructure/prisma';
import { ResilienceModule } from './resilience/circuit-breaker/resilience.module';
import { CreatorModule } from './module/creator/creator.module';

@Global()
@Module({
  imports: [
    // 配置模块 - 强类型配置验证
    ConfigModule.forRoot({
      cache: true,
      load: [configuration],
      isGlobal: true,
      validate,
      // 支持多环境配置文件加载，优先级：.env.{NODE_ENV} > .env
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      // 允许未知的环境变量，避免在生产环境中因缺少某些变量而导致应用无法启动
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    // 类型安全的配置服务模块
    AppConfigModule,
    // Pino 日志模块
    LoggerModule,
    // CLS 上下文模块 (Request ID)
    ClsModule,
    // Prometheus 指标收集模块
    MetricsModule,
    // OpenTelemetry 分布式追踪模块
    TracingModule,
    // 审计日志模块
    AuditModule,
    // DataLoader 模块 (解决 N+1 查询问题)
    DataLoaderModule,
    // 登录安全模块 (登录失败锁定、Token黑名单)
    LoginSecurityModule,
    // 多因素认证模块 (TOTP、SMS 二次验证)
    MfaModule,
    // 共享服务模块 (解决循环依赖的桥接服务)
    SharedServicesModule,
    // 数据库改为 Prisma + PostgreSQL
    PrismaModule,
    // 多租户模块
    TenantModule,
    // 加解密模块
    CryptoModule,
    // 弹性模块 (熔断器)
    ResilienceModule,
    // 事件发射器模块 (领域事件驱动架构)
    EventEmitterModule.forRoot({
      // 允许事件发射器最多有 20 个监听器，避免内存泄漏警告，提问：这个一般用于哪些场景？
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    // API 限流模块，防止 DDoS 攻击，
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    // Bull 队列模块 (用于异步任务处理)
    BullModule.forRootAsync({
      // 注入 AppConfigService，动态配置 Redis 连接信息
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
          keyPrefix: config.redis.keyPrefix + 'bull:',
        },
        // 队列默认配置，所有队列都会继承这些配置，
        defaultJobOptions: {
          // 任务失败后重试次数，避免临时网络问题导致任务失败
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100, // 保留最近100个已完成任务
          removeOnFail: 500, // 保留最近500个失败任务
        },
      }),
    }),

    // 应用模块
    MainModule,
    // 上传模块 (处理文件上传)
    UploadModule,
    // 系统模块 (处理系统配置、字典、日志等)
    CommonModule,
    // 监控模块 (处理健康检查、指标收集等)
    SystemModule,
    // 监控模块 (处理健康检查、指标收集等)
    MonitorModule,
    // 资源模块 (处理静态资源、文件管理等)
    ResourceModule,
    // Creator 模块 (处理 Creator JSON 暂存接口)
    CreatorModule,
  ],
  // 全局提供的服务注入管理器：
  providers: [
    // 全局异常过滤器 (通过 DI 注册，支持完整依赖注入)
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // 统一响应拦截器 (为所有响应添加 requestId 和 timestamp)
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // 解密拦截器 (解密前端加密请求)
    {
      provide: APP_INTERCEPTOR,
      useClass: DecryptInterceptor,
    },
    // 指标收集拦截器 (收集 HTTP 请求指标)
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    // API 限流守卫 - 最先执行，防止DDoS攻击
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    // JWT 认证守卫 - 第二执行，验证用户身份
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 租户守卫 - 基于已认证用户设置租户上下文
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    // 角色守卫 - 检查用户角色
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // 权限守卫 - 检查API权限
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Note: Tenant middleware is now handled at the Prisma level
    // via createTenantMiddleware() in PrismaService
    // No HTTP middleware needed here
  }
}
