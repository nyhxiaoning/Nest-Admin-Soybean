# Nest-Admin-Soybean Agent Guide

## Project Overview

- 本项目是基于 **Vue 3 + TypeScript + Vite** 与 **NestJS + TypeScript + Prisma** 的企业级后台管理系统。
- 项目采用 pnpm workspace + Turbo 的 monorepo 结构，包管理器固定为 **pnpm 10.5.0**。
- Node.js 版本要求：**>= 20.19.0**。
- 前端 UI 以 **Naive UI 2.43.1** 为主，Element Plus 2.12.x 为补充；样式使用 **UnoCSS 66.5.6 + SCSS/CSS**。
- 后端使用 NestJS 10.4.x、Prisma 5.17.x、PostgreSQL、Redis 和 Bull，支持多租户、权限管理、审计、监控及消息任务。
- 修改前先阅读 `start.md`；涉及历史故障或维护风险时，同时阅读 `开发文档记录.md`。

## Project Structure

```text
apps/
├── web/                         # Vue 3 前端应用
│   ├── build/                   # Vite 构建配置；属于必需源码，不是构建产物
│   ├── packages/                # @sa/* 前端内部 workspace 包
│   └── src/
│       ├── components/          # 通用、自定义及高级组件
│       ├── views/               # 页面视图，按业务模块组织
│       ├── hooks/               # 通用与业务组合式函数
│       ├── service/             # API 定义及请求封装
│       ├── store/               # Pinia 状态管理
│       ├── router/              # 路由、守卫及 elegant-router 生成文件
│       ├── layouts/             # 页面布局
│       ├── plugins/             # 前端插件初始化
│       ├── locales/             # 国际化资源
│       ├── theme/               # 主题配置
│       ├── styles/              # 全局 CSS/SCSS
│       ├── typings/             # TypeScript 类型声明
│       ├── constants/           # 常量
│       ├── enum/                # 枚举
│       └── utils/               # 工具函数
├── server/                      # NestJS 后端应用
│   ├── prisma/                  # Prisma schema、迁移与种子
│   ├── test/                    # E2E/集成测试
│   └── src/
│       ├── module/              # 业务模块
│       ├── core/                # 守卫、过滤器、拦截器等核心能力
│       ├── shared/              # DTO、服务、工具及通用定义
│       ├── infrastructure/      # Prisma、缓存、日志、仓储等基础设施
│       ├── tenant/              # 多租户基础设施
│       ├── security/            # 加密、登录和 MFA
│       └── observability/       # 链路、指标、审计及健康检查
└── ...
packages/
└── types/                       # @nest-admin/types 前后端共享类型
docs/                            # 项目文档
scripts/                         # 部署及运维脚本
```

## Coding Style

### TypeScript and Vue

- 遵循现有 ESLint 和 Prettier 配置：单引号、分号、2 空格缩进、尾随逗号、每行最多 120 字符。
- Vue 组件优先使用 `<script setup lang="ts">` 和 Composition API。
- Props 使用 `interface Props`，并通过 `defineProps<Props>()`；默认值使用 `withDefaults`。
- 优先复用 `hooks/`、`components/`、`service/` 和 `@sa/*` workspace 包中的既有能力。
- 不新增 `any`；无法确定的外部数据先使用 `unknown`，经类型守卫或校验后再使用。维护后端遗留代码时也应逐步收紧类型。
- 列表渲染必须提供稳定且唯一的 `key`，渲染路径中不得执行昂贵计算或产生副作用。
- 前端业务页面与组件沿用现有 kebab-case 文件命名；NestJS 文件沿用 `*.module.ts`、`*.service.ts`、`*.controller.ts`、`*.dto.ts` 等约定。

### Styles

- 优先使用 UnoCSS 原子类和项目主题变量；复杂局部样式使用 `<style scoped lang="scss">`。
- 避免内联 `style`，不要硬编码可由主题变量表达的颜色、间距或尺寸。
- 新增页面应兼容明暗主题，并优先使用 Naive UI；仅在现有功能依赖时使用 Element Plus。

### Imports and Types

- `@/*` 映射到当前应用的 `src/*`；前端另有 `~/*` 映射到 `apps/web/*`。
- 跨前后端共享的稳定类型优先放入 `packages/types`，避免在前端声明文件和后端 DTO 中重复维护同一结构。
- 不通过深层相对路径绕过模块公开入口。

### Backend and Database

- 按 NestJS 模块边界组织 controller、service、DTO 和测试，优先复用现有 guard、decorator、interceptor 与 shared 能力。
- 所有输入通过 DTO 与 `class-validator` 校验；不要在日志、异常或响应中泄露密码、Token、密钥等敏感信息。
- 新增业务查询必须考虑租户隔离、权限校验和审计要求。
- 修改 `apps/server/prisma/schema.prisma` 后必须运行 `prisma:generate`；需要迁移时创建并审查 Prisma migration，不得直接修改生产数据库。

## Build Commands

```bash
pnpm install --frozen-lockfile                    # 安装依赖
pnpm dev                                          # 同时启动前端与后端
pnpm dev:web                                      # 仅启动前端，默认端口 9527
pnpm dev:server                                   # 仅启动后端，默认端口 3000
pnpm build                                        # 构建全部 workspace
pnpm build:web                                    # 构建前端
pnpm build:server                                 # 构建后端
pnpm lint                                         # 运行全部 lint
pnpm typecheck                                    # 运行全部类型检查
pnpm --filter @nest-admin/web format              # 格式化前端
pnpm --filter @nest-admin/server format           # 格式化后端
pnpm --filter @nest-admin/web test                 # 前端 Vitest
pnpm --filter @nest-admin/web test:e2e             # 前端 Cypress E2E
pnpm --filter @nest-admin/server test              # 后端 Jest
pnpm --filter @nest-admin/server test:e2e          # 后端 E2E
pnpm --filter @nest-admin/server test:integration  # 后端集成测试
pnpm --filter @nest-admin/server prisma:generate   # 生成 Prisma Client
```

变更应执行与影响范围匹配的 lint、typecheck、测试和构建；全栈或共享类型变更应验证前后端两侧。

## Generated and Sensitive Files

- 不修改 `dist/`、`.turbo/`、coverage、Cypress 输出或其他构建/测试产物。
- `apps/web/build/` 是 Vite 必需源码，必须纳入版本管理；不要把它当作构建产物删除或忽略。
- `apps/web/src/router/elegant/imports.ts`、`routes.ts` 等由 elegant-router 管理。路由变更后使用 `pnpm --filter @nest-admin/web gen-route` 保持生成文件同步，避免只手改其中一个文件。
- 新增路由前确认对应 `apps/web/src/views/**/index.vue` 已存在，防止生成的懒加载映射指向缺失页面。
- 不提交 `.env`、私钥、Token、数据库凭据或其他敏感信息；仅维护脱敏的示例配置。
- 不主动修改 `pnpm-lock.yaml`；只有依赖确实发生变化时才通过 pnpm 生成并提交对应 lockfile 变更。

## Never Rules

- Never 修改 `node_modules/` 或任何构建产物。
- Never 删除或忽略 `apps/web/build/`。
- Never 在未同步生成路由和视图文件的情况下提交路由变更。
- Never 在修改 Prisma schema 后跳过 `prisma:generate` 和必要的迁移验证。
- Never 使用 `any` 逃避类型设计，或在渲染路径执行耗时操作。
- Never 在列表渲染中省略稳定的 `key`。
- Never 硬编码或提交敏感信息。
- Never 无关修改 lockfile，或使用 npm/yarn 混装依赖。
- Never 在没有明确授权时重置数据库、清空 Redis 或执行破坏性迁移。

## Commit Convention

- 格式：`type(scope): description`
- 类型：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`
- description 使用简洁的祈使语气，scope 优先使用 `web`、`server`、`types`、`prisma`、具体业务模块或基础设施名称。
- 提交前确保 commitlint、相关 lint、类型检查和测试通过。
