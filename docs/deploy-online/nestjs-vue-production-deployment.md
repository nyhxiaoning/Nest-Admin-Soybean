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

本项目执行 `vite build --mode prod`，因此应创建一个不提交 Git 的 `apps/web/.env.prod.local`，或者在 CI 中注入等价变量：

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

### 5.1 创建专用运行用户

应用不得使用 root 运行：

```bash
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin nestadmin
sudo install -d -m 755 -o nestadmin -g nestadmin /opt/nest-admin-soybean/releases
sudo install -d -m 750 -o nestadmin -g nestadmin /var/lib/nest-admin-soybean/uploads
sudo install -d -m 750 -o nestadmin -g nestadmin /var/log/nest-admin-soybean
sudo install -d -m 750 -o root -g nestadmin /etc/nest-admin-soybean
```

推荐目录结构：

```text
/opt/nest-admin-soybean/
├── current -> releases/20260808-120000
├── releases/
│   ├── 20260808-120000/
│   └── 20260801-090000/
└── shared/                    # 可选的共享配置链接目录

/var/lib/nest-admin-soybean/
└── uploads/                   # 永久数据，不随版本删除

/etc/nest-admin-soybean/
└── server.env                # 生产配置，root 管理
```

发布目录可以由部署账号上传，但最终应把所有权交给 `nestadmin`：

```bash
sudo chown -R nestadmin:nestadmin /opt/nest-admin-soybean/releases/20260808-120000
sudo -u nestadmin ln -s /var/lib/nest-admin-soybean/uploads \
  /opt/nest-admin-soybean/releases/20260808-120000/apps/server/upload
```

### 5.2 确认 Node.js 绝对路径

```bash
command -v node
node --version
```

下方示例使用 `/usr/bin/node`。如果 `command -v node` 返回其他路径，必须同步修改 `ExecStart`。不要让 systemd 依赖交互式 shell 中的 nvm 初始化脚本。

### 5.3 创建 systemd 单元

创建 `/etc/systemd/system/nest-admin-server.service`：

```ini
[Unit]
Description=Nest-Admin-Soybean NestJS API
Documentation=https://admin.example.com
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=nestadmin
Group=nestadmin
WorkingDirectory=/opt/nest-admin-soybean/current/apps/server
EnvironmentFile=/etc/nest-admin-soybean/server.env
ExecStart=/usr/bin/node dist/src/main.js

Restart=on-failure
RestartSec=5

KillSignal=SIGTERM
TimeoutStopSec=30

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/nest-admin-soybean /var/log/nest-admin-soybean /opt/nest-admin-soybean/current/apps/server/public
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

说明：

- `Restart=on-failure`：异常退出时自动重启，人工正常停止时不反复拉起；
- `KillSignal=SIGTERM`：与项目 `enableShutdownHooks()` 配合，允许 Prisma、Redis 和日志优雅关闭；
- `ProtectSystem=strict`：应用不能随意修改系统文件；
- `ReadWritePaths`：只开放上传和应用日志目录；
- 数据库或 Redis 使用云服务时，`After` 中的本地服务名可以删除。

### 5.4 启动和设置开机自启

首次启用：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nest-admin-server
sudo systemctl status nest-admin-server --no-pager
```

验证后端：

```bash
curl --fail --silent --show-error http://127.0.0.1:8080/api/health/live
curl --fail --silent --show-error http://127.0.0.1:8080/api/health/ready
```

`live` 只验证进程存活；`ready` 同时验证 PostgreSQL 和 Redis。发布切流必须以 `ready` 成功为准。

### 5.5 常用管理命令

```bash
# 状态
sudo systemctl status nest-admin-server --no-pager

# 重启新版本
sudo systemctl restart nest-admin-server

# 优雅停止/启动
sudo systemctl stop nest-admin-server
sudo systemctl start nest-admin-server

# 本次启动日志
sudo journalctl -u nest-admin-server -b --no-pager

# 持续查看日志
sudo journalctl -u nest-admin-server -f

# 最近 200 行错误上下文
sudo journalctl -u nest-admin-server -n 200 --no-pager
```

修改单元文件后必须执行 `daemon-reload`；只修改环境文件时直接重启服务即可。

### 5.6 systemd 启动失败排查

按以下顺序检查：

```bash
sudo systemd-analyze verify /etc/systemd/system/nest-admin-server.service
sudo -u nestadmin test -r /opt/nest-admin-soybean/current/apps/server/dist/src/main.js
sudo -u nestadmin test -w /var/lib/nest-admin-soybean/uploads
sudo journalctl -u nest-admin-server -n 200 --no-pager
```

常见原因：

- `ExecStart` 中 Node.js 路径错误；
- `current` 软链接指向不存在的版本；
- 环境文件缺少必填的 `NODE_ENV` 或 `DATABASE_URL`；
- `DB_*` 与 `DATABASE_URL` 指向不同数据库；
- Redis 密码或逻辑 DB 不正确；
- 发布目录缺少 `node_modules` 或 Prisma Client；
- 上传软链接不存在或权限不足。

## 六、Nginx 反向代理与 HTTPS

### 6.1 安装并检查 Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable --now nginx
sudo nginx -t
```

Ubuntu 站点配置目录通常是 `/etc/nginx/sites-available` 和 `/etc/nginx/sites-enabled`。

### 6.2 systemd 方案完整 Nginx 配置

创建 `/etc/nginx/sites-available/nest-admin-soybean.conf`：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name admin.example.com;

    root /opt/nest-admin-soybean/current/apps/web/dist;
    index index.html;

    client_max_body_size 50m;

    access_log /var/log/nginx/nest-admin.access.log;
    error_log  /var/log/nginx/nest-admin.error.log warn;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Vite 带 hash 的静态资源可长期缓存。
    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # index.html 不缓存，便于及时发现新版本。
    location = /index.html {
        try_files $uri =404;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Vue Router 使用 history 模式，刷新子路由时回退到 index.html。
    location / {
        try_files $uri $uri/ /index.html;
    }

    # SSE 长连接。若 VITE_APP_SSE=N，可删除此块并由通用 API 规则处理。
    location ^~ /api/resource/sse {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }

    # 不带 URI 的 proxy_pass 会保留原始 /api/... 路径。
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /profile/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /public/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> [!IMPORTANT]
> `proxy_pass http://127.0.0.1:8080;` 末尾不要增加 `/`。增加 URI 后会改变路径替换语义，可能把 `/api/...` 错误地转成 `/...`。

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/nest-admin-soybean.conf \
  /etc/nginx/sites-enabled/nest-admin-soybean.conf
sudo nginx -t
sudo systemctl reload nginx
```

如果默认站点抢占请求，可以在确认目标文件后取消它的启用链接：

```bash
sudo unlink /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6.3 Docker Compose 方案宿主机 Nginx

Web 容器内部已负责 Vue 静态文件和向 Server 容器代理。宿主机只代理到 Web 容器：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name admin.example.com;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }
}
```

Compose 中应把 Web 端口只绑定到回环地址，避免绕过 HTTPS 网关。生产覆盖文件应使用：

```yaml
services:
  web:
    ports:
      - "127.0.0.1:${WEB_PORT:-3000}:80"
```

仓库当前 `docker-compose.yml` 使用 `${WEB_PORT:-3000}:80`，会监听所有网卡。上线前应通过 Compose 覆盖文件收紧绑定。

### 6.4 限制 Swagger、指标和详细健康检查

不要把 Swagger 和 Prometheus 指标无条件暴露到公网。把以下规则放在通用 `location /api/` 之前：

```nginx
location ^~ /api/swagger-ui {
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location = /api/metrics {
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://127.0.0.1:8080;
}

location = /api/health/ready {
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://127.0.0.1:8080;
}
```

将示例网段替换为实际堡垒机、VPN 或监控系统网段。Docker 方案需要把上游改为 `127.0.0.1:3000`，或在 Web 容器的 Nginx 内做同等限制。

### 6.5 申请 HTTPS 证书

先确认 DNS 已生效且 HTTP 可以访问：

```bash
curl -I http://admin.example.com
sudo nginx -t
```

安装并签发：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d admin.example.com
```

Certbot 会生成 HTTPS 配置，并可选择把 HTTP 重定向到 HTTPS。验证：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://admin.example.com
sudo certbot renew --dry-run
systemctl status certbot.timer --no-pager
```

HSTS 会让浏览器长期强制 HTTPS。确认域名及所有子域都已支持 HTTPS 后再增加 `includeSubDomains` 或 `preload`，避免配置错误导致站点长时间无法访问。

### 6.6 上线后代理验证

```bash
curl --fail https://admin.example.com/
curl --fail https://admin.example.com/api/health/live
curl -I https://admin.example.com/profile/not-found-test
```

最后在浏览器中直接刷新一个 Vue 子路由，例如 `/system/user`。如果返回 Nginx 404，说明 `try_files` 或静态根目录不正确。

## 七、数据库与 Redis 生产加固

### 7.1 当前仓库的 Prisma 迁移阻断项

截至本文编写时，仓库包含 `apps/server/prisma/schema.prisma`，但没有 `apps/server/prisma/migrations/`。这意味着：

- `prisma migrate deploy` 没有可执行的版本化迁移；
- 新的空生产数据库无法仅靠当前发布包创建业务表；
- Docker 入口脚本虽然会执行 `prisma migrate deploy`，但不能替代缺失的迁移文件。

> [!CAUTION]
> 没有提交并审核基线迁移之前，不应宣称生产部署已经可复现。不要在生产库使用
> `prisma db push`，更不能用 `--force-reset` 绕过迁移体系。

### 7.2 为新项目创建基线迁移

以下操作只在开发分支和隔离的开发数据库中执行，并纳入代码审查：

```bash
cd apps/server
mkdir -p prisma/migrations/20260808_baseline
pnpm exec prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260808_baseline/migration.sql
```

检查生成 SQL，重点关注：

- 主键、自增序列、唯一索引和外键；
- PostgreSQL 扩展、枚举和默认值；
- 是否出现意外的 `DROP TABLE` 或 `DROP COLUMN`；
- 字符集、时区和字段精度；
- Schema 是否为预期的 `public`。

使用全新的临时数据库验证：

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

验证通过后，把整个 `prisma/migrations/20260808_baseline/` 提交到 Git。实际名称应使用团队生成基线的真实时间戳。

### 7.3 已有数据库如何登记基线

如果生产数据库已经通过历史方式建表，不能直接再次执行基线 SQL。先备份，然后确认数据库结构与当前 Schema 一致：

```bash
cd apps/server
pnpm exec prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
```

只有差异检查确认没有未处理差异后，才把基线标记为已应用：

```bash
pnpm exec prisma migrate resolve --applied 20260808_baseline
pnpm exec prisma migrate status
```

如果存在差异，应先由 DBA 和开发人员制作补偿迁移，不能直接 `resolve --applied` 掩盖结构漂移。

### 7.4 PostgreSQL 账号和网络加固

应用使用独立数据库和最小权限账号。示例 SQL 应由 DBA 在管理连接中执行：

```sql
CREATE ROLE nestadmin_app LOGIN PASSWORD 'CHANGE_ME_WITH_A_RANDOM_PASSWORD';
CREATE DATABASE nest_admin OWNER nestadmin_app;
REVOKE ALL ON DATABASE nest_admin FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE nest_admin TO nestadmin_app;
```

连接到 `nest_admin` 后：

```sql
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO nestadmin_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nestadmin_app IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nestadmin_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nestadmin_app IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO nestadmin_app;
```

加固要求：

- PostgreSQL 只监听本机或私有网络；
- `pg_hba.conf` 只允许应用服务器网段；
- 云数据库强制 TLS，并按照供应商要求验证 CA；
- 不使用 `postgres` 超级用户作为应用账号；
- 设置连接数上限，配合 `DATABASE_POOL_SIZE`；
- 对慢查询、锁等待、连接耗尽和磁盘增长告警。

### 7.5 数据库备份与恢复演练

迁移前创建自包含格式备份：

```bash
sudo install -d -m 700 -o postgres -g postgres /var/backups/nest-admin-soybean
sudo -u postgres pg_dump \
  --format=custom \
  --file=/var/backups/nest-admin-soybean/nest_admin-before-release.dump \
  nest_admin
```

检查备份可读：

```bash
sudo -u postgres pg_restore --list \
  /var/backups/nest-admin-soybean/nest_admin-before-release.dump | head
```

备份必须传输到独立存储，并定期在隔离环境执行恢复演练。只有备份文件而没有恢复验证，不能视为有效灾备。

### 7.6 Redis 加固

最低要求：

- 只绑定 `127.0.0.1` 或私有地址；
- 保持保护模式开启；
- 使用 Redis ACL 或高强度密码；
- 不向公网开放 `6379`；
- 开启 AOF 持久化，按业务要求同时保留 RDB 快照；
- 设置 `maxmemory` 和经过评估的淘汰策略；
- 监控内存、连接数、拒绝连接、命中率、阻塞命令和持久化失败；
- 应用缓存、Bull 队列和其他系统最好使用不同实例或明确的 key 前缀。

当前项目 Redis 配置只有密码字段，没有用户名字段，因此应加固 `default` 用户；如果希望使用独立 ACL 用户，需要先给后端增加 `REDIS_USERNAME` 支持。兼容当前代码的 ACL 示例：

```text
user default on >CHANGE_ME ~nest-admin:* +@all
```

项目配置对应：

```dotenv
REDIS_PASSWORD=CHANGE_ME
REDIS_DB=0
REDIS_KEY_PREFIX=nest-admin:
```

> [!WARNING]
> `FLUSHDB` 会清空当前逻辑 DB，导致登录会话、Token 黑名单、菜单缓存和队列状态受影响。生产环境不得把仓库的 `redis:flush` 当作常规部署步骤。

### 7.7 生产迁移和初始化数据策略

每次发布执行：

```bash
cd /opt/nest-admin-soybean/current/apps/server
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
```

迁移策略：

| 命令 | 生产环境 | 用途 |
|---|---|---|
| `prisma migrate status` | 允许 | 检查迁移状态 |
| `prisma migrate deploy` | 允许 | 执行已审核并提交的迁移 |
| `pnpm run prisma:seed:migration` | 审核后允许 | 执行项目幂等业务数据补丁 |
| `pnpm run prisma:seed:only` | 仅全新空库且审核后 | 写入系统初始数据，不包含强制重建步骤 |
| `pnpm run prisma:seed` | 禁止 | 脚本包含 `db push --force-reset --accept-data-loss` |
| `pnpm run prisma:init` | 禁止 | 强制重置并重新初始化数据库 |
| `pnpm run prisma:reset` | 禁止 | 重置迁移和数据 |

全新空库在基线迁移成功后仍需要系统初始租户、管理员、角色、菜单和客户端数据。当前 `seed.ts` 主要使用 `createMany({ skipDuplicates: true })`，但执行前仍应完成代码审查和备份：

```bash
cd apps/server
pnpm run prisma:seed:only
pnpm run prisma:seed:migration
```

首次登录后立即修改默认管理员密码、客户端密钥和 `USER_INITIAL_PASSWORD`。已有业务库不要把 `prisma:seed:only` 当作升级脚本。

## 八、部署步骤与脚本

### 8.1 部署前统一检查

两种方案都必须完成：

```bash
git status --short
git rev-parse --short HEAD
pnpm install --frozen-lockfile
pnpm --filter @nest-admin/server prisma:generate
pnpm --filter @nest-admin/types build
pnpm --filter @nest-admin/server build:prod
NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @nest-admin/web build
```

上线门禁：

- [ ] `apps/server/prisma/migrations/` 已存在并通过审核；
- [ ] 前端使用 `VITE_SERVICE_BASE_URL=` 和 `VITE_APP_BASE_API=/api`；
- [ ] 生产环境变量已脱离 Git；
- [ ] 数据库备份完成并可读取；
- [ ] 当前 Git SHA、数据库迁移状态和上一稳定版本已记录；
- [ ] 80/443、DNS、证书和防火墙准备完成；
- [ ] 维护窗口和回滚负责人已确认。

### 8.2 systemd 首次部署

以下流程假设源码已检出到 `/srv/nest-admin-source`：

1. 在源码目录检出经过测试的 tag 或 Git SHA；
2. 创建时间戳发布目录；
3. 复制源码但排除 `.git`、`node_modules` 和环境文件；
4. 写入受控的 `apps/web/.env.prod.local`；
5. 按第三章顺序安装依赖并构建；
6. 创建 `apps/server/upload` 到共享上传目录的软链接；
7. 备份数据库；
8. 加载后端生产环境，检查并执行 `prisma migrate deploy`；
9. 原子切换 `current` 软链接；
10. 重启 systemd，循环检查 `/api/health/ready`；
11. 验证首页、登录、Vue 子路由刷新、上传和日志。

手动命令示例：

```bash
export RELEASE_ID="$(date +%Y%m%d-%H%M%S)-$(git -C /srv/nest-admin-source rev-parse --short HEAD)"
export RELEASE_DIR="/opt/nest-admin-soybean/releases/${RELEASE_ID}"

sudo install -d -m 755 -o nestadmin -g nestadmin "${RELEASE_DIR}"
sudo rsync -a \
  --exclude=.git \
  --exclude=node_modules \
  --exclude='apps/*/node_modules' \
  --exclude='apps/server/.env*' \
  --exclude='apps/web/.env.*.local' \
  /srv/nest-admin-source/ "${RELEASE_DIR}/"
sudo install -m 640 -o nestadmin -g nestadmin \
  /etc/nest-admin-soybean/web.env.prod.local \
  "${RELEASE_DIR}/apps/web/.env.prod.local"
sudo chown -R nestadmin:nestadmin "${RELEASE_DIR}"

sudo -u nestadmin pnpm --dir "${RELEASE_DIR}" install --frozen-lockfile
sudo -u nestadmin pnpm --dir "${RELEASE_DIR}" --filter @nest-admin/types build
sudo -u nestadmin pnpm --dir "${RELEASE_DIR}" --filter @nest-admin/server prisma:generate
sudo -u nestadmin pnpm --dir "${RELEASE_DIR}" --filter @nest-admin/server build:prod
sudo -u nestadmin env NODE_OPTIONS=--max-old-space-size=4096 \
  pnpm --dir "${RELEASE_DIR}" --filter @nest-admin/web build

sudo -u nestadmin ln -s /var/lib/nest-admin-soybean/uploads \
  "${RELEASE_DIR}/apps/server/upload"
```

加载环境并迁移：

```bash
set -a
. /etc/nest-admin-soybean/server.env
set +a
sudo --preserve-env -u nestadmin \
  pnpm --dir "${RELEASE_DIR}/apps/server" exec prisma migrate status
sudo --preserve-env -u nestadmin \
  pnpm --dir "${RELEASE_DIR}/apps/server" exec prisma migrate deploy
```

原子切换：

```bash
sudo ln -s "${RELEASE_DIR}" /opt/nest-admin-soybean/current.next
sudo mv -Tf /opt/nest-admin-soybean/current.next /opt/nest-admin-soybean/current
sudo systemctl restart nest-admin-server
curl --fail http://127.0.0.1:8080/api/health/ready
```

### 8.3 systemd 一键部署脚本模板

将下面脚本保存到运维机的 `/usr/local/sbin/deploy-nest-admin`。脚本应由受控的 sudo 规则运行，源码目录必须提前检出目标版本且工作区干净。

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_USER="nestadmin"
readonly APP_ROOT="/opt/nest-admin-soybean"
readonly SOURCE_DIR="/srv/nest-admin-source"
readonly SERVER_ENV="/etc/nest-admin-soybean/server.env"
readonly WEB_ENV="/etc/nest-admin-soybean/web.env.prod.local"
readonly UPLOAD_DIR="/var/lib/nest-admin-soybean/uploads"
readonly BACKUP_DIR="/var/backups/nest-admin-soybean"
readonly PNPM_BIN="$(command -v pnpm)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "必须通过 sudo 运行" >&2
  exit 1
fi

for required in "${SOURCE_DIR}/.git" "${SERVER_ENV}" "${WEB_ENV}"; do
  if [[ ! -e "${required}" ]]; then
    echo "缺少必需文件: ${required}" >&2
    exit 1
  fi
done

if ! git -C "${SOURCE_DIR}" diff --quiet || ! git -C "${SOURCE_DIR}" diff --cached --quiet; then
  echo "源码工作区不干净，停止部署" >&2
  exit 1
fi

readonly GIT_SHA="$(git -C "${SOURCE_DIR}" rev-parse --short HEAD)"
readonly RELEASE_ID="$(date +%Y%m%d-%H%M%S)-${GIT_SHA}"
readonly RELEASE_DIR="${APP_ROOT}/releases/${RELEASE_ID}"
readonly CURRENT_LINK="${APP_ROOT}/current"
readonly PREVIOUS_RELEASE="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
switched=0

rollback_app() {
  local exit_code=$?
  echo "部署失败，退出码: ${exit_code}" >&2
  if [[ "${switched}" -eq 1 && -n "${PREVIOUS_RELEASE}" && -d "${PREVIOUS_RELEASE}" ]]; then
    ln -s "${PREVIOUS_RELEASE}" "${APP_ROOT}/current.rollback"
    mv -Tf "${APP_ROOT}/current.rollback" "${CURRENT_LINK}"
    systemctl restart nest-admin-server || true
    echo "应用已切回 ${PREVIOUS_RELEASE}；数据库迁移不会自动回滚" >&2
  fi
  exit "${exit_code}"
}
trap rollback_app ERR

install -d -m 755 -o "${APP_USER}" -g "${APP_USER}" "${RELEASE_DIR}"
install -d -m 700 "${BACKUP_DIR}"

rsync -a \
  --exclude=.git \
  --exclude=node_modules \
  --exclude='apps/*/node_modules' \
  --exclude='apps/server/.env*' \
  --exclude='apps/web/.env.*.local' \
  "${SOURCE_DIR}/" "${RELEASE_DIR}/"

install -m 640 -o "${APP_USER}" -g "${APP_USER}" \
  "${WEB_ENV}" "${RELEASE_DIR}/apps/web/.env.prod.local"
chown -R "${APP_USER}:${APP_USER}" "${RELEASE_DIR}"

runuser -u "${APP_USER}" -m -- "${PNPM_BIN}" --dir "${RELEASE_DIR}" install --frozen-lockfile
runuser -u "${APP_USER}" -m -- "${PNPM_BIN}" --dir "${RELEASE_DIR}" --filter @nest-admin/types build
runuser -u "${APP_USER}" -m -- "${PNPM_BIN}" --dir "${RELEASE_DIR}" --filter @nest-admin/server prisma:generate
runuser -u "${APP_USER}" -m -- "${PNPM_BIN}" --dir "${RELEASE_DIR}" --filter @nest-admin/server build:prod
runuser -u "${APP_USER}" -m -- env NODE_OPTIONS=--max-old-space-size=4096 \
  "${PNPM_BIN}" --dir "${RELEASE_DIR}" --filter @nest-admin/web build
runuser -u "${APP_USER}" -- ln -s "${UPLOAD_DIR}" "${RELEASE_DIR}/apps/server/upload"

set -a
# shellcheck disable=SC1090
. "${SERVER_ENV}"
set +a

readonly BACKUP_FILE="${BACKUP_DIR}/nest_admin-${RELEASE_ID}.dump"
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USERNAME}" \
  --dbname="${DB_DATABASE}" \
  --format=custom \
  --file="${BACKUP_FILE}"
pg_restore --list "${BACKUP_FILE}" >/dev/null

runuser -u "${APP_USER}" -m -- "${PNPM_BIN}" \
  --dir "${RELEASE_DIR}/apps/server" exec prisma migrate status
runuser -u "${APP_USER}" -m -- "${PNPM_BIN}" \
  --dir "${RELEASE_DIR}/apps/server" exec prisma migrate deploy

ln -s "${RELEASE_DIR}" "${APP_ROOT}/current.next"
mv -Tf "${APP_ROOT}/current.next" "${CURRENT_LINK}"
switched=1
systemctl restart nest-admin-server

for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:8080/api/health/ready >/dev/null; then
    trap - ERR
    echo "部署成功: ${RELEASE_ID}"
    echo "数据库备份: ${BACKUP_FILE}"
    exit 0
  fi
  sleep 2
done

echo "就绪检查超时" >&2
false
```

脚本不会自动删除旧版本或数据库备份。旧版本清理应由独立、经过确认的保留策略完成。

### 8.4 Docker Compose 部署前的本地覆盖

Dockerfile 使用 `vite build --mode coolify`，因此创建不提交 Git 的 `apps/web/.env.coolify.local`：

```dotenv
VITE_SERVICE_BASE_URL=
VITE_APP_BASE_API=/api
VITE_HTTP_PROXY=N
VITE_APP_ENCRYPT=N
VITE_APP_RSA_PUBLIC_KEY=
```

当前仓库有三个必须处理的漂移：

| 位置 | 当前问题 | 正确值/处理 |
|---|---|---|
| Server Dockerfile 健康检查 | `/api/v1/health/ready` | `/api/health/ready` |
| 根 Compose Server 健康检查 | `/api/v1/health/ready` | `/api/health/ready` |
| Compose 上传目录 | 绝对值 `/data/uploads` 被代码与工作目录拼接 | 当前 Workdir 使用 `../../../data/uploads` |
| `.env.coolify` | `/api/v1` | 用 `.env.coolify.local` 覆盖为同域 `/api` |

在这些漂移没有通过独立代码修改修正前，建议使用下方独立生产 Compose 文件，不要直接运行根 `docker-compose.yml`。

### 8.5 独立生产 Compose 文件

创建 `docker-compose.production.yml`：

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:?POSTGRES_DB must be set}
      POSTGRES_USER: ${POSTGRES_USER:?POSTGRES_USER must be set}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks: [backend]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD:?REDIS_PASSWORD must be set}"]
    healthcheck:
      test: ["CMD-SHELL", "redis-cli -a \"$$REDIS_PASSWORD\" ping | grep PONG"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 10s
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD:?REDIS_PASSWORD must be set}
    volumes:
      - redis_data:/data
    networks: [backend]

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      APP_PORT: 8080
      APP_PREFIX: /api
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public&sslmode=disable
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_DATABASE: ${POSTGRES_DB}
      DB_SCHEMA: public
      DB_SSL: "false"
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      REDIS_DB: ${REDIS_DB:-0}
      REDIS_KEY_PREFIX: nest-admin:
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}
      FILE_IS_LOCAL: "true"
      FILE_UPLOAD_LOCATION: ../../../data/uploads
      FILE_DOMAIN: ${FILE_DOMAIN:?FILE_DOMAIN must be set}
      FILE_SERVE_ROOT: /profile
      LOG_TO_FILE: "false"
      LOG_LEVEL: ${LOG_LEVEL:-info}
      CRYPTO_ENABLED: ${CRYPTO_ENABLED:-false}
      CLIENT_DEFAULT_ID: pc
      CLIENT_DEFAULT_GRANT_TYPE: password
    healthcheck:
      test:
        - CMD-SHELL
        - node -e "const http=require('http');http.get('http://127.0.0.1:8080/api/health/ready',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    volumes:
      - server_uploads:/data/uploads
    networks: [backend]

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: unless-stopped
    depends_on:
      server:
        condition: service_healthy
    ports:
      - "127.0.0.1:${WEB_PORT:-3000}:80"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 20s
    networks: [backend]

volumes:
  postgres_data:
  redis_data:
  server_uploads:

networks:
  backend:
    driver: bridge
```

数据库密码包含 `@`、`:`、`/` 等 URL 保留字符时，`DATABASE_URL` 中必须使用 URL 编码。更稳妥的做法是让密码生成策略只使用 URL 安全字符，同时保持足够长度和随机性。

### 8.6 Docker Compose 首次部署

```bash
# 1. 检查最终合并和变量替换结果；输出可能包含敏感值，不要保存到公共日志。
docker compose --env-file .env -f docker-compose.production.yml config --quiet

# 2. 构建镜像。
docker compose --env-file .env -f docker-compose.production.yml build

# 3. 启动依赖和后端；后端入口会执行 prisma migrate deploy。
docker compose --env-file .env -f docker-compose.production.yml up -d postgres redis server

# 4. 确认后端就绪后启动前端。
docker compose --env-file .env -f docker-compose.production.yml up -d web

# 5. 查看状态和日志。
docker compose --env-file .env -f docker-compose.production.yml ps
docker compose --env-file .env -f docker-compose.production.yml logs --tail=200 server

# 6. 从宿主机验证页面和代理。
curl --fail http://127.0.0.1:3000/
curl --fail http://127.0.0.1:3000/api/health/ready
```

全新空库在基线迁移后，按 7.7 节审核并执行初始数据脚本：

```bash
docker compose --env-file .env -f docker-compose.production.yml exec server \
  pnpm run prisma:seed:only
docker compose --env-file .env -f docker-compose.production.yml exec server \
  pnpm run prisma:seed:migration
```

完成后立即修改默认管理员和客户端凭据。

### 8.7 Docker Compose 更新部署

迁移前备份：

```bash
install -d -m 700 backups
docker compose --env-file .env -f docker-compose.production.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc > \
  "backups/nest_admin-$(date +%Y%m%d-%H%M%S).dump"
```

然后更新到已审核的 Git SHA：

```bash
git fetch --tags
git checkout YOUR_REVIEWED_GIT_SHA
docker compose --env-file .env -f docker-compose.production.yml build server web
docker compose --env-file .env -f docker-compose.production.yml up -d server web
docker compose --env-file .env -f docker-compose.production.yml ps
curl --fail http://127.0.0.1:3000/api/health/ready
```

单机 Compose 只运行一个 Server 副本时，入口脚本自动迁移可以接受。扩容多个 Server 副本时，应改为独立的一次性迁移任务，所有副本就绪前只允许一个迁移执行者。

### 8.8 部署后验收

- [ ] `curl https://admin.example.com/` 返回前端 HTML；
- [ ] `/api/health/live` 和内部 `/api/health/ready` 成功；
- [ ] 管理员可以登录并刷新 Token；
- [ ] 动态菜单完整显示；
- [ ] 直接刷新 Vue 子路由不返回 404；
- [ ] 上传文件后可通过 `/profile/` 访问；
- [ ] PostgreSQL 和 Redis 未暴露公网端口；
- [ ] Nginx、NestJS、PostgreSQL、Redis 日志无持续错误；
- [ ] HTTPS 证书链和自动续期正常；
- [ ] 当前 Git SHA、迁移版本和备份文件已登记。

## 九、日志与监控

### 9.1 systemd 与 journald

本文后端环境模板设置 `LOG_TO_FILE=false`，Pino 将结构化日志输出到标准输出，由 journald 统一收集：

```bash
sudo journalctl -u nest-admin-server -f
sudo journalctl -u nest-admin-server --since "30 minutes ago" --no-pager
sudo journalctl -u nest-admin-server -p warning --since today --no-pager
sudo journalctl --disk-usage
```

生产环境应设置 journald 容量上限。创建 `/etc/systemd/journald.conf.d/nest-admin.conf`：

```ini
[Journal]
SystemMaxUse=2G
SystemKeepFree=1G
MaxRetentionSec=30day
Compress=yes
```

应用配置：

```bash
sudo systemctl restart systemd-journald
sudo journalctl --disk-usage
```

日志中包含 `requestId`，出现接口异常时应以 `requestId` 串联 Nginx、NestJS 和审计日志。

### 9.2 应用文件日志和 logrotate

如果设置：

```dotenv
LOG_TO_FILE=true
LOG_DIR=/var/log/nest-admin-soybean
```

项目会生成类似 `app-production-2026-08-08.log` 的 JSON 日志。创建 `/etc/logrotate.d/nest-admin-soybean`：

```text
/var/log/nest-admin-soybean/app-production-*.log {
    daily
    rotate 30
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    su nestadmin nestadmin
}
```

检查配置：

```bash
sudo logrotate --debug /etc/logrotate.d/nest-admin-soybean
```

不要同时无限保留 journald 和应用文件日志。确定一个主日志出口，并把长期归档发送到集中日志平台。

### 9.3 Nginx 日志

```bash
sudo tail -f /var/log/nginx/nest-admin.access.log
sudo tail -f /var/log/nginx/nest-admin.error.log
sudo awk '$9 ~ /^5/ {print}' /var/log/nginx/nest-admin.access.log | tail -50
```

建议在 Nginx 日志格式中加入 `$request_id`，并把该值传入后端请求头，便于跨服务追踪。日志不得记录 Authorization、Cookie、密码或完整 Token。

### 9.4 Docker 日志轮转

`docker compose logs`：

```bash
docker compose --env-file .env -f docker-compose.production.yml logs -f --tail=200 server
docker compose --env-file .env -f docker-compose.production.yml logs --since=30m postgres redis
```

给每个服务增加日志限制，避免 JSON 日志占满磁盘：

```yaml
logging:
  driver: json-file
  options:
    max-size: "20m"
    max-file: "5"
```

企业环境可以改用 Loki、ELK、OpenSearch 或云日志驱动。

### 9.5 健康检查

| 地址 | 检查内容 | 用途 |
|---|---|---|
| `/api/health/live` | 进程与内存 | 存活探针，失败时可重启进程 |
| `/api/health/ready` | PostgreSQL、Redis | 就绪探针，失败时停止接流量 |
| `/api/health` | 数据库、Redis、内存、磁盘 | 人工综合诊断 |
| `/api/health/info` | 应用信息 | 内部排查 |

建议每 30 秒检查一次，连续 3 次失败再告警。不要仅使用首页 HTTP 200 判断后端就绪。

### 9.6 Prometheus 与 Grafana

当前指标入口是 `/api/metrics`。Prometheus 示例：

```yaml
scrape_configs:
  - job_name: nest-admin-server
    metrics_path: /api/metrics
    static_configs:
      - targets: ["10.0.1.20:8080"]
```

指标地址当前不要求登录，因此必须限制在监控私网或 Nginx IP 白名单内。上线前直接查看一次输出，确认实际暴露的指标名称，再编写 PromQL；不要只根据源码中的服务名称猜测。

项目还提供 `apps/server/monitoring/` 下的 Prometheus/Grafana 示例，但其中旧文档可能使用 `/metrics`。由于全局前缀为 `/api`，部署时应统一改为 `/api/metrics`。

### 9.7 建议告警

| 告警 | 建议阈值 |
|---|---|
| 应用不可用 | 就绪检查连续 3 次失败 |
| HTTP 5xx | 5 分钟比例超过 2% |
| P95 延迟 | 连续 10 分钟超过业务基线，例如 1 秒 |
| Node.js 堆内存 | 超过限制的 80% 持续 10 分钟 |
| 主机磁盘 | 使用率超过 80%，90% 紧急 |
| PostgreSQL 连接 | 超过连接上限的 80% |
| PostgreSQL 备份 | 24 小时没有成功备份 |
| Redis 内存 | 超过 `maxmemory` 的 80% |
| Redis 持久化 | AOF/RDB 最近一次保存失败 |
| 队列积压 | 等待任务持续增长且消费速率为零 |
| HTTPS 证书 | 剩余有效期小于 21 天 |

阈值应根据真实业务基线调整，并进行一次告警演练。

## 十、安全加固清单

### 10.1 主机与账号

- [ ] NestJS 由无登录 shell 的 `nestadmin` 用户运行；
- [ ] 部署账号不是日常 root 账号，只授予必要 sudo 命令；
- [ ] SSH 禁用密码登录和 root 远程登录，使用密钥及堡垒机；
- [ ] UFW/云安全组只开放 80、443 和受限来源的 SSH；
- [ ] 安装并配置 Fail2ban 或等价防暴力破解措施；
- [ ] 系统、Node.js、Nginx、Docker 定期安装安全更新；
- [ ] 服务器启用时间同步，操作具备审计记录。

UFW 示例：

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 203.0.113.10 to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

先把示例运维 IP 替换为真实固定出口 IP，并保留一个已登录 SSH 会话验证新规则，避免把自己锁在服务器外。

### 10.2 应用与密钥

- [ ] `JWT_SECRET` 至少包含 32 字节随机数据；
- [ ] 数据库、Redis、JWT、客户端密钥互不复用；
- [ ] 生产环境变量权限为 `600`，不在 Git 和发布包中；
- [ ] 默认管理员密码、`USER_INITIAL_PASSWORD` 和种子客户端密钥已更换；
- [ ] `CRYPTO_ENABLED` 前后端一致；启用时公私钥严格匹配；
- [ ] 生产关闭 source map、调试日志和开发工具；
- [ ] Swagger、指标、详细健康检查仅允许 VPN/内网访问；
- [ ] 日志脱敏规则覆盖 Token、Cookie、密码、Secret、API Key；
- [ ] CORS 只保留确有需要的来源；同域部署不依赖宽泛 CORS。

当前 `main.ts` 使用 `cors: true`。同域正式环境建议后续单独修改为域名白名单，并完成登录、上传、SSE 和第三方回调回归测试。

### 10.3 数据与网络

- [ ] PostgreSQL 和 Redis 不暴露公网端口；
- [ ] 数据库使用独立应用账号和最小权限；
- [ ] 跨主机数据库连接启用 TLS；
- [ ] Redis 开启认证、私网绑定和持久化；
- [ ] 上传目录只允许应用用户写入，禁止执行上传文件；
- [ ] 备份加密并保存到独立账号/区域；
- [ ] 每季度至少执行一次恢复演练；
- [ ] Docker 数据卷纳入备份，不把容器文件层当作持久化存储。

### 10.4 Nginx 与 HTTPS

- [ ] HTTP 全部跳转 HTTPS；
- [ ] TLS 只启用受支持的安全协议和密码套件；
- [ ] 证书续期定时器正常；
- [ ] 设置合理的 `client_max_body_size` 和代理超时；
- [ ] Vue 静态资源长期缓存，`index.html` 不缓存；
- [ ] 添加 `nosniff`、Referrer-Policy、Frame-Options 等安全头；
- [ ] 评估业务兼容性后再逐步启用严格 CSP 和 HSTS；
- [ ] Nginx 不泄露版本信息，可设置 `server_tokens off`。

### 10.5 供应链与发布

- [ ] 使用 `pnpm install --frozen-lockfile`；
- [ ] CI 执行测试、类型检查、依赖漏洞和镜像扫描；
- [ ] 发布物记录 Git SHA、构建时间和依赖锁文件；
- [ ] Docker 使用不可变 SHA 标签并限制基础镜像来源；
- [ ] Prisma 迁移必须代码审查，破坏性 SQL 需要 DBA 审核；
- [ ] 发布前保留数据库备份和上一稳定应用版本；
- [ ] 生产服务器不临时安装未经锁定的 npm 包。

## 十一、回滚与版本管理

### 11.1 版本目录规则

systemd 使用：

```text
/opt/nest-admin-soybean/releases/20260808-120000-a1b2c3d
/opt/nest-admin-soybean/releases/20260801-090000-9f8e7d6
/opt/nest-admin-soybean/current -> releases/20260808-120000-a1b2c3d
```

每个发布版本应记录：

- Git SHA 和 tag；
- 构建机、Node.js、pnpm 版本；
- 前端环境配置摘要，不记录密钥；
- Prisma 迁移列表；
- 数据库备份位置；
- 部署人、时间和验收结果。

至少保留两个已验证的应用版本。共享上传、日志、环境变量和数据库不得放进随版本切换的目录。

### 11.2 systemd 应用回滚

先确认上一版本目录存在：

```bash
readlink -f /opt/nest-admin-soybean/current
ls -ld /opt/nest-admin-soybean/releases/20260801-090000-9f8e7d6
```

原子切换并验证：

```bash
sudo ln -s /opt/nest-admin-soybean/releases/20260801-090000-9f8e7d6 \
  /opt/nest-admin-soybean/current.rollback
sudo mv -Tf /opt/nest-admin-soybean/current.rollback \
  /opt/nest-admin-soybean/current
sudo systemctl restart nest-admin-server
curl --fail http://127.0.0.1:8080/api/health/ready
```

随后验证登录、菜单、上传和关键写操作。不要因为应用已回滚就假设数据库也已回滚。

### 11.3 Prisma 数据库回滚原则

Prisma 迁移默认采用向前修复：

1. 停止继续发布有问题的版本；
2. 判断旧应用是否兼容新 Schema；
3. 优先发布补偿迁移或兼容性代码；
4. 只有发生不可补偿的数据破坏时才从已验证备份恢复；
5. 恢复前保留故障现场备份和审计记录。

禁止删除已经应用的迁移目录，禁止擅自修改生产 `_prisma_migrations` 表。表/字段删除应分阶段：先停止写入并发布兼容代码，再迁移数据，观察一个发布周期后才删除结构。

### 11.4 Docker Compose 版本和回滚

正式流水线推荐把 Compose 中的 `build` 替换为不可变镜像：

```yaml
services:
  server:
    image: registry.example.com/nest-admin-server:${RELEASE_SHA:?RELEASE_SHA must be set}
  web:
    image: registry.example.com/nest-admin-web:${RELEASE_SHA:?RELEASE_SHA must be set}
```

回滚时指定上一 SHA：

```bash
export RELEASE_SHA=9f8e7d6
docker compose --env-file .env -f docker-compose.production.yml pull server web
docker compose --env-file .env -f docker-compose.production.yml up -d server web
docker compose --env-file .env -f docker-compose.production.yml ps
curl --fail http://127.0.0.1:3000/api/health/ready
```

如果当前仍采用服务器本地构建，则检出上一审核 SHA 后重新构建。它比不可变镜像慢，也更容易受构建环境漂移影响。

### 11.5 回滚验收清单

- [ ] 应用和 Web 版本均切换到同一兼容版本；
- [ ] 就绪检查通过；
- [ ] Nginx 无持续 502/504；
- [ ] 登录、Token 刷新和权限菜单正常；
- [ ] 关键查询和写入正常；
- [ ] 上传文件和历史文件均可访问；
- [ ] 队列没有持续失败或重复消费；
- [ ] 数据库迁移状态已记录；
- [ ] 故障原因、处置和后续修复任务已登记。

## 十二、与本地开发环境差异对照

### 12.1 差异表

| 项目 | 本地开发 | systemd 生产 | Docker Compose 生产 |
|---|---|---|---|
| Node 进程 | `nest start --watch` | systemd 单进程 | Server 容器 |
| 前端 | Vite Dev Server | Nginx 静态 `dist` | Web/Nginx 容器 |
| 热更新 | 支持 | 不支持 | 不支持 |
| 配置来源 | `.env.development`、`.env.dev` | `/etc/.../server.env`、构建时前端配置 | 根 `.env`、Compose environment、Vite coolify 配置 |
| API 地址 | `http://localhost:8080/api` 或开发代理 | 同域 `/api` | 同域 `/api` |
| API 前缀 | `/api` | `/api` | `/api` |
| 数据库 | 本地 PostgreSQL | 系统/云 PostgreSQL | PostgreSQL 容器或云数据库 |
| Redis DB | 默认开发 DB 2 | 默认生产 DB 0 | `REDIS_DB`，默认 0 |
| 数据迁移 | `prisma migrate dev` | `prisma migrate deploy` | 入口或独立 Job 执行 `migrate deploy` |
| 初始化 | 可重建本地库 | 禁止清库初始化 | 禁止清库初始化 |
| 日志 | Pretty 控制台 | journald 或 JSON 文件 | Docker 日志驱动 |
| HTTPS | 通常不启用 | 宿主机 Nginx + Certbot | 宿主机 Nginx + Certbot |
| 上传文件 | 相对开发目录 | 共享持久目录软链接 | Docker volume |
| Swagger/指标 | 可本机访问 | 内网/IP 白名单 | 内网/IP 白名单 |
| source map | 可启用 | 关闭 | 关闭 |
| 版本回滚 | Git 切换 | `current` 软链接 | 不可变镜像 SHA |
| 自动重启 | Watch 模式 | systemd | `restart: unless-stopped` |

> [!IMPORTANT]
> Vite 配置是构建时配置。生产环境修改 `VITE_*` 后必须重新生成 `apps/web/dist` 或 Web 镜像，重启 Nginx 不能改变旧静态文件中的 API 地址。

### 12.2 部署前检查清单

- [ ] 目标 Git SHA 已在测试环境通过；
- [ ] 根锁文件未变化或变化已审核；
- [ ] Prisma Client 已重新生成；
- [ ] 基线及增量迁移均已提交；
- [ ] 迁移 SQL 已检查锁表、全表更新和破坏性操作；
- [ ] 数据库备份已完成并验证目录；
- [ ] Redis/数据库连接和 TLS 已验证；
- [ ] 前端 `/api` 配置没有重复或旧 `/api/v1`；
- [ ] systemd 或 Compose 健康检查使用 `/api/health/ready`；
- [ ] 上传持久目录映射正确；
- [ ] 上一稳定版本和回滚命令已准备；
- [ ] DNS、证书、安全组和维护窗口已确认。

### 12.3 部署后检查清单

- [ ] systemd/Compose 所有服务状态正常；
- [ ] 首页、静态资源和 Vue 子路由刷新正常；
- [ ] 后端存活和就绪检查成功；
- [ ] 管理员登录、刷新 Token、退出正常；
- [ ] 动态路由和权限菜单完整；
- [ ] PostgreSQL 迁移状态干净；
- [ ] Redis 缓存与 Bull 队列无认证错误；
- [ ] 上传、下载和历史附件正常；
- [ ] Nginx、后端、数据库、Redis 无持续错误；
- [ ] HTTPS、证书链、重定向和续期正常；
- [ ] 监控采集和告警已恢复；
- [ ] 部署记录已写入版本、迁移和备份信息。

### 12.4 常见故障排查

#### Nginx 返回 502

```bash
sudo systemctl status nest-admin-server --no-pager
curl -v http://127.0.0.1:8080/api/health/live
sudo tail -100 /var/log/nginx/nest-admin.error.log
```

检查 NestJS 是否监听 8080、Nginx 上游是否正确、容器 Web 端口是否只绑定到预期地址。

#### 刷新 Vue 页面返回 404

确认 Nginx 根目录指向当前版本的 `apps/web/dist`，并存在：

```nginx
try_files $uri $uri/ /index.html;
```

#### 前端请求出现 `/api/api` 或旧 `/api/v1`

重新检查构建配置：

```dotenv
VITE_SERVICE_BASE_URL=
VITE_APP_BASE_API=/api
```

修改后重新构建 Vue，不能只重启服务。

#### Prisma 无法连接或迁移失败

```bash
cd /opt/nest-admin-soybean/current/apps/server
pnpm exec prisma migrate status
sudo journalctl -u nest-admin-server -n 200 --no-pager
```

核对 `DATABASE_URL` 和 `DB_*` 是否一致、密码是否 URL 编码、`DB_SSL` 是否符合数据库实际 TLS 配置，以及迁移目录是否随版本发布。

#### Redis 认证失败

```bash
redis-cli -h 127.0.0.1 -p 6379 --askpass ping
```

核对 Redis ACL/default 用户、密码、逻辑 DB 和 key 前缀。不要用 `FLUSHDB` 诊断连接问题。

#### 就绪检查失败

先检查存活，再检查依赖：

```bash
curl -v http://127.0.0.1:8080/api/health/live
curl -v http://127.0.0.1:8080/api/health/ready
psql "$DATABASE_URL" -c 'select 1;'
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --askpass ping
```

#### 上传成功但文件无法访问

systemd 检查软链接和权限：

```bash
readlink -f /opt/nest-admin-soybean/current/apps/server/upload
sudo -u nestadmin test -w /var/lib/nest-admin-soybean/uploads
```

Docker 检查容器解析后的目录和卷：

```bash
docker compose --env-file .env -f docker-compose.production.yml exec server \
  node -e "const p=require('node:path');console.log(p.join(process.cwd(),process.env.FILE_UPLOAD_LOCATION))"
docker compose --env-file .env -f docker-compose.production.yml exec server \
  sh -c 'test -w /data/uploads'
```

### 12.5 最终上线判定

只有同时满足以下条件才算部署完成：

1. 用户通过 HTTPS 正常访问 Vue 页面；
2. `/api`、`/profile`、`/public` 代理正确；
3. 就绪检查持续成功；
4. 登录、权限、上传和关键业务流程通过；
5. 数据库迁移、初始数据和备份状态可追溯；
6. 日志、指标和告警均正常；
7. 回滚路径已验证且上一版本仍可用。
