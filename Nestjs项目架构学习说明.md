# NestJS 项目架构学习说明

当前 `apps/server` 是一个“模块化单体（Modular Monolith）”NestJS 后端：业务按领域模块拆分，Prisma + PostgreSQL 作为数据层，Redis/Bull 提供缓存与异步任务，并在应用入口统一接入认证、权限、多租户、日志、指标、链路追踪和异常处理。

它不是严格的 Clean Architecture，而是偏实用型的：

```text
HTTP 请求
  ↓
main.ts：Express 中间件、全局前缀、参数校验、Swagger
  ↓
AppModule：全局 Guard / Interceptor / Filter、基础设施、业务模块装配
  ↓
Controller：路由与 DTO
  ↓
Service / Facade：业务编排
  ↓
Repository / PrismaService：数据访问
  ↓
Prisma Extensions：软删除、租户隔离、慢查询
  ↓
PostgreSQL / Redis / Bull
```

## 1. 应用入口

核心文件：

- [`apps/server/src/main.ts`](apps/server/src/main.ts)
- [`apps/server/src/app.module.ts`](apps/server/src/app.module.ts)

`main.ts` 负责“如何启动 HTTP 应用”：

- 创建 Nest Express 应用
- 注册 Pino 日志
- Express 全局限流
- gzip 压缩
- `/profile`、`/public` 静态资源
- 配置统一 API 前缀，通常为 `/api`
- 注册 `ValidationPipe`
- Helmet、Cookie、客户端 IP
- Swagger/OpenAPI
- 优雅关闭

`AppModule` 是整个后端的组合根，负责：

- 配置、日志、Prisma、Redis、Bull
- 多租户、安全、加解密
- Metrics、Tracing、Audit
- 全局异常过滤器
- 全局响应、解密、指标拦截器
- 全局限流、JWT、租户、角色、权限守卫
- 装配所有业务模块

## 2. `src` 目录职责

```text
src/
├── main.ts                 # HTTP 应用启动入口
├── app.module.ts           # 根模块、全局能力装配
├── config/                 # 环境变量和强类型配置
├── core/                   # Nest 请求链横切机制
├── infrastructure/         # 数据库、日志、缓存等技术实现
├── module/                 # 实际业务功能
├── observability/          # 指标、审计、健康检查、链路追踪
├── resilience/             # 熔断与容错
├── security/               # 登录安全、加解密、MFA
├── shared/                 # 公共 DTO、枚举、异常、响应和工具
├── tenant/                 # 多租户上下文与隔离
└── test-utils/             # 测试辅助工具
```

| 目录 | 作用 | 应该放什么 |
|---|---|---|
| `config/` | 应用配置 | 环境变量验证、数据库/JWT/Redis/租户配置类型 |
| `core/` | HTTP 请求生命周期能力 | Guard、Interceptor、Filter、Decorator、Middleware |
| `infrastructure/` | 外部技术设施 | Prisma、Repository 基类、Pino、DataLoader、缓存 |
| `module/` | 业务领域 | Controller、Service、Repository、DTO、子模块 |
| `observability/` | 可观测性 | Metrics、Tracing、Audit、Health Indicator |
| `security/` | 安全能力 | 请求解密、登录锁定、Token 黑名单、MFA |
| `resilience/` | 稳定性 | Circuit Breaker |
| `shared/` | 无明确业务归属的公共代码 | Result、异常、枚举、基础 DTO、工具方法 |
| `tenant/` | 多租户基础能力 | TenantContext、Guard、Prisma 租户扩展、配额和功能开关 |

## 3. 业务模块 `src/module`

### 3.1 `module/main`

系统公共入口和认证入口：

- `AuthController`：登录、注册、验证码、租户列表、Token 等
- `MainController`：首页、路由菜单等公共接口
- `MainService`：认证入口的业务编排

登录主链路是：

```text
POST /api/auth/login
  → AuthController
  → TenantContext.run()
  → MainService.login()
  → UserService.login()
  → UserAuthService
  → UserRepository / Prisma
  → Redis 保存会话
  → 生成 JWT
  → 登录日志 + Metrics
```

参考：

- [`auth.controller.ts`](apps/server/src/module/main/auth.controller.ts)
- [`main.service.ts`](apps/server/src/module/main/main.service.ts)

### 3.2 `module/common`

全局通用客户端：

- `redis/`：Redis 访问、缓存管理
- `axios/`：HTTP 请求封装，例如 IP 地址查询
- `bull/`：Bull 配置文件，但当前 Bull 根配置主要直接放在 `AppModule`

### 3.3 `module/system`

后台管理核心业务聚合模块，装配关系见 [`system.module.ts`](apps/server/src/module/system/system.module.ts)。

| 子目录 | 功能 |
|---|---|
| `auth/` | Passport JWT Strategy |
| `client/` | OAuth/登录客户端配置管理 |
| `config/` | 数据库中的系统参数配置及 API |
| `system-config/` | 系统级配置服务，被 `config` 模块内部使用 |
| `dept/` | 部门和组织树 |
| `dict/` | 字典类型、字典数据 |
| `docs/` | 错误码、API 辅助文档 |
| `file-manager/` | 文件夹、文件、分享和访问管理 |
| `menu/` | 菜单、路由和权限标识 |
| `notice/` | 系统公告 |
| `notify/` | 站内消息模板和消息记录 |
| `post/` | 岗位管理 |
| `role/` | 角色、菜单权限、数据权限 |
| `sms/` | 短信渠道、模板、发送、日志 |
| `mail/` | 邮箱账号、模板、发送、日志 |
| `tenant/` | 租户管理、配额、审计、仪表盘 |
| `tenant-package/` | 租户套餐和可用菜单 |
| `tool/` | 数据源、模板和代码生成器 |
| `user/` | 用户、认证、角色、个人资料、批处理 |

`user/` 是最适合用来学习项目标准写法的模块：

```text
user.controller.ts          # HTTP 接口
user.service.ts             # Facade，统一对外
services/user-crud.service  # CRUD
services/user-auth.service  # 登录认证
services/user-role.service  # 用户角色
services/user-profile...    # 个人资料
services/user-batch...      # 批处理
user.repository.ts          # 数据访问
dto/                        # 请求/响应结构
user.module.ts              # Nest 模块装配
```

`UserService` 已经采用 Facade 模式，把具体职责委托给子服务，见 [`user.service.ts`](apps/server/src/module/system/user/user.service.ts)。

### 3.4 `module/monitor`

运维监控模块，装配关系见 [`monitor.module.ts`](apps/server/src/module/monitor/monitor.module.ts)。

| 子目录 | 功能 |
|---|---|
| `job/` | 定时任务及执行日志 |
| `server/` | CPU、内存、磁盘等服务器信息 |
| `cache/` | Redis 缓存监控和管理 |
| `loginlog/` | 登录日志 |
| `online/` | 在线用户 |
| `operlog/` | 操作审计日志 |
| `health/` | `/health`、存活和就绪探针 |
| `metrics/` | `/metrics` Prometheus 指标端点 |

### 3.5 `module/resource`

资源服务，见 [`resource.module.ts`](apps/server/src/module/resource/resource.module.ts)。

- `oss/`：对象存储文件管理
- `oss-config/`：对象存储配置管理
- `sse.*`：Server-Sent Events 实时推送

### 3.6 `module/upload`

全局文件上传能力：

- `UploadService`：文件上传
- `VersionService`：文件版本处理
- 使用 `@Global()`，其他模块可直接注入

### 3.7 `module/backup`

目前只有 `BackupService`，没有被根模块装配，属于尚未正式接入的备用能力。

## 4. 数据访问架构

数据入口是 [`prisma.service.ts`](apps/server/src/infrastructure/prisma/prisma.service.ts)。

```text
业务 Service
  ├── 直接使用 PrismaService
  └── 使用 XxxRepository
          ↓
      BaseRepository
          ↓
      SoftDeleteRepository
          ↓
      PrismaService
          ↓
      Prisma $extends
          ├── Soft Delete
          ├── Tenant Filter
          └── Slow Query
```

相关目录：

- `prisma/schema.prisma`：数据库模型定义
- `prisma/seeds/`：初始化数据
- `infrastructure/prisma/`：Prisma 客户端和扩展
- `infrastructure/repository/`：Repository 基类
- 业务模块中的 `*.repository.ts`：领域数据访问

当前项目允许两种数据访问方式并存：

```typescript
this.prisma.sysUser.findMany(...)
this.userRepository.findByUserName(...)
```

因此它是“Repository 模式逐步落地”，还不是所有数据库调用都强制经过 Repository。

## 5. 请求横切链路

受保护接口大致经过：

```text
Express Middleware
  → ValidationPipe
  → CustomThrottlerGuard
  → JwtAuthGuard
  → TenantGuard
  → RolesGuard
  → PermissionGuard
  → Decrypt / Metrics / Response Interceptor
  → Controller
  → Service
  → Repository / Prisma
  → ResponseInterceptor 统一响应
```

JWT 守卫还会检查：

- `@NotRequireAuth()` 和白名单
- JWT 有效性
- Token 黑名单
- Token Version
- Redis 中的登录状态

参考 [`auth.guard.ts`](apps/server/src/core/guards/auth.guard.ts)。

正常响应统一为：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {},
  "requestId": "xxx",
  "timestamp": "xxx"
}
```

由 [`response.interceptor.ts`](apps/server/src/core/interceptors/response.interceptor.ts) 统一处理；异常则由 `GlobalExceptionFilter` 转换。

## 6. 多租户实现

多租户不是简单在每个 Service 手写 `tenantId`，而是：

```text
登录或请求解析租户
  → TenantContext（AsyncLocalStorage）
  → Prisma Tenant Extension
  → 自动附加 tenantId 条件
```

[`tenant.context.ts`](apps/server/src/tenant/context/tenant.context.ts) 保存当前异步请求的：

- `tenantId`
- `ignoreTenant`
- `requestId`

Prisma 扩展自动处理：

- 查询追加 `tenantId`
- 创建自动写入 `tenantId`
- 更新、删除限制当前租户
- `findUnique` 查询后校验租户归属
- 超级租户 `000000` 可跳过租户过滤

## 7. `apps/server` 非源码目录

| 目录 | 功能 |
|---|---|
| `prisma/` | Schema、Seed、数据库脚本 |
| `test/unit/` | 单元测试 |
| `test/integration/` | 模块集成测试 |
| `test/e2e/` | 端到端测试 |
| `monitoring/` | Prometheus、Grafana、Alertmanager 配置 |
| `scripts/` | 部署、配置迁移、诊断脚本 |
| `docs/` | 历史优化和开发文档 |
| `public/` | OpenAPI JSON 等公开静态文件 |
| `db/backup/` | SQL 备份 |
| `dist/` | 编译产物，不应作为源码阅读 |
| `node_modules/` | 依赖，不属于项目架构 |

## 8. 当前架构需要注意的地方

- 大量模块使用 `@Global()`，使用方便，但模块间依赖不够显式。
- `core/guards` 会直接依赖 `UserService`，`security/tenant` 会直接依赖业务层的 `RedisService`，所以并非严格单向依赖架构。
- `EventEmitterModule` 已注册，但当前代码基本没有真正的 `emit/@OnEvent`，领域事件仍属于预留能力。
- `infrastructure/cache/CacheModule` 当前没有接入 `AppModule`，不要误认为多级缓存已经运行。
- `module/common/bull` 存在独立配置，但当前 Bull 根配置直接位于 `AppModule`。
- Swagger 描述仍写着 URI 版本控制，但 `main.ts` 已明确移除版本路由，当前真实入口是统一 `/api`。
- `docs` 中部分旧文档仍引用 `src/common`，当前实际结构已经改为 `src/core + src/shared + src/infrastructure`，阅读时以源码为准。

## 9. 推荐阅读顺序

```text
main.ts
→ app.module.ts
→ module/system/system.module.ts
→ module/main/auth.controller.ts
→ module/system/user/
→ core/guards + core/interceptors
→ infrastructure/prisma/
→ tenant/
→ prisma/schema.prisma
```

本文档基于当前项目模块装饰器、导入关系、控制器路由，以及登录、用户、Prisma、多租户关键链路整理。历史文档与源码不一致时，应以当前源码为准。





# 补充说明:架构学习说明
## 1.Clean Architecture 整洁架构 和DDD架构
很多 Nest 项目会进一步简化：直接把 repository 逻辑写进 service，连独立 infrastructure 都省略，那就连 “实用 CA” 都算不上，属于传统三层架构（Controller‑Service‑Model）。

- CA架构说明

```
┌─────────────────────────────────────────┐
│              Infrastructure             │
│                                         │
│   DB / Redis / HTTP / OSS / Kafka       │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │          Application            │   │
│   │                                 │   │
│   │             UseCase             │   │
│   │                                 │   │
│   │      ┌───────────────────┐      │   │
│   │      │      Domain       │      │   │
│   │      │                   │      │   │
│   │      │ Entity / Rule     │      │   │
│   │      │ Repository接口    │      │   │
│   │      └───────────────────┘      │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘


```


- 前提：Clean Architecture 核心约束：依赖向内，Domain 层不能依赖任何框架、ORM、HTTP 库
- 实用版：保留分层思想，但去掉大量抽象接口，允许业务层直接依赖 Prisma/Nest 工具，减少样板代码，企业项目最常用。

- Clean Architecture 整洁架构：CA：


### 1️⃣ 严格 Clean Architecture（完整 CA）目录结构
约束：Domain 层零外部依赖，只定义接口；Repository、外部实现在 infrastructure；UseCase 只依赖抽象。

```
└── modules
    └── user
        ├── domain                # 【最内层，绝对不能导入nest、prisma】
        │   ├── entities
        │   │   └── user.entity.ts       # 领域实体，纯TS，无装饰器
        │   └── repositories
        │       └── user.repository.interface.ts  # Repository抽象接口，只定义方法
        ├── application           # UseCase 应用用例层，只依赖domain的接口
        │   ├── dto
        │   │   └── create-user.dto.ts
        │   └── use-cases
        │       ├── create-user.use-case.ts
        │       └── find-user.use-case.ts
        ├── infrastructure        # 外层：所有外部实现放这里
        │   └── repositories
        │       └── prisma-user.repository.ts # 实现domain的接口，使用prisma
        └── presentation          # 最外层：控制器、http、dto、nest装饰器
            ├── user.controller.ts
            └── dto
                └── create-user.http.dto.ts


```


### 2，关于CA的核心思想汇总：
### Infrastructure 可以依赖 Domain，但 Domain 不应该依赖 Infrastructure。
- CA 最核心的思想之一。


### 3.Domain 到底是什么？
domain 可以理解成：

这个系统真正的业务世界。
它不关心：
- MySQL
- PostgreSQL
- Redis
- HTTP
- NestJS
- Express
- Axios
- Prisma
- TypeORM
- MongoDB

#### 它只关心：

- 业务本身是什么？业务规则是什么？

- 例如你做一个用户系统。

用户本身就是一个 Domain Entity：
```
export class User {
  constructor(
    public readonly id: string,
    public name: string,
    public age: number,
  ) {}

  canLogin(): boolean {
    return this.age >= 18;
  }
}


注意这里没有：
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
原因是：User 这个业务对象不应该知道数据到底存在哪里。



```

### 4.Domain Entity 是什么？
Entity 就是：业务领域中的核心对象。
```
电商系统

User
Product
Order
OrderItem
Payment


每一个模块对应的 domain 内容如下：对应所有的模块的entity实体。
domain/
├── entities/
│   ├── User.ts
│   ├── Product.ts
│   └── Order.ts




```

### 5.Repository 到底是什么？
Repository 是 CA 中非常容易搞混的一个东西。
Repository 是“数据访问能力的抽象”，不是数据库本身。
例如业务需要：根据 ID 查询用户，保存对象，删除用户；

#### Domain定义内容：Repository
```
export interface UserRepository {
  findById(id: string): Promise<User | null>;

  save(user: User): Promise<void>;

  delete(id: string): Promise<void>;
}


```
- 注意：这里没有：
```
MySQL
Prisma
MongoDB
Redis
SQL
HTTP


```

- Repository知识定义一个能够保存和查询User的东西，就是一个Repository的抽象接口；



#### 为什么 Repository 放在 Domain？
这是 CA 最关键的设计之一。
```
export interface UserRepository {
  findById(id: string): Promise<User | null>;
}


```

Domain 只说：我想要查询一个findById，但是他不关心：
```
到底是 MySQL？
MongoDB？
Redis？
HTTP API？
本地 JSON？
内存？


```

所以：映射一下
```
Domain
   ↓
UserRepository interface

```

- 而具体实现，需要映射到：Infrastructure

```
export class UserRepositoryImpl implements UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }
}


```
#### 通过上面，你就理解了什么叫做：依赖倒置
```
Domain
  │
  │ UserRepository interface
  ↓
Infrastructure
  │
  └── UserRepositoryImpl
          ↓
        Prisma
          ↓
        MySQL

依赖倒置（Dependency Inversion）:DI


```

### 6.UseCase 是什么？
UseCase 可以理解成：用户/系统到底要完成什么事情。
比如：创建用户，查询用户，删除用户，注册，登录，退款等等。
这些都是UseCase
```
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: {
    name: string;
    age: number;
  }) {
    const user = new User(
      crypto.randomUUID(),
      input.name,
      input.age,
    );

    await this.userRepository.save(user);

    return user;
  }
}


```
这个 UseCase 做的事情就是：就是完成需求的具体过程和结果

```
接收参数
   ↓
创建 User
   ↓
执行业务规则
   ↓
调用 Repository
   ↓
保存 User
   ↓
返回结果




```

#### 总结一下：Domain和UseCase
- Domain = 业务规则
- UseCase = 业务流程



### 7.Infrastructure
技术设施，就是具体的技术实现。

比如下面的内容：
```
MySQL
PostgreSQL
MongoDB
Redis
Kafka
RabbitMQ
HTTP API
OSS
S3
第三方支付
第三方登录
文件系统


```

#### 多种技术实现内容：Infrastructure
```
infrastructure/
├── database/ 数据库的技术实现：prisma
│   └── prisma.ts
│
├── repositories/  用户存储的实现：
│   └── UserRepositoryImpl.ts
│
├── services/  阿里云的实现服务，支付实现服务
│   ├── AliyunOSSService.ts
│   └── StripePaymentService.ts
│
└── http/  后端接口请求实现服务
    └── UserApi.ts



```


### 8.Repository 和 Infrastructure 的关系
这是最容易理解错的地方。

#### 我们看一个Domain和Infrasture
```
1.Domain
interface UserRepository {
  findById(id: string): Promise<User | null>;
}

2.Infrastructure
class MySQLUserRepository implements UserRepository {
  async findById(id: string) {
    // MySQL 查询
  }
}


                 Domain
                   │
                   │ 定义接口
                   ↓
          UserRepository
                   ↑
                   │ implements
                   │
       MySQLUserRepository
                 Infrastructure


```

- Repository Interface 是“需求/契约”，
- Repository Implementation 是“具体实现”。



### 9.所以我们看一个调用链：
```

HTTP Request
     ↓
Controller
     ↓
LoginUseCase
     ↓
UserRepository
     ↓
PrismaUserRepository
     ↓
    MySQL




```


## 2.DDD领域驱动设计
- DDD = Domain-Driven Design，领域驱动设计。

- 核心思想不是“项目目录怎么分”，而是：

围绕业务领域来设计代码，而不是围绕技术框架来设计代码。

src/
├── controllers/
├── services/
├── entities/
├── repositories/
└── modules/

但是这样脱离了业务，导致每一个文件夹会增加，对于业务的理解的拆分会非常割裂

- 你需要每一次的模块，更新所有的目录内容；

### 1.DDD + NestJS 的典型结构
不是全局按照 controller/service/repository 分类，而是先按照业务模块划分，再在每个业务模块内部按照 DDD 分层。

```
src/
│
├── modules/
│
│   ├── user/
│   │   │
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── email.vo.ts
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts
│   │   │   └── services/
│   │   │       └── user-domain.service.ts
│   │   │
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── create-user.use-case.ts
│   │   │   │   └── get-user.use-case.ts
│   │   │   └── dto/
│   │   │       └── create-user.dto.ts
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   └── repositories/
│   │   │       └── user.repository.impl.ts
│   │   │
│   │   ├── presentation/
│   │   │   ├── controllers/
│   │   │   │   └── user.controller.ts
│   │   │   └── dto/
│   │   │
│   │   └── user.module.ts
│   │
│   ├── order/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── order.module.ts
│   │
│   └── product/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       ├── presentation/
│       └── product.module.ts
│
├── shared/
│   ├── domain/
│   ├── infrastructure/
│   └── common/
│
└── main.ts


```


### 2.DDD的几个核心的概念
Entity
Value Object
Aggregate
Aggregate Root
Repository
Domain Service
Domain Event
Application Service / UseCase
Bounded Context
最重要的几个如下：
```
Entity
Value Object
Aggregate
Repository
Domain Service


```

#### Entity
Entity：实体
```
export class User {
  constructor(
    private readonly id: string,
    private name: string,
    private email: Email,
  ) {}

  changeName(name: string) {
    this.name = name;
  }
}


```


### 3.注意：我们简单的使用Entity实体定义基本的：增删查改内容，但是有一些业务规则，无法放进去

尤其设计了很多的业务相关的内容：
所以出现了：controllver，services，这个services层做承载，承载很多的业务服务。

- Controller 对象：接收 http 请求，调用 Service，返回响应
- Service 对象：实现业务逻辑
- Repository 对象：实现对数据库的增删改查

Controller 依赖了 Service 实现业务逻辑，Service 依赖了 Repository 来做增删改查，Repository 依赖 DataSource 来建立连接，DataSource 又需要从 Config 对象拿到用户名密码等信息。

### 关键说明：
- Entity = 谁

- Repository = 怎么抽象地存取聚合

- Infrastructure = 具体技术怎么实现：比如实现一个mysql接入模块，一个https，一个中间件
- Controller = 外部请求怎么进来
- Domain Service = 跨实体的业务规则（一般就是Service）



# 0。补充理解说明内容：IoC，DI，AOP抽象说明
- IoC：原来“我要什么，我自己创建”，变成“我要什么，别人给我”。
- AOP：原来“每个业务方法都自己写日志/鉴权/事务”，变成“把这些横切逻辑统一放到方法外面处理”。

IoC 不是“某个具体代码”，而是一种控制权发生变化的思想。

## 第一阶段理解IoC
假设你要写：假设你去餐厅。
```
普通方式：
你
 ↓
买菜
 ↓
买锅
 ↓
买煤气
 ↓
自己做饭

```

你什么都自己控制。

- IoC：你只关心：你要什么，你不用关系，东西是谁创建的，
那么Nestjs的IoC容器就是那一个“餐厅”


```
你
 ↓
告诉餐厅：
“我要一份宫保鸡丁”
 ↓
餐厅准备食材
 ↓
餐厅做饭
 ↓
给你


```

- DI：DI是IoC的一种方式。

DI是依赖注入，
```
IoC
└── 控制权反转

DI
└── 通过“注入依赖”实现 IoC


```


- 为什么 NestJS 要 @Injectable()？
粗略的理解为：“告诉 Nest：这个类可以交给 IoC 容器管理。”
```
@Injectable()
export class UserService {}



@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}
}

这里使用这个说明：用户user注入：
UserController
       ↓
需要 UserService



```


- IoC 就是原来一个类自己负责创建依赖，现在把创建依赖的控制权交给外部容器。
```
说明：
原来的方式：A -> new B()：自己创建自己的依赖。

现在的方式：Container容器-> 通过容器创建B ->给A：解释了通过外部容器实现依赖创建后的注入；




```


## 不用IoC行不行？
- 当然可以
```
---------------------------使用IoC的方式：
@Injectable()
export class UserService {}


--------------------------不使用IoC的方式：这里的创建使用，
class UserService {
  constructor() {
    this.repository = new UserRepository();// 其实对应：IoC实现就是实现了注入这个依赖。
  }
}


```


## AOP实现：
```
class UserService {
  getUser() {
    console.log('开始');
    
    // 业务代码
    
    console.log('结束');
  }

  createUser() {
    console.log('开始');

    // 业务代码

    console.log('结束');
  }

  deleteUser() {
    console.log('开始');

    // 业务代码

    console.log('结束');
  }
}


```

发现没有，真正的业务就是：getUser()，createUser()，deleteUser()

其他的打印日志，或是鉴权，耗时分析，异常处理，事物回滚，这些和代码业务没有关系。
这种东西就是：横切关注点。
### 什么叫做横切
假设你有几个业务：User，Order，Product，那么每一个业务都需要：日志，权限校验，监控，异常，事务，那么你的内容画出来，如下内容
```
              User
               │
              Log
               │
             Auth
               │
             Trace

              Order
               │
              Log
               │
             Auth
               │
             Trace

             Product
               │
              Log
               │
             Auth
               │
             Trace



```
很明显：Log，Auth，Trace，都是横跨了很多的业务：所以这些内容叫做：横切关注点。



### AOP想解决的核心问题：
AOP思想就是：把与核心业务无关的公共逻辑，从业务中抽离出来
所以getUser里面只写业务，外面的统一内容先经过统一逻辑：
```
          Logging
             ↓
          Auth
             ↓
          Trace
             ↓
        UserService
             ↓
          getUser()


```

### AOP常见的东西
Nestjs中你经常会遇到，他们都是和Nestjs  请求处理管道有关。
```
Middleware
Guard
Interceptor
Pipe
Filter
Decorator

```

- Guard：你有没有资格进来？（Guard = 权限/准入控制）
- Interceptor