# Nest-Admin-Soybean 生产环境部署教程

> 适用项目：Vue 3 + Vite 前端、NestJS + Prisma 后端、PostgreSQL、Redis。  
> 本文同时提供 systemd 原生部署和 Docker Compose 全容器部署两套方案。

> [!CAUTION]
> 生产环境不得执行 `prisma:seed`、`prisma:init`、`prisma:reset`，也不得执行带有
> `--force-reset` 或 `--accept-data-loss` 的数据库命令。这些命令会重建数据库或删除数据。

本文以 Ubuntu Server 22.04/24.04 和域名 `admin.example.com` 为例。请将示例域名、密码、目录和 IP 替换成自己的值。文档中的 `CHANGE_ME` 不是可直接用于生产环境的密码。

## 目录

1. [部署架构总览](#一部署架构总览)
2. [环境要求](#二环境要求)
3. [构建生产发布包](#三构建生产发布包)
4. [生产配置文件](#四生产配置文件)
5. [systemd 服务托管](#五systemd-服务托管)
6. [Nginx 反向代理与 HTTPS](#六nginx-反向代理与-https)
7. [数据库与 Redis 生产加固](#七数据库与-redis-生产加固)
8. [部署步骤与脚本](#八部署步骤与脚本)
9. [日志与监控](#九日志与监控)
10. [安全加固清单](#十安全加固清单)
11. [回滚与版本管理](#十一回滚与版本管理)
12. [与本地开发环境差异对照](#十二与本地开发环境差异对照)

---

## 一、部署架构总览

### 1.1 项目生产入口

当前仓库的生产部署事实如下：

| 项目 | 当前值 |
|---|---|
| Node.js | `>=20.19.0`，本文使用 Node.js 20 LTS |
| pnpm | `10.5.0` |
| 前端产物 | `apps/web/dist` |
| 后端产物 | `apps/server/dist` |
| 后端启动文件 | `apps/server/dist/src/main.js` |
| 后端监听端口 | `8080` |
| API 全局前缀 | `/api` |
| 就绪检查 | `/api/health/ready` |
| 存活检查 | `/api/health/live` |
| Prometheus 指标 | `/api/metrics` |
| 上传文件 | `/profile/` |
| 后端公共静态文件 | `/public/` |

当前 `apps/server/src/main.ts` 已移除 URI 版本前缀，因此正式地址是 `/api/...`，不是 `/api/v1/...`。

### 1.2 方案一：systemd 原生部署

```text
浏览器
  |
  | HTTPS :443
  v
宿主机 Nginx
  |-- /              -> Vue 静态文件 apps/web/dist
  |-- /api/          -> NestJS 127.0.0.1:8080
  |-- /profile/      -> NestJS 127.0.0.1:8080
  `-- /public/       -> NestJS 127.0.0.1:8080
                              |-- PostgreSQL 16
                              `-- Redis 7
```

NestJS 由 systemd 负责开机启动、崩溃重启和优雅停止。Nginx、PostgreSQL、Redis 使用系统服务或企业托管实例。

### 1.3 方案二：Docker Compose 全容器部署

```text
浏览器
  |
  | HTTPS :443
  v
宿主机 Nginx
  |
  `-- 127.0.0.1:3000 -> Web/Nginx 容器
                         |-- /              -> Vue 静态文件
                         |-- /api/          -> Server 容器 :8080
                         |-- /profile/      -> Server 容器 :8080
                         `-- /public/       -> Server 容器 :8080
                                                    |-- PostgreSQL 容器
                                                    `-- Redis 容器
```

仓库根目录的 `docker-compose.yml` 已定义 `postgres`、`redis`、`server`、`web` 四个服务。宿主机 Nginx 只负责公网域名、HTTPS 和转发到 Web 容器。

### 1.4 两种方案如何选择

| 对比项 | systemd | Docker Compose |
|---|---|---|
| 上手成本 | 熟悉 Linux 服务即可 | 需要理解镜像、卷和容器网络 |
| 运行隔离 | 依赖宿主机环境 | 隔离更完整 |
| 资源开销 | 较低 | 略高 |
| 版本一致性 | 依赖服务器 Node/pnpm | 镜像内版本固定 |
| 回滚 | 切换 `current` 软链接 | 切换不可变镜像标签 |
| 数据服务 | 系统服务或云数据库 | Compose 内置或云数据库 |
| 适用场景 | 单机、传统运维、需 systemd 标准化 | 快速交付、环境一致性优先 |

如果团队没有既定标准，推荐优先采用 Docker Compose；如果公司统一使用 systemd 管理 Node.js 服务，则采用原生方案。

### 1.5 请求链路约定

生产环境使用同域 API：

```text
https://admin.example.com/           前端页面
https://admin.example.com/api/...    NestJS API
https://admin.example.com/profile/   上传文件
https://admin.example.com/public/    后端公共静态文件
```

这样不需要额外开放 `8080` 端口，也不需要为浏览器配置跨域。安全组和防火墙只向公网开放 `80`、`443`，SSH `22` 应限制来源 IP。

---

## 二、环境要求

### 2.1 服务器规格

| 场景 | CPU | 内存 | 磁盘 | 说明 |
|---|---:|---:|---:|---|
| 最低可运行 | 2 核 | 4 GB | 40 GB SSD | 仅适合低流量测试或内部系统 |
| 推荐生产 | 4 核 | 8 GB | 100 GB SSD | 前后端、数据库和 Redis 同机 |
| 中高流量 | 8 核以上 | 16 GB 以上 | 按数据量规划 | 建议数据库和 Redis 独立部署 |

Vite 构建、TypeScript 编译和 `sharp` 等原生依赖会占用较多内存。低内存服务器应在 CI 构建，不要在生产主机直接构建前端。

### 2.2 通用要求

- Ubuntu Server 22.04 LTS 或 24.04 LTS；
- 一个可使用 `sudo` 的普通运维账号；
- 已解析到服务器公网 IP 的域名，例如 `admin.example.com`；
- 云安全组允许 80/443，SSH 端口仅允许可信来源；
- 服务器时间同步正常；
- 生产密码和密钥由密码管理器或密钥服务保存。

```bash
timedatectl status
getent hosts admin.example.com
```

### 2.3 systemd 方案依赖

| 软件 | 要求 |
|---|---|
| Node.js | 20 LTS，且版本不低于 20.19.0 |
| pnpm | 10.5.0 |
| Nginx | Ubuntu 仓库稳定版 |
| PostgreSQL | 16 |
| Redis | 7 |
| Certbot | Ubuntu 仓库版本 |

安装基础工具：

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx postgresql-client redis-tools certbot python3-certbot-nginx
```

安装 Node.js 时可以使用企业内部镜像、NodeSource 或预装的版本管理方案。安装后固定 pnpm：

```bash
sudo corepack enable
corepack prepare pnpm@10.5.0 --activate
node --version
pnpm --version
```

如果 `corepack` 修改系统目录时权限不足，使用管理员预装的 Node.js，或由管理员执行 `corepack enable`，不要用不受控的全局 npm 包替换锁定版本。

### 2.4 Docker Compose 方案依赖

- Docker Engine 24 或更高版本；
- Docker Compose Plugin 2.20 或更高版本；
- Nginx 与 Certbot 仍安装在宿主机上；
- 部署账号应加入 `docker` 组，或对 Docker 命令使用 `sudo`。

验证：

```bash
docker --version
docker compose version
nginx -v
```

> [!WARNING]
> `docker` 组等价于拥有较高的宿主机权限，只允许可信运维账号加入。

### 2.5 软件版本检查

systemd 方案执行：

```bash
node --version
pnpm --version
nginx -v
psql --version
redis-cli --version
```

Docker Compose 方案执行：

```bash
docker --version
docker compose version
nginx -v
```

---

## 三、构建生产发布包

### 3.1 为什么不是打包 JAR

Java 项目通常发布单个 JAR。本项目是 pnpm monorepo，发布物由以下部分共同组成：

- NestJS 编译产物 `apps/server/dist`；
- Node.js 运行依赖；
- Prisma Client、`apps/server/prisma/schema.prisma` 和迁移目录；
- `apps/server/public` 等运行时静态资源；
- `@nest-admin/types` 工作区包；
- Vue 静态文件 `apps/web/dist`；
- 不进入 Git 的生产环境变量和共享上传目录。

Docker 方案把这些内容封装进镜像；systemd 方案使用带版本号的发布目录。

### 3.2 构建前检查

在干净的 Linux 构建机或 CI 中执行。构建机架构应与 systemd 目标服务器一致，因为项目包含 `sharp` 等原生依赖。

```bash
git status --short
git rev-parse --short HEAD
node --version
pnpm --version
```

工作区必须干净，部署日志应记录 Git SHA。

### 3.3 正确构建顺序

在仓库根目录执行：

```bash
corepack enable
corepack prepare pnpm@10.5.0 --activate
pnpm install --frozen-lockfile
pnpm --filter @nest-admin/types build
pnpm --filter @nest-admin/server prisma:generate
pnpm --filter @nest-admin/server build:prod
NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @nest-admin/web build
```

构建成功后检查：

```bash
test -f apps/server/dist/src/main.js
test -f apps/web/dist/index.html
test -f apps/server/prisma/schema.prisma
```

### 3.4 前端生产 API 必须在构建前确定

本项目的 `getServiceBaseURL()` 会把 `VITE_SERVICE_BASE_URL` 与 `VITE_APP_BASE_API` 拼接。使用同域 `/api` 时，正确组合是：

```dotenv
VITE_SERVICE_BASE_URL=
VITE_APP_BASE_API=/api
VITE_HTTP_PROXY=N
```

不要同时把两个变量都设置成 `/api`，否则 HTTP 请求可能变成 `/api/api/...`。`VITE_APP_BASE_API=/api` 也供 SSE 和 WebSocket 地址使用。

当前 `apps/web/.env.prod` 中存在固定域名和 `/prod-api`，与仓库 Nginx 的 `/api/` 代理不一致。正式构建前必须使用第四章的生产配置覆盖它。

### 3.5 systemd 发布目录应包含什么

推荐保留以下内容：

```text
release/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
├── node_modules/
├── packages/types/
├── apps/server/
│   ├── dist/
│   ├── node_modules/
│   ├── package.json
│   ├── prisma/
│   └── public/
└── apps/web/dist/
```

生产环境变量、日志和上传文件不进入发布包。它们分别放在 `/etc/nest-admin-soybean`、`/var/log/nest-admin-soybean`、`/var/lib/nest-admin-soybean`。

由于 Prisma CLI 当前位于后端 `devDependencies`，执行迁移的发布环境需要保留锁定版本的 Prisma CLI。更成熟的 CI/CD 应把数据库迁移拆成独立 Job；不要在生产环境临时下载不同版本的 Prisma。

### 3.6 Docker 镜像构建

仓库已经提供前后端 Dockerfile：

```bash
docker compose build server web
```

如果使用镜像仓库，应使用 Git SHA 作为不可变标签：

```bash
export RELEASE_SHA="$(git rev-parse --short HEAD)"
docker build -f apps/server/Dockerfile -t registry.example.com/nest-admin-server:"${RELEASE_SHA}" .
docker build -f apps/web/Dockerfile -t registry.example.com/nest-admin-web:"${RELEASE_SHA}" .
```

不要只依赖 `latest`，否则无法确认线上运行的具体版本。

---

## 四、生产配置文件

### 4.1 配置优先级

后端通过 NestJS `ConfigModule` 读取：

1. 进程环境变量；
2. `apps/server/.env.production`；
3. `apps/server/.env`。

systemd 推荐使用独立的 `/etc/nest-admin-soybean/server.env`，不要把真实生产密钥放进代码仓库。Docker Compose 使用仓库根目录的部署专用 `.env`，并通过 Compose `environment` 注入容器。

### 4.2 systemd 后端环境变量模板

创建目录和文件：

```bash
sudo install -d -m 750 -o root -g nestadmin /etc/nest-admin-soybean
sudo install -m 600 -o root -g nestadmin /dev/null /etc/nest-admin-soybean/server.env
sudoedit /etc/nest-admin-soybean/server.env
```

示例内容：

```dotenv
NODE_ENV=production
APP_PORT=8080
APP_PREFIX=/api

# Prisma CLI 强制要求 DATABASE_URL；运行时 PrismaService 同时读取下面的 DB_* 配置。
# 两组值必须指向同一个数据库。
DATABASE_URL=postgresql://nestadmin_app:CHANGE_ME@127.0.0.1:5432/nest_admin?schema=public&sslmode=disable
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=nestadmin_app
DB_PASSWORD=CHANGE_ME
DB_DATABASE=nest_admin
DB_SCHEMA=public
DB_SSL=false
DATABASE_POOL_SIZE=10
DATABASE_CONNECTION_TIMEOUT=5000
DATABASE_IDLE_TIMEOUT=30000

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME
REDIS_DB=0
REDIS_KEY_PREFIX=nest-admin:

JWT_SECRET=GENERATE_AT_LEAST_32_RANDOM_BYTES
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=2h

FILE_IS_LOCAL=true
# main.ts 会把该值与 process.cwd() 拼接，因此这里使用发布目录内的 upload 软链接。
FILE_UPLOAD_LOCATION=upload
FILE_DOMAIN=https://admin.example.com
FILE_SERVE_ROOT=/profile
FILE_MAX_SIZE=50
FILE_THUMBNAIL_ENABLED=true

LOG_TO_FILE=false
LOG_LEVEL=info
LOG_PRETTY_PRINT=false

TENANT_ENABLED=true
TENANT_SUPER_ID=000000
TENANT_DEFAULT_ID=000000
USER_INITIAL_PASSWORD=CHANGE_ME_BEFORE_FIRST_LOGIN

CLIENT_DEFAULT_ID=pc
CLIENT_DEFAULT_GRANT_TYPE=password

# 首次部署建议关闭；启用时必须让前端公钥与后端私钥严格匹配。
CRYPTO_ENABLED=false
CRYPTO_RSA_PUBLIC_KEY=
CRYPTO_RSA_PRIVATE_KEY=
```

生成 JWT 密钥示例：

```bash
openssl rand -base64 48
```

不要把生成结果写进终端历史、工单或 Git。托管数据库启用 TLS 时，把 `DB_SSL` 改为 `true`，并将 `DATABASE_URL` 的 `sslmode` 改为供应商要求的模式。

### 4.3 systemd 上传目录

当前代码使用 `path.join(process.cwd(), FILE_UPLOAD_LOCATION)`。因此不应直接给 `FILE_UPLOAD_LOCATION` 填绝对路径。每个发布版本创建软链接：

```bash
sudo install -d -m 750 -o nestadmin -g nestadmin /var/lib/nest-admin-soybean/uploads
sudo -u nestadmin ln -s /var/lib/nest-admin-soybean/uploads \
  /opt/nest-admin-soybean/releases/20260808-120000/apps/server/upload
```

systemd 的工作目录是该版本的 `apps/server`，所以 `FILE_UPLOAD_LOCATION=upload` 会落到共享目录。

### 4.4 Vue 生产构建配置

创建一个不提交 Git 的 `apps/web/.env.production.local`，或者在 CI 中注入等价变量：

```dotenv
VITE_BASE_URL=/
VITE_HTTP_PROXY=N
VITE_ROUTER_HISTORY_MODE=history
VITE_SERVICE_BASE_URL=
VITE_APP_BASE_API=/api
VITE_SOURCE_MAP=N
VITE_APP_WEBSOCKET=N
VITE_APP_SSE=Y
VITE_APP_ENCRYPT=N
VITE_APP_RSA_PUBLIC_KEY=
```

> [!IMPORTANT]
> Vite 环境变量会被写入静态文件，部署后修改服务器环境变量不会改变已经构建的前端。API 路径或加密配置发生变化时必须重新构建 Vue。

如果启用接口加密：

1. 使用项目脚本生成新的 RSA 密钥；
2. 后端保存私钥和公钥；
3. 前端只放公钥；
4. 同时把前后端加密开关改为启用；
5. 在测试环境验证登录、刷新令牌和所有写操作后再上线。

### 4.5 Docker Compose 根环境文件

在仓库根目录创建部署专用 `.env`，至少设置：

```dotenv
POSTGRES_DB=nest_admin
POSTGRES_USER=nestadmin_app
POSTGRES_PASSWORD=CHANGE_ME_WITH_A_LONG_RANDOM_VALUE
REDIS_PASSWORD=CHANGE_ME_WITH_A_DIFFERENT_RANDOM_VALUE
REDIS_DB=0
JWT_SECRET=GENERATE_AT_LEAST_32_RANDOM_BYTES
WEB_PORT=3000
FILE_DOMAIN=https://admin.example.com
LOG_LEVEL=info
CRYPTO_ENABLED=false
```

保护文件：

```bash
chmod 600 .env
```

当前 Compose 和 Dockerfile 还有健康检查、API 前缀及上传目录三项配置漂移，第八章会给出部署前检查和正确值。

### 4.6 配置检查清单

- [ ] `DATABASE_URL` 与 `DB_*` 指向同一数据库；
- [ ] 数据库、Redis、JWT 使用不同的强随机密码；
- [ ] `APP_PREFIX=/api`；
- [ ] 前端最终请求前缀为 `/api`，不存在 `/api/api`；
- [ ] 前后端接口加密开关和 RSA 密钥匹配；
- [ ] 上传目录可由 `nestadmin` 写入；
- [ ] 环境文件权限为 `600`；
- [ ] 环境文件未被 Git 跟踪；
- [ ] 生产环境未使用默认账号密码。

---

## 五、systemd 服务托管

## 六、Nginx 反向代理与 HTTPS

## 七、数据库与 Redis 生产加固

## 八、部署步骤与脚本

## 九、日志与监控

## 十、安全加固清单

## 十一、回滚与版本管理

## 十二、与本地开发环境差异对照
