# NestJS + Vue 生产环境部署教程设计说明

## 1. 目标

为 Nest-Admin-Soybean 编写一篇可直接执行的生产环境部署教程，覆盖 Vue 前端、NestJS 后端、PostgreSQL、Redis、Nginx 和 HTTPS，并提供以下两条完整部署路径：

1. Ubuntu + Node.js + pnpm + systemd 原生部署；
2. Docker Compose 全容器部署。

教程面向首次负责本项目上线的开发人员和运维人员。读者完成教程后，应能够完成首次部署、数据库升级、服务验证、日常运维、版本回滚及安全加固。

## 2. 文档位置与形式

- 正式教程文件：`docs/deploy-online/nestjs-vue-production-deployment.md`
- 文档形式：单篇 Markdown 主教程
- 章节结构：严格采用用户指定的 1–12 章结构
- 示例操作系统：Ubuntu Server 22.04 LTS / 24.04 LTS
- 示例域名：`admin.example.com`
- 示例安装根目录：`/opt/nest-admin-soybean`
- 示例运行用户：`nestadmin`

所有示例域名、密码、密钥和服务器地址均使用占位值，不复制仓库现有环境文件中的敏感内容。

## 3. 项目事实基线

教程中的命令和路径以当前仓库为准：

| 项目 | 当前事实 |
|---|---|
| Monorepo | pnpm 10.5.0 + Turbo |
| Node.js | `>=20.19.0`，示例使用 Node.js 20 LTS |
| 前端 | Vue 3 + Vite，生产构建目录为 `apps/web/dist` |
| 后端 | NestJS 10，生产入口为 `apps/server/dist/src/main.js` |
| 数据库 | PostgreSQL，Prisma 5 管理 Schema 和迁移 |
| 缓存与队列 | Redis 7，应用缓存和 Bull 队列共用 Redis 配置 |
| 后端端口 | 默认 `8080` |
| API 前缀 | 当前代码默认 `/api`，未启用 URI 版本前缀 |
| 健康检查 | `/api/health`、`/api/health/live`、`/api/health/ready` |
| 指标 | `/api/metrics` |
| 文件访问 | `/profile/` 和 `/public/` 由 NestJS 提供 |

教程不会把 Java 的 JAR 发布方式机械映射到 Node.js。对应关系为：

- JAR 包替换为 NestJS 编译产物、运行依赖、Prisma 文件和静态资源组成的发布包；
- JVM 参数替换为 Node.js 运行参数、环境变量和 systemd 资源限制；
- Spring Boot Actuator 替换为当前项目的 Terminus 健康检查与 Prometheus 指标。

## 4. 部署架构

### 4.1 systemd 原生部署

```text
Internet
   |
Nginx :80/:443
   |-- /               -> Vue dist 静态文件
   |-- /api/           -> NestJS 127.0.0.1:8080
   |-- /profile/       -> NestJS 127.0.0.1:8080
   `-- /public/        -> NestJS 127.0.0.1:8080
                              |-- PostgreSQL
                              `-- Redis
```

NestJS 由 systemd 管理，使用独立的 `nestadmin` 系统用户运行。PostgreSQL 和 Redis 可以使用系统服务，也可以单独使用 Compose；教程主示例使用系统服务，补充说明外部托管实例的连接方式。

### 4.2 Docker Compose 部署

```text
Internet
   |
宿主机 Nginx :80/:443
   |
Web 容器 :3000
   |-- Vue 静态文件
   |-- /api/ -> Server 容器 :8080
   `-- /profile/、/public/ -> Server 容器 :8080
                                  |-- PostgreSQL 容器
                                  `-- Redis 容器
```

Compose 方案复用仓库根目录 `docker-compose.yml`、`apps/server/Dockerfile`、`apps/web/Dockerfile` 和 `apps/web/nginx/default.conf`，通过宿主机 Nginx 统一处理公网 HTTPS。

## 5. 十二章内容设计

### 一、部署架构总览

- 给出两种部署拓扑、端口和请求链路；
- 说明同域 `/api` 代理可以避免浏览器跨域配置；
- 给出 systemd 与 Compose 的适用场景对照。

### 二、环境要求

- Ubuntu、CPU、内存、磁盘的最低和建议配置；
- Node.js 20、pnpm 10.5.0、Nginx、PostgreSQL 16、Redis 7；
- Docker Engine 与 Compose Plugin 的版本要求；
- 域名、DNS、80/443 端口和普通 sudo 用户要求。

### 三、构建生产发布包

- 在 CI 或构建机执行冻结依赖安装；
- 依次构建 `@nest-admin/types`、生成 Prisma Client、构建 NestJS、构建 Vue；
- 前端构建前统一生产 API 地址为同域 `/api`；
- 列出 systemd 发布包必须包含的文件；
- 说明不建议在生产服务器上进行完整源码构建。

### 四、生产配置文件

- 提供脱敏的后端 `.env.production` 模板；
- 说明 `DATABASE_URL`、Redis、JWT、上传目录、日志、租户、接口加密配置；
- 提供前端生产构建配置模板；
- 使用权限 `600`、独立 EnvironmentFile 和外部密钥管理建议；
- 禁止把真实密钥提交到 Git。

### 五、systemd 服务托管

- 创建运行用户和版本目录；
- 提供 `nest-admin-server.service` 完整单元文件；
- 设置工作目录、环境文件、启动命令、自动重启和优雅停止；
- 配置文件系统写入目录、日志查看和开机自启；
- 解释 NestJS 已监听 SIGTERM/SIGINT，可配合 systemd 优雅退出。

### 六、Nginx 反向代理与 HTTPS

- Vue history 路由使用 `try_files` 回退到 `index.html`；
- 代理 `/api/`、`/profile/`、`/public/`，保留原始路径；
- 设置真实 IP、上传大小、超时、安全响应头和静态资源缓存；
- 使用 Certbot 申请证书、启用 HTTP 到 HTTPS 跳转并测试自动续期；
- 限制 Swagger、健康详情和指标接口的公网访问。

### 七、数据库与 Redis 生产加固

- 独立账号、最小权限、网络访问控制、TLS、备份和恢复演练；
- Redis 密码、绑定地址、保护模式、持久化、内存淘汰策略；
- 迁移前备份，生产只运行 `prisma migrate deploy`；
- `prisma:seed:migration` 作为项目业务补丁需单独审核后执行；
- 明确禁止运行会清库的 `prisma:seed`、`prisma:init`、`prisma:reset`。

### 八、部署步骤与脚本

- 提供 systemd 首次部署的完整顺序；
- 提供 Docker Compose 首次部署的完整顺序；
- 分别提供幂等部署脚本模板；
- 每一步包含失败即停止、数据库备份、迁移、健康检查和回滚入口；
- 所有破坏性命令前添加醒目警告。

### 九、日志与监控

- systemd 使用 `journalctl`，应用文件日志使用 logrotate；
- Docker 使用 `docker compose logs` 和日志轮转限制；
- 使用 `/api/health/live`、`/api/health/ready` 和 `/api/metrics`；
- 给出基础告警指标：进程、HTTP 5xx、延迟、内存、磁盘、数据库、Redis。

### 十、安全加固清单

- 非 root 运行、最小端口、UFW、防暴力破解和 SSH 密钥；
- 强 JWT 密钥、RSA 密钥匹配、生产关闭调试信息；
- Swagger、Prometheus、数据库和 Redis 不直接暴露公网；
- 定期更新依赖、镜像和操作系统补丁；
- 上传目录权限、备份加密和敏感日志脱敏。

### 十一、回滚与版本管理

- 使用 `releases/<版本>`、`current` 软链接和共享目录；
- 应用回滚与数据库回滚分开处理；
- Prisma 迁移默认向前修复，禁止直接回退已执行迁移文件；
- Docker 使用不可变镜像标签或 Git SHA，禁止只依赖 `latest`；
- 给出回滚验证清单。

### 十二、与本地开发环境差异对照

- 对照进程管理、配置来源、API 地址、数据库、Redis、日志、HTTPS、热更新和迁移命令；
- 特别提醒开发环境 Redis DB 与生产 DB 编号不同；
- 说明生产构建后前端环境变量不可运行时修改，必须重新构建。

## 6. 当前仓库风险说明

教程必须明确指出但不静默掩盖以下现状：

1. `apps/server/src/main.ts` 当前只启用 `/api` 全局前缀，已移除 URI 版本控制；但 `apps/server/Dockerfile` 和根 `docker-compose.yml` 的健康检查仍请求 `/api/v1/health/ready`。教程使用正确地址 `/api/health/ready`，并将旧地址标记为部署前必须校正的配置风险。
2. `apps/web/.env.prod` 当前配置固定域名以及 `/prod-api`，而仓库 Nginx 配置只代理 `/api/`。教程要求生产构建统一使用同域 `/api`，不得直接照抄当前 `.env.prod`。
3. `apps/web/.env.coolify` 中仍出现 `/api/v1`。教程以当前 NestJS 路由实现为准，不沿用已经失效的版本前缀。
4. Docker 后端入口会自动执行 `prisma migrate deploy`。教程说明并发启动多个 Server 副本时，应使用独立迁移任务，避免每个副本同时执行迁移。
5. 仓库已有 PM2 部署脚本，但本教程的原生主线按照用户要求采用 systemd；PM2 只在补充说明中列为替代方案。
6. 当前仓库没有 `apps/server/prisma/migrations/`。教程把“在开发/发布流程生成、审核并提交基线迁移”列为生产部署阻断项，并分别说明空库应用基线和已有数据库登记基线的方法。
7. 后端使用 `path.join(process.cwd(), FILE_UPLOAD_LOCATION)` 解析上传目录，现有 Compose 的绝对路径会被拼接到工作目录。教程在 systemd 中使用共享目录软链接，在当前容器 Workdir 中使用可解析到卷的相对路径。

## 7. 错误处理与回滚原则

- 构建、上传、依赖安装、迁移、服务启动或健康检查任一步失败，部署流程立即停止；
- 数据库迁移前创建可验证的备份，并记录当前 Git SHA；
- 新版本只有在 `/api/health/ready` 返回成功后才切换流量；
- 应用回滚切回上一版本，数据库结构优先采用向前兼容和补偿迁移；
- 环境配置和上传文件放入共享目录，不随版本发布包覆盖；
- 教程中的脚本默认不自动删除旧版本，只按保留数量清理且要求操作者确认。

## 8. 文档验收标准

正式教程完成后必须满足：

1. 目录包含用户指定的 12 个章节且锚点可导航；
2. systemd 与 Docker Compose 均有从空服务器到可访问页面的完整步骤；
3. Vue history 路由、`/api`、`/profile` 和 `/public` 代理均有完整 Nginx 示例；
4. 所有项目命令、构建目录、启动入口和健康检查地址与当前源码一致；
5. 环境变量模板不包含真实密码、Token、私钥或仓库中的现有密钥；
6. 生产数据库章节明确区分迁移、业务数据补丁和破坏性初始化；
7. 提供部署前检查、部署后验证、故障排查、回滚和安全检查清单；
8. shell 示例通过静态检查，不包含未定义变量直接删除目录等危险写法；
9. 文档明确标出当前 Docker 健康检查和前端生产 API 配置的漂移风险；
10. 不要求读者参考未提供的外部私有配置才能完成部署。
11. 明确说明当前缺少 Prisma 基线迁移，且不使用 `db push` 或清库命令规避该阻断项。

## 9. 非目标

- 不在本次教程中设计 Kubernetes、Helm 或多地域高可用架构；
- 不替用户生成或提交真实生产密钥；
- 不自动执行生产数据库迁移、初始化或服务器操作；
- 不在编写教程时直接修改当前 Dockerfile、Compose 或 `.env.prod`，这些配置修复可作为后续独立实施任务。
