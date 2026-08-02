# Nest-Admin-Soybean 项目启动指南
## 启动说明
- 数据库重新生成：
pnpm --filter @nest-admin/server prisma:generate 2>&1



- docker启动

sudo docker-compose -f docker-compose-postgres.yml up -d


## 1. 项目简介

**Nest-Admin-Soybean** 是一个基于 **Vue3 + NestJS** 构建的现代化企业级后台管理系统（Admin Panel），相当于 RuoYi（若依）管理框架的前后端全栈版本。

**核心定位**：支持多租户（Multi-Tenant）SaaS 模式的权限管理系统，内置代码生成器、审计日志、文件管理、短信/邮件通知、定时任务、监控告警等全套企业级功能。

---

## 2. 技术栈

### 后端 — NestJS（Node.js）

| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | ^10.4.16 | 应用框架 |
| TypeScript | ^5.1.3 | 开发语言 |
| Prisma | ^5.17.0 | ORM，连接 PostgreSQL |
| PostgreSQL | - | 主数据库 |
| Redis | ^5.4.1 (ioredis) | 缓存、Token黑名单、限流 |
| Bull | ^4.16.5 | 异步任务队列（定时任务、消息通知） |
| Passport + JWT | - | 认证与授权 |
| OpenTelemetry | ^0.211.0 | 分布式链路追踪 |
| Prometheus | ^15.1.3 | 指标监控 |
| Pino | ^13.1.3 | 结构化日志 |
| Jest | ^29.5.0 | 单元/集成/E2E测试 |
| Swagger | ^11.2.3 | API 文档 |
| bcryptjs | ^3.0.2 | 密码哈希 |
| exceljs | ^4.4.0 | Excel 导入导出 |
| crypto-js | 4.2.0 | AES 加密 |
| nodemailer | ^7.0.12 | 邮件发送 |
| qrcode | ^1.5.4 | 二维码（MFA） |
| helmet / compression / rate-limit | - | 安全中间件 |
| cockroachdb | - | 审计日志专用存储 |

### 前端 — Vue 3（TypeScript）

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.5.24 | 前端框架 |
| TypeScript | 5.9.3 | 开发语言 |
| Vite | 7.2.2 | 构建工具 |
| Naive UI | 2.43.1 | 组件库 |
| Pinia | 3.0.4 | 状态管理 |
| Vue Router | 4.6.3 | 路由（基于 @elegant-router） |
| Element Plus | ^2.12.0 | 备用组件库 |
| UnoCSS | 66.5.6 | 原子化 CSS |
| Axios / Alova | - | HTTP 客户端 |
| ECharts | 6.0.0 | 数据可视化 |
| Monaco Editor | ^0.52.2 | 代码编辑器 |
| TinyMCE | - | 富文本编辑器 |
| Vitest | ^4.0.16 | 单元测试 |
| Cypress | ^15.8.2 | E2E 测试 |

### 工程化

| 技术 | 用途 |
|------|------|
| pnpm (10.5.0) | 包管理器（monorepo） |
| Turbo | ^2.3.0 | monorepo 构建编排 |
| ESLint + Prettier | 代码规范 |
| Husky + commitlint | Git 提交规范 |
| Docker / Coolify | 容器化部署 |

### 共享包（packages/）

| 包名 | 用途 |
|------|------|
| `@nest-admin/types` | 前后端共享类型定义 |
| `apps/web/packages/` 内部 | alova、axios、hooks、materials、tinymce、utils 等内部库 |

---

## 3. 目录结构

```
Nest-Admin-Soybean/
├── apps/
│   ├── web/                          # 🖥 前端（Vue3 + Vite）
│   │   ├── src/
│   │   │   ├── views/                # 页面视图
│   │   │   │   ├── _builtin/         # 内置页面（登录、403、404、500）
│   │   │   │   ├── home/             # 首页
│   │   │   │   ├── monitor/          # 监控模块（缓存、任务、登录日志、在线用户、操作日志、服务器状态）
│   │   │   │   ├── system/           # 系统管理（用户、角色、菜单、部门、字典、配置等）
│   │   │   │   └── tool/             # 工具模块（代码生成器、数据源、Swagger、表单构建）
│   │   │   ├── components/
│   │   │   │   ├── common/           # 通用业务组件（数据表格、语言切换、暗色模式等）
│   │   │   │   ├── custom/           # 自定义UI组件（dict-select、dept-tree、oss-upload等30+个）
│   │   │   │   ├── advanced/         # 高级组件（列设置、行选择提示、侧边布局）
│   │   │   │   ├── drag-upload-overlay/
│   │   │   │   ├── stateless/        # 无状态基础组件
│   │   │   │   ├── upload-panel/
│   │   │   │   └── standard/
│   │   │   ├── router/
│   │   │   │   ├── elegant/          # 基于 @elegant-router 的路由（自动生成）
│   │   │   │   │   ├── routes.ts     # 路由定义
│   │   │   │   │   ├── imports.ts    # 视图懒加载映射
│   │   │   │   │   └── transform.ts  # 路由转换
│   │   │   │   ├── guard/            # 路由守卫
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── common/           # 通用hooks（loading、table、form、icon等）
│   │   │   │   └── business/         # 业务hooks（auth、dict、captcha、download等）
│   │   │   ├── store/                # Pinia stores
│   │   │   │   ├── modules/          # 模块化store（app、auth、dict、theme、route等）
│   │   │   │   └── plugins/
│   │   │   ├── service/              # API 调用层
│   │   │   │   ├── api/              # 接口定义（按模块组织：auth/system/monitor/tool）
│   │   │   │   └── request/          # axios 封装（拦截器、加密、错误处理）
│   │   │   ├── plugins/              # 插件初始化（dayjs、iconify、loading、echarts等）
│   │   │   ├── locales/              # 国际化（i18n）（中文 + 英文）
│   │   │   ├── layouts/              # 布局组件（base-layout、blank-layout）
│   │   │   ├── theme/                # 主题系统（preset/NaiveUI主题覆盖、settings/vars）
│   │   │   ├── styles/               # 全局样式（CSS + SCSS）
│   │   │   ├── constants/            # 前端常量
│   │   │   ├── enum/                 # 前端枚举
│   │   │   ├── typings/              # TypeScript 类型声明
│   │   │   └── utils/                # 工具函数
│   │   ├── build/                    # ⚠️ Vite 构建配置（本次新增）
│   │   │   ├── plugins/index.ts     # Vite 插件列表
│   │   │   └── config/index.ts      # 代理配置、构建时间
│   │   ├── vite.config.ts           # Vite 主配置
│   │   ├── vitest.config.ts
│   │   ├── tsconfig.json
│   │   ├── uno.config.ts            # UnoCSS 配置
│   │   ├── cypress.config.ts
│   │   ├── packages/                # 前端内部monorepo包
│   │   │   ├── alova/ hooks/ materials/ tinymce/ utils/ ...
│   │   └── public/
│   └── server/                       # 🔧 后端（NestJS）
│       ├── src/
│       │   ├── main.ts               # 应用入口
│       │   ├── app.module.ts
│       │   ├── module/               # 业务模块（按功能拆分）
│       │   │   ├── auth/             # 认证模块
│       │   │   ├── user/             # 用户管理
│       │   │   ├── role/             # 角色管理
│       │   │   ├── menu/             # 菜单管理
│       │   │   ├── dept/             # 部门管理
│       │   │   ├── dict/             # 字典管理
│       │   │   ├── config/           # 系统配置
│       │   │   ├── client/           # 客户端管理
│       │   │   ├── file-manager/     # 文件管理
│       │   │   ├── oss/ oss-config/  # 对象存储
│       │   │   ├── post/             # 岗位管理
│       │   │   ├── notice/           # 通知公告
│       │   │   ├── notify/           # 站内信
│       │   │   │   ├── notify-template/ notify-message/
│       │   │   ├── sms/              # 短信模块
│       │   │   │   ├── sms-channel/ sms-template/ sms-log/
│       │   │   ├── mail/             # 邮件模块
│       │   │   │   ├── mail-account/ mail-template/ mail-log/
│       │   │   ├── tenant/           # 租户管理（多租户SaaS核心）
│       │   │   │   ├── tenant-package/ tenant-quota/ tenant-audit/
│       │   │   │   ├── services/ guards/ constants/
│       │   │   ├── tool/             # 代码生成器/表单构建/数据源
│       │   │   │   ├── datasource/ gen-table/ gen-history/ gen-template/ inference/ preview/
│       │   │   │   └── utils/
│       │   │   ├── monitor/          # 监控模块
│       │   │   │   ├── cache/ job/ loginlog/ online/ operlog/ server/
│       │   │   │   └── dto/
│       │   │   ├── backup/           # 数据备份
│       │   │   ├── common/           # 公共模块（axios、redis、bull）
│       │   │   └── main/             # 主入口 API（登录、首页数据）
│       │   ├── system.module.ts      # 系统模块聚合导入
│       │   ├── config/               # 配置层（环境验证、配置转换）
│       │   ├── core/                 # 核心基础设施
│       │   │   ├── constants/ decorators/ filters/ guards/ interceptors/ middleware/
│       │   ├── shared/               # 共享代码
│       │   │   ├── constants/ entities/ enums/ events/ exceptions/
│       │   │   ├── dto/ response/ services/ utils/ validators/
│       │   ├── security/             # 安全层
│       │   │   ├── crypto/ login/ mfa/
│       │   ├── tenant/               # 多租户基础设施
│       │   │   ├── services/ guards/ constants/ context/ decorators/
│       │   ├── infrastructure/       # 基础设施层
│       │   │   ├── prisma/ logging/ cache/ dataloader/ repository/
│       │   ├── resilience/           # 弹性架构
│       │   │   └── circuit-breaker/
│       │   ├── observability/        # 可观测性
│       │   │   ├── tracing/ metrics/ audit/ health/
│       │   └── test-utils/
│       ├── prisma/
│       │   ├── schema.prisma        # 数据库 Schema（41+ 个模型，~1100 行）
│       │   └── migrations/
│       └── test/                    # 后端测试
├── packages/
│   └── types/                       # 前后端共享类型
│       ├── src/
│       ├── dist/
│       └── tsup.config.ts
├── docs/                            # 项目文档
│   ├── development/ guide/ features/ specs/ adrs/ deploy-online/ deployment/
├── scripts/                         # 部署、日志、密钥生成脚本
├── docker-compose.yml
├── turbo.json                       # Turbo monorepo 配置
├── pnpm-workspace.yaml
└── package.json                     # 根 package.json
```

---

## 4. 命令速查

### 开发

```bash
# 同时启动前端 + 后端
pnpm dev

# 仅启动前端（默认 dev 模式，端口 9527）
pnpm dev:web          # = pnpm --filter @nest-admin/web dev

# 仅启动后端（watch 模式，端口 3000）
pnpm dev:server       # = pnpm --filter @nest-admin/server dev
```

### 构建

```bash
# 构建所有
pnpm build

# 前端构建（多环境）
pnpm build:web        # prod 模式
pnpm --filter @nest-admin/web build:coolify   # Coolify 部署模式
pnpm --filter @nest-admin/web build:dev       # dev 模式
pnpm --filter @nest-admin/web build:test      # test 模式

# 后端构建
pnpm build:server
pnpm --filter @nest-admin/server build:prod   # production
```

### 测试

```bash
# 前端
pnpm --filter @nest-admin/web test               # 单元测试（vitest）
pnpm --filter @nest-admin/web test:watch          # 监听模式
pnpm --filter @nest-admin/web test:e2e            # Cypress E2E
pnpm --filter @nest-admin/web typecheck           # vue-tsc 类型检查
pnpm --filter @nest-admin/web lint                # ESLint

# 后端
pnpm --filter @nest-admin/server test             # Jest 单元测试
pnpm --filter @nest-admin/server test:cov          # 覆盖率报告
pnpm --filter @nest-admin/server test:e2e          # E2E 测试
pnpm --filter @nest-admin/server test:integration  # 集成测试
pnpm --filter @nest-admin/server test:all          # 全部测试
```

### Prisma 数据库

```bash
pnpm --filter @nest-admin/server prisma:generate  # 生成 Client
pnpm --filter @nest-admin/server prisma:migrate    # 迁移开发库
pnpm --filter @nest-admin/server prisma:deploy     # 迁移生产库
pnpm --filter @nest-admin/server prisma:reset      # 重置数据库 + 种子
```

### 部署

```bash
pnpm --filter @nest-admin/server deploy:prod
pnpm --filter @nest-admin/server deploy:dev
pnpm --filter @nest-admin/server deploy:test
```

### CI/CD

GitHub Actions（`.github/workflows/ci.yml`）在 `push` 到 `main`/`develop`/`main-refactor` 时触发：

1. `pnpm install --frozen-lockfile`
2. `prisma:generate`
3. `pnpm --filter @nest-admin/types build`
4. `pnpm --filter @nest-admin/server build`
5. `pnpm --filter @nest-admin/web build:coolify`
6. `docker compose build server web`

---

## 5. 新增页面（前端）

### 步骤概览

新增一个管理页面需要按以下 4 步操作：

```
后端（Controller → Service → Repository → DTO）
       ↓
数据库（Prisma Schema → Migration）
       ↓
前端 API（service/api/<module>.ts）
       ↓
前端页面（views/<module>/index.vue + modules/）
```

### 详细步骤

#### 第一步：后端

参考现有模块的结构（以 `system/user` 为例），在 `apps/server/src/module/system/<module>/` 下：

```
<module>/
├── <module>.controller.ts    # REST 路由，装饰器标记权限
├── <module>.service.ts       # 聚合服务（协调子服务）
├── <module>.repository.ts    # Prisma Repository（CRUD 数据访问）
├── <module>.module.ts        # NestJS 模块声明
├── dto/                      # 请求/响应 DTO（按职责拆分多个文件）
│   ├── create-<module>.request.dto.ts
│   ├── update-<module>.request.dto.ts
│   ├── list-<module>.request.dto.ts
│   └── responses/
│       └── <module>.response.dto.ts
└── services/                 # 子服务（按职责拆分）
    ├── <module>-crud.service.ts
    ├── <module>-auth.service.ts
    ├── <module>-batch.service.ts
    └── ...
```

- 若需要新增数据库表，先在 `prisma/schema.prisma` 中添加模型，运行 `prisma:migrate`
- Controller 上使用 `@ApiTags`、`@ApiBearerAuth`、`@RequirePermission` 装饰器声明 API 文档和权限控制

#### 第二步：前端 API 层

在 `apps/web/src/service/api/<module>/index.ts` 中导出接口函数，或者新增文件后在此汇总：

```ts
// apps/web/src/service/api/<module>/index.ts
export * from './<entity>';   // 每个实体一个文件
```

#### 第三步：添加路由

编辑 `apps/web/src/router/elegant/routes.ts`，在 `generatedRoutes` 数组中添加路由条目：

```ts
{
  name: 'module_action',          // 路由 key（对应 imports.ts 的 lazy import）
  path: '/module/action',
  component: 'view.module_action', // layout.view 格式
  meta: {
    title: 'module_action',
    i18nKey: 'route.module_action',
    icon: 'mdi:icon-name',
    order: 3,
    localIcon: 'menu-name'        // 可选：使用本地 SVG 图标
  }
}
```

然后运行 `pnpm gen-route`（`sa gen-route`）重新生成 `imports.ts`。

#### 第四步：前端页面

在 `apps/web/src/views/<module>/` 下创建视图，页面结构通常为：

```
<module>/
├── index.vue                    # 主页面（含表格、搜索、分页）
└── modules/                     # 拆分子组件
    ├── <module>-search.vue      # 搜索表单
    ├── <module>-operate-drawer.vue  # 编辑抽屉
    └── ...
```

通用 hooks 推荐使用：
- `useTable()` — 表格数据加载、分页、搜索
- `useTableOperate()` — 新增/编辑/删除操作状态
- `useAuth()` — 权限校验 `hasAuth('module:action:btn')`
- `useDownload()` — 文件下载

---

## 6. 当前项目维护风险

### ⚠️ 高风险

1. **本次修复：`build/` 目录缺失**
   `vite.config.ts` 在 `866475d` (Refactor:重构) 提交中新增，但对应的 `build/plugins/` 和 `build/config/` 从未被创建和提交。说明大重构提交中可能存在大量"未完成"的文件引入。

2. **本次修复：`src/views/tool/build/index.vue` 缺失**
   `elegant-router` 在 `imports.ts` 中引用了 `tool_build` 视图，但该文件从未存在。说明路由配置和视图文件之间存在维护脱节，`gen-route` 流程可能有缺口。

3. **`build/` 目录未被 `.gitignore` 保护，但实际不存在**
   常规情况下 `build/` 应被 `.gitignore` 忽略，但此项目没有，而 `vite.config.ts` 又以相对路径硬编码引用，形成了 git + Vite 的语义矛盾。下次克隆项目的开发者会遇到完全相同的启动失败。

4. **`prisma/schema.prisma` ~1100 行单体文件**
   41+ 个模型都定义在一个文件中，添加新表时迁移冲突风险高；当前多租户模型（SysTenant/Quota/Billing/AuditLog 等）是近期迭代添加，缺乏文档注释，理解成本高。

### 🟡 中风险

5. **后端模块内服务拆分冗余**
   参考 `user` 模块（7 个子服务：auth/crud/batch/export/profile/query/role），但许多中小模块实际只有一两个接口，这增加了理解和维护的认知负担，新贡献者需要先花时间"读懂所有服务"才能改一行代码。

6. **前端 `@sa/*` 内部包与 Node 依赖的版本不匹配**
   前端 `node_modules` 和 `apps/web/node_modules` 是两个独立目录，`@sa/axios`、`@sa/utils` 等 workspace 包的版本与安装节点存在兼容性风险，需要严格遵循 `pnpm` workspace 的分辨规则。

7. **`packages/types` 共享类型包存在但未出现在 `imports.ts` 验证路径中**
   共享类型包 (`@nest-admin/types`) 在 CI 中有独立的 build 步骤，但项目实际 API 调用的类型定义主要来自前端 `typings/` 目录下的 `app.d.ts`（~34K 自动生成），并非以共享包为单一真实来源，存在"类型漂移"风险。

8. **`elegant-router` 自动生成代码未受版本管控**
   `imports.ts` 和 `routes.ts` 是自动生成的，若手动修改其中一个而另一个未同步更新，路由会静默失效。目前流程依赖 `pnpm gen-route` 手动触发，容易在协作时遗漏。

9. **后端 `prisma/schema.prisma` 中 `generate` 指令与 CI 分离**
   CI 中有 `prisma:generate` 步骤，但本地开发需要手动执行；若忘记执行，类型定义与实际 schema 不一致会导致编译通过但运行时错误。

10. **`apps/server/src/test-utils/` 目录存在但未被 CI 覆盖**
    存在 `jest-e2e.json` 和 `jest-integration.json` 但 CI 中并未执行对应步骤，测试覆盖率数据可能低于预期。

---

## 7. 快速导航

| 目的 | 路径 |
|------|------|
| 后端入口 | `apps/server/src/main.ts` |
| 前端入口 | `apps/web/src/main.ts` |
| 路由定义 | `apps/web/src/router/elegant/routes.ts` |
| 后端 Prisma Schema | `apps/server/prisma/schema.prisma` |
| 共享类型 | `packages/types/src/` |
| 项目文档 | `docs/` |
| CI/CD 配置 | `.github/workflows/ci.yml` |
| 部署配置 | `docker-compose.yml` |
| 开发文档记录 | `开发文档记录.md` |
