# Nest-Admin-Soybean 后端学习梳理交接

## 下一会话目标

基于仓库中的 `Nestjs项目架构学习说明.md` 和当前 `apps/server` 源码，完成一份面向学习者的后端项目全景说明，并给出按依赖关系排列、可以逐项执行的模块学习计划。最终结果应回答：项目如何启动、一次请求如何流转、数据和租户隔离如何落地、每个业务模块做什么、模块之间如何依赖，以及按什么顺序阅读和实践。

本交接只提供下一会话的工作上下文与执行路线，不修改工作区中的学习说明。

## 已有材料（优先引用，不要重复抄写）

- 总体学习说明：`Nestjs项目架构学习说明.md`
- 启动入口：`apps/server/src/main.ts`
- 根组合模块：`apps/server/src/app.module.ts`
- 依赖与脚本：`apps/server/package.json`
- 数据模型：`apps/server/prisma/schema.prisma`
- 系统业务聚合：`apps/server/src/module/system/system.module.ts`
- 测试目录：`apps/server/test/`
- 历史架构与优化材料：`apps/server/docs/`

现有学习说明已经覆盖模块化单体、入口、目录职责、系统/监控/资源/上传模块、Prisma、多租户、请求横切链路，以及 CA、DDD、IoC/DI/AOP 基础概念。下一会话应在此基础上校正和扩充，不要重写已有段落。

## 已核实的当前源码快照

- 技术形态：NestJS 10 + Express + Prisma 5 + PostgreSQL + Redis + Bull。
- 架构形态：实用型模块化单体；按业务域组织模块，Controller → Service/Facade → Repository/Prisma，并非严格 Clean Architecture。
- `AppModule` 当前装配：配置、日志、CLS、指标、Tracing、Audit、DataLoader、登录安全、MFA、共享服务、Prisma、多租户、加解密、熔断、事件、限流，以及 `main/upload/common/system/monitor/resource/creator` 业务模块。
- 全局请求能力：异常 Filter、响应/解密/指标 Interceptor、限流/JWT/租户/角色/权限 Guard。
- Prisma Schema 当前同时包含系统域、资源域、租户域与 Creator 域模型；Creator 相关模型位于 schema 尾部。
- 测试分为 unit、integration、e2e；Creator 的图片上传、JSON 上传和作品接口已有 E2E 用例。
- `backup` 没有独立装入根模块，但 `BackupService` 被 `monitor/job` 使用，不能简单描述为“完全未接入”。
- `CreatorModule` 是现有学习说明的主要缺口：它包含独立认证、存储、作品/标签/投稿能力。
- 工作区在本次交接检查时无未提交变更；本次操作只新增了临时交接文件。

## 需要在下一会话校正的文档认知

1. 原说明的顶层模块清单需要补入 `module/creator`。
2. 原说明对 `backup` 的描述需要改成：没有独立模块装配，但服务已被 JobModule 作为 provider 使用。
3. Swagger 描述提到 URI 版本控制，但 `main.ts` 的真实行为仍是统一 `/api` 前缀；学习说明要明确“源码行为优先”。
4. 大量 `@Global()` 使依赖图看起来比实际更松散；讲解模块时同时记录 imports/exports 和隐式全局依赖。
5. `CreatorStorageModule` 虽未直接列在根模块中，但被 `CreatorWorksModule` 导入，因此上传控制器会进入应用依赖图。
6. 现有文档后半部分的 CA/DDD 是概念对照，不要错误地把当前项目描述成严格 CA 或完整 DDD。

## 推荐的总体学习路径

顺序原则：先建立运行时骨架，再理解请求链和数据层；先学习低依赖 CRUD，再学习组织权限与认证；最后进入外部资源、异步任务、Creator 综合业务和生产保障。

```text
Nest/TS 基础
  → 启动与配置
  → 请求生命周期
  → 公共与基础设施
  → Prisma 与多租户
  → 简单 CRUD 模块
  → 组织/权限/用户
  → 登录认证主链路
  → 租户业务
  → 消息与文件资源
  → 监控和任务
  → Creator 综合业务
  → 安全/可观测性/韧性
  → 测试、部署与架构复盘
```

## 分阶段详细计划

### 阶段 0：补齐 NestJS 阅读前置（0.5～1 天）

目标：能读懂 Module、Provider、Controller、Decorator、IoC/DI 和请求生命周期。

- 结合原说明的 IoC/DI/AOP、CA、DDD 章节复习概念。
- 用一个最小链路解释 `@Module({ imports, controllers, providers, exports })`。
- 明确 Guard、Pipe、Interceptor、Filter、Middleware 的职责与大致执行位置。
- 明确 DTO、Entity/Prisma Model、Repository、Service 的区别。

验收：不看资料画出 Nest 请求链，并解释为什么 Provider 由容器创建而不是在 Controller 中 `new`。

### 阶段 1：启动入口与配置系统（1 天）

阅读顺序：

1. `apps/server/src/main.ts`
2. `apps/server/src/app.module.ts`
3. `apps/server/src/config/index.ts`
4. `apps/server/src/config/config.transformer.ts`
5. `apps/server/src/config/env.validation.ts`
6. `apps/server/src/config/app-config.service.ts`
7. `apps/server/src/config/types/`

关注：应用创建、Body Parser、限流、压缩、静态资源 `/profile`、API 前缀、ValidationPipe、Helmet、Swagger、真实 IP、优雅关闭、强类型配置与环境变量验证。

实践：从一个环境变量追踪到 `AppConfigService` 的消费位置；画出 `bootstrap → listen` 时间线。

验收：能解释 `/api` 与 `/profile` 为什么不是同一类路由，以及配置错误为何会在启动阶段失败。

### 阶段 2：请求生命周期与公共契约（1～1.5 天）

阅读：

- `apps/server/src/core/guards/`
- `apps/server/src/core/interceptors/`
- `apps/server/src/core/filters/`
- `apps/server/src/core/decorators/`
- `apps/server/src/core/middleware/`
- `apps/server/src/shared/dto/`、`response/`、`exceptions/`、`enums/`、`utils/`

按真实顺序追踪一个受保护请求：限流 → JWT → Tenant → Roles → Permission → Controller → Service → 响应封装；再追踪一次 DTO 校验失败和业务异常。

验收：能说明统一返回体、requestId、白名单路由、角色与权限校验分别由谁负责。

### 阶段 3：公共技术设施（1～1.5 天）

建议顺序：

1. `module/common/redis`：Redis 客户端和缓存封装。
2. `module/common/axios`：外部 HTTP 客户端。
3. `infrastructure/logging`：Pino 与结构化日志。
4. `infrastructure/prisma`：客户端创建和扩展挂载。
5. `infrastructure/repository`：BaseRepository、软删除基类。
6. `infrastructure/dataloader`：批量加载与 N+1 优化。
7. `infrastructure/cache`：多级缓存；核实是否实际接入根模块。
8. `shared/services`：跨模块桥接与循环依赖处理。

验收：能区分“根模块已运行的基础设施”和“代码存在但尚未装配的能力”。

### 阶段 4：Prisma、迁移和多租户（1.5～2 天）

阅读顺序：

1. `prisma/schema.prisma` 的 datasource/generator 和模型分组。
2. `prisma/migrations/` 与 `prisma/seed.ts`、`migration-seed.ts`。
3. `infrastructure/prisma/prisma.service.ts`。
4. 软删除、慢查询、租户 Prisma Extension。
5. `tenant/context/`、`tenant/guards/`、`tenant/services/`。

实践：选一个 `Sys*` 模型，从 migration → Prisma model → repository → service → controller 完整追踪；再验证 tenantId 在创建和查询时如何自动处理。

验收：能解释“生成 Prisma Client”“创建迁移”“部署迁移”“Seed”四者差异，并能判断 `table does not exist` 属于 schema/client/migration/连接库中的哪一层问题。

### 阶段 5：低依赖 CRUD 样板（1～1.5 天）

按由简到繁学习 `system`：

1. `post`：Controller/DTO/Service/Repository 的最小完整样板。
2. `notice`：状态与业务动作。
3. `dict`：类型与数据的双实体组合。
4. `config` + `system-config`：数据库配置、缓存与系统级读取。
5. `client`：认证客户端配置，为登录链路铺垫。
6. `docs`：运行时错误码文档，不作为核心业务。

每个模块统一回答六个问题：路由是什么、DTO 如何校验、Service 负责编排什么、Repository 封装什么、对应哪些 Prisma Model、测试覆盖在哪里。

### 阶段 6：组织、权限、用户（2～3 天）

强依赖顺序：

1. `dept`：树结构和数据范围基础。
2. `menu`：菜单树、路由和权限标识。
3. `role`：角色—菜单、角色—部门、数据权限。
4. `user`：用户—角色、用户—岗位、状态、资料与批处理。
5. `post` 回看：理解用户岗位关联。

重点把 `user` 当作项目标准样板：Controller → Facade `UserService` → CRUD/Auth/Role/Profile/Batch 子服务 → Repository → Prisma。

验收：画出用户、角色、菜单、部门、岗位五类模型的关系，并能解释“功能权限”和“数据权限”的差异。

### 阶段 7：主站认证与安全主链路（1.5～2 天）

阅读顺序：

1. `module/system/auth` 的 Passport JWT Strategy。
2. `module/main/auth.controller.ts`。
3. `module/main/main.service.ts`。
4. `module/system/user/services/user-auth.service.ts`。
5. `security/login`、`security/crypto`、`security/mfa`。
6. `core/guards/auth.guard.ts`。

追踪：验证码/登录 → 选择租户 → 校验客户端和用户 → 会话写 Redis → 签发 JWT → 后续请求校验 Token、版本和黑名单。

验收：独立画出登录和已登录请求两张时序图，标注数据库、Redis、JWT 与 TenantContext 的边界。

### 阶段 8：租户业务模块（1～1.5 天）

先学习 `tenant-package`，再学习 `system/tenant` 下的主服务、dashboard、quota、audit；与阶段 4 的租户基础设施区分开：前者是租户管理业务，后者是请求上下文和数据隔离机制。

验收：能说明租户创建、套餐授权、配额统计、租户审计与 Prisma 自动隔离各自所在层次。

### 阶段 9：通知、通信与文件资源（2～3 天）

模块内部顺序：

- `notify`：template → message。
- `sms`：channel → template → send/client → log。
- `mail`：account → template → send → log。
- `upload`：通用文件上传与版本处理。
- `resource/oss-config` → `resource/oss` → `resource/sse`。
- `system/file-manager`：folder/repository → access service → manager service/controller。

关注外部系统边界、配置来源、失败处理、文件元数据与实际对象的区别，以及同步 HTTP 与 SSE 推送的差异。

验收：画出一次文件上传以及一次模板消息发送的端到端链路。

### 阶段 10：监控、任务与运维（1.5～2 天）

建议顺序：

1. `monitor/health`：存活/就绪与依赖健康。
2. `monitor/server`：主机信息。
3. `monitor/cache`：Redis 观察与管理。
4. `monitor/online`：在线会话。
5. `monitor/loginlog`、`operlog`：日志查询与审计来源。
6. `monitor/job`：Schedule、任务定义、执行日志和 BackupService。
7. `monitor/metrics`：Prometheus 端点；对照顶层 `observability/metrics` 的采集能力。

验收：能区分日志、指标、追踪、审计、健康检查五类可观测数据，并解释 JobModule 中 BackupService 的真实接入方式。

### 阶段 11：Creator 独立业务域综合实战（2～3 天）

这是现有学习说明必须新增的部分，顺序不可颠倒：

1. `creator/common`：独立装饰器、Guard、接口和常量。
2. `creator/auth`：CreatorUser、独立登录/注册和 Creator JWT Guard。
3. `creator/storage`：图片 multipart 上传、JSON 内容上传、本地存储抽象、清理服务、OSS STS。
4. `creator/works`：作品 CRUD、标签、发布/投稿、作品文件上传编排。
5. Prisma 中 `CreatorUser/CreatorWork/CreatorWorkTag/CreatorWorkTagRelation/CreatorWorkSubmission`。
6. `test/e2e/creator-image-upload.e2e-spec.ts`、`creator-json-upload.e2e-spec.ts`、`creator-works.e2e-spec.ts`。

用之前遇到的三个真实问题作为案例复盘：

- `creator_work` 不存在：验证 migration 是否应用到当前连接的数据库。
- `/profile/...` URL 跨域：区分 API CORS、静态资源、绝对域名 `localhost` 和 Vite `/profile` 代理。
- 图片上传：区分 multipart 二进制文件、JSON 内容上传、返回的远程/静态文件 URL。

验收：能从 Creator 前端请求追踪到 Controller、Guard、Service、存储抽象/Repository、磁盘或数据库，并说明 Creator 认证为何与后台系统认证分开。

### 阶段 12：代码生成、韧性和高级能力（1～1.5 天）

- `system/tool`：datasource → template → inference/preview → history → generator。
- `resilience/circuit-breaker`：外部依赖故障时的降级与恢复。
- `observability`：metrics、tracing、audit、health。
- `EventEmitterModule` 与 `shared/events`：确认当前是实际使用还是预留设计。

验收：能判断一项能力是业务功能、基础设施还是横切关注点，并指出它是否真正进入运行时依赖图。

### 阶段 13：测试、运行与最终架构复盘（1.5～2 天）

阅读：`test/setup.ts`、helpers、mocks、fixtures，然后按 unit → integration → e2e 阅读；结合 `package.json` 中 build/test/prisma 脚本和 `scripts/`、`monitoring/`、`docs/QUICK_START.md` 理解运行维护。

最终学习产出：

1. 一张顶层模块依赖图。
2. 一张 HTTP 请求生命周期图。
3. 登录、普通 CRUD、文件上传、Creator 发布四条时序图。
4. 一张 Prisma 模型分域图。
5. 每个模块一页学习卡：职责、入口、依赖、模型、关键链路、测试、风险。
6. 一份“源码与历史文档不一致”清单。

## 每个模块的统一学习模板

下一会话梳理任何模块时，都用以下结构，避免只列文件名：

1. 业务职责与边界。
2. Module 的 imports/controllers/providers/exports。
3. Controller 路由和认证要求。
4. DTO、校验与统一响应。
5. Service/Facade 的用例与事务边界。
6. Repository/Prisma 调用及对应数据模型。
7. Redis、Bull、OSS、HTTP 等外部依赖。
8. 租户、权限、审计、日志等横切行为。
9. 单元/集成/E2E 测试位置。
10. 当前设计特点、隐式依赖和潜在技术债。
11. 一个可实际执行的阅读或调试练习。
12. 掌握标准：学习者能否不看答案复述链路。

## 建议下一会话的工作方式

1. 先核对当前源码，因为仓库仍在持续修改，历史文档可能滞后。
2. 从 `AppModule` 建立真实 imports 图，不仅依赖目录名判断。
3. 为每个顶层模块列 Controller 路由、Provider、Repository、Prisma Model 和测试映射。
4. 把上述阶段计划扩展成正式学习文档；如果要修改原文，先与用户确认是“覆盖原文”还是“新增第二份学习计划”。
5. 验证文档中的关键链路至少各抽查一个源码实现和一个测试，避免凭命名推断。
6. 最终按“先运行、再追链路、再做小改动”的方式安排实践，而不是只读源码。

## 建议技能

- `using-superpowers`：会话开始时检查并选择适用技能。
- `understand`：为整个 `apps/server` 建立结构与关系视图。
- `gitnexus-exploring`：如果仓库已建立 GitNexus 索引，用于追踪模块调用和依赖。
- `understand-explain`：深入解释入口、认证、Prisma、多租户、Creator 等关键文件或函数。
- `planning-with-files`：正式梳理会超过 5 次工具调用时，将计划、发现和进度持久化。
- `archify`：用户需要架构图、请求流程图或时序图时使用。
- `diagnose`：复现和分析迁移、CORS、上传等具体故障时使用。

## 安全与边界

- 不读取或输出 `.env` 中的密码、Token、密钥和数据库连接串。
- 不执行 `prisma reset`、`db push --force-reset`、Redis FLUSH 或其他破坏性脚本。
- 不把 `dist/` 和 `node_modules/` 当作源码依据。
- 不因用户要“学习计划”而直接重构代码；先交付说明和计划，代码变更需单独授权。
