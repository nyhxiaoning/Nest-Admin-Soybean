# NestJS + Vue Production Deployment Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a repository-grounded Chinese production deployment guide covering both systemd and Docker Compose for the complete Vue + NestJS application.

**Architecture:** Publish one Markdown runbook with the user-requested twelve chapters. Shared architecture, configuration, security, monitoring, and rollback guidance appears once; systemd and Docker Compose receive separate executable deployment procedures inside the relevant chapters.

**Tech Stack:** Ubuntu 22.04/24.04, Node.js 20 LTS, pnpm 10.5.0, Turbo, Vue 3, Vite 7, NestJS 10, Prisma 5, PostgreSQL 16, Redis 7, systemd, Docker Compose, Nginx, Certbot

## Global Constraints

- Write the guide in Chinese at `docs/deploy-online/nestjs-vue-production-deployment.md`.
- Preserve the exact twelve-section structure approved in `docs/superpowers/specs/2026-08-08-nestjs-vue-production-deployment-design.md`.
- Use `admin.example.com`, `/opt/nest-admin-soybean`, and the unprivileged user `nestadmin` in examples.
- Use `/api` as the current NestJS global prefix; readiness is `/api/health/ready`, not `/api/v1/health/ready`.
- Build Vue into `apps/web/dist` and start NestJS from `apps/server/dist/src/main.js`.
- Never copy secrets from tracked or untracked environment files; all credentials and keys use clearly marked example values.
- Production database changes use `prisma migrate deploy`; never recommend `prisma:seed`, `prisma:init`, `prisma:reset`, or `prisma db push --force-reset` in production.
- Proxy `/api/`, `/profile/`, and `/public/` without stripping their path prefixes, and configure Vue history fallback with `try_files`.
- Document both systemd and full Docker Compose as complete, independently executable deployment paths.
- Do not modify runtime code, Dockerfiles, Compose files, or environment files in this documentation task.

---

### Task 1: Create the guide framework and project-specific build/configuration chapters

**Files:**
- Create: `docs/deploy-online/nestjs-vue-production-deployment.md`
- Reference: `package.json`
- Reference: `apps/server/package.json`
- Reference: `apps/web/package.json`
- Reference: `apps/server/src/main.ts`
- Reference: `apps/server/src/config/index.ts`
- Reference: `apps/server/src/config/env.validation.ts`
- Reference: `apps/web/.env.prod`
- Reference: `apps/web/.env.coolify`

**Interfaces:**
- Consumes: Approved architecture and constraints from the design specification.
- Produces: Document title, navigation, conventions, and complete chapters 1–4 used by all later tasks.

- [ ] **Step 1: Create the title, scope, warning block, and twelve-item table of contents**

Start the document with:

```markdown
# Nest-Admin-Soybean 生产环境部署教程

> 适用项目：Vue 3 + Vite 前端、NestJS + Prisma 后端、PostgreSQL、Redis。
> 本文同时提供 systemd 原生部署和 Docker Compose 全容器部署两套方案。

> [!CAUTION]
> 生产环境不得执行 `prisma:seed`、`prisma:init`、`prisma:reset` 或带有
> `--force-reset` / `--accept-data-loss` 的命令。
```

Add all twelve user-requested links and sections with stable Chinese anchors.

- [ ] **Step 2: Write chapter 1 with both deployment topologies and request routing**

Include two text diagrams and a comparison table covering maintenance cost, isolation, resource usage, rollback method, and recommended usage. State that the public Nginx endpoint serves Vue and forwards `/api/`, `/profile/`, and `/public/` to NestJS on port `8080`.

- [ ] **Step 3: Write chapter 2 with reproducible environment requirements**

Document Ubuntu 22.04/24.04, Node.js `>=20.19.0`, pnpm `10.5.0`, PostgreSQL 16, Redis 7, Nginx, Docker Engine, Compose Plugin, DNS, ports 22/80/443, and minimum/recommended machine sizing. Add verification commands:

```bash
node --version
pnpm --version
nginx -v
psql --version
redis-server --version
docker --version
docker compose version
```

- [ ] **Step 4: Write chapter 3 with exact build order and release contents**

Use this validated build sequence:

```bash
corepack enable
corepack prepare pnpm@10.5.0 --activate
pnpm install --frozen-lockfile
pnpm --filter @nest-admin/types build
pnpm --filter @nest-admin/server prisma:generate
pnpm --filter @nest-admin/server build:prod
NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @nest-admin/web build
```

Explain that a systemd release must retain the compiled server, production dependencies, Prisma schema/migrations, `public`, required config assets, `package.json`, workspace package metadata, and Vue `dist`. State that CI/build-machine artifacts are preferred over compiling on the production host.

- [ ] **Step 5: Write chapter 4 with sanitized backend and frontend production templates**

Provide a complete example `EnvironmentFile` at `/etc/nest-admin-soybean/server.env` using values such as:

```dotenv
NODE_ENV=production
APP_PORT=8080
APP_PREFIX=/api
DATABASE_URL=postgresql://nestadmin_app:CHANGE_ME@127.0.0.1:5432/nest_admin?schema=public&sslmode=disable
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=nestadmin_app
DB_PASSWORD=CHANGE_ME
DB_DATABASE=nest_admin
DB_SCHEMA=public
DB_SSL=false
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME
REDIS_DB=0
JWT_SECRET=GENERATE_AT_LEAST_32_RANDOM_BYTES
FILE_IS_LOCAL=true
FILE_UPLOAD_LOCATION=upload
FILE_DOMAIN=https://admin.example.com
FILE_SERVE_ROOT=/profile
LOG_TO_FILE=false
LOG_LEVEL=info
CRYPTO_ENABLED=false
```

Provide a frontend build override that sets `VITE_SERVICE_BASE_URL=` and `VITE_APP_BASE_API=/api`, disables Vite proxying, and keeps history mode. This matches `getServiceBaseURL()`, which concatenates both values, and also gives SSE/WebSocket code the `/api` prefix. Explain build-time immutability of Vite variables, the `apps/server/upload` symlink to the shared upload directory, and `chmod 600` for the backend environment file.

- [ ] **Step 6: Verify chapters 1–4 contain current project paths and no secret values**

Run:

```bash
rg -n "apps/web/dist|apps/server/dist/src/main.js|/api/health/ready|pnpm@10.5.0" docs/deploy-online/nestjs-vue-production-deployment.md
rg -n "linlingqin\.top|MIIBIjAN|123456|change-me-in-production" docs/deploy-online/nestjs-vue-production-deployment.md
```

Expected: the first command finds all required facts; the second command returns no matches.

- [ ] **Step 7: Commit the framework and chapters 1–4**

```bash
git add docs/deploy-online/nestjs-vue-production-deployment.md
git commit -m "docs: add production deployment foundations"
```

### Task 2: Document systemd, Nginx, and HTTPS

**Files:**
- Modify: `docs/deploy-online/nestjs-vue-production-deployment.md`
- Reference: `apps/server/src/main.ts`
- Reference: `apps/server/src/config/index.ts`
- Reference: `apps/web/nginx/default.conf`

**Interfaces:**
- Consumes: Paths, environment file, domain, port, and route prefixes defined in Task 1.
- Produces: Complete chapters 5–6 and reusable service/Nginx configurations referenced by deployment and rollback chapters.

- [ ] **Step 1: Write chapter 5 with directory layout and runtime user setup**

Use this release layout:

```text
/opt/nest-admin-soybean/
├── current -> releases/20260808-120000
├── releases/
└── shared/
    ├── uploads/
    └── logs/
```

Include commands to create the `nestadmin` system user, directories, ownership, environment file, and a release symlink without granting shell login or root ownership to the application.

- [ ] **Step 2: Add a complete systemd unit**

The unit must include:

```ini
[Unit]
Description=Nest-Admin-Soybean NestJS API
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target

[Service]
Type=simple
User=nestadmin
Group=nestadmin
WorkingDirectory=/opt/nest-admin-soybean/current/apps/server
EnvironmentFile=/etc/nest-admin-soybean/server.env
ExecStart=/usr/bin/node dist/src/main.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
KillSignal=SIGTERM
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/nest-admin-soybean /var/log/nest-admin-soybean
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Explain how to resolve the actual Node binary with `command -v node` and update `ExecStart` when Node was installed outside `/usr/bin`.

- [ ] **Step 3: Add systemd lifecycle and diagnostic commands**

Include daemon reload, enable/start, restart, status, `journalctl`, graceful stop, and readiness checks. Use `curl --fail http://127.0.0.1:8080/api/health/ready` as the success gate.

- [ ] **Step 4: Write chapter 6 with a complete Nginx HTTP configuration**

The server block must:

- serve `/opt/nest-admin-soybean/current/apps/web/dist`;
- use `try_files $uri $uri/ /index.html`;
- proxy `/api/`, `/profile/`, and `/public/` to `http://127.0.0.1:8080` without a trailing URI on `proxy_pass`;
- set Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto;
- configure upload size, proxy timeouts, hashed-asset caching, and no-cache for `index.html`;
- deny or IP-restrict `/api/swagger-ui`, `/api/metrics`, and detailed health endpoints.

- [ ] **Step 5: Add HTTPS issuance and renewal verification**

Include:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d admin.example.com
sudo certbot renew --dry-run
```

Explain the HTTP-to-HTTPS redirect and HSTS rollout caution.

- [ ] **Step 6: Verify route forwarding and service management examples**

Run:

```bash
rg -n "try_files.*index.html|location /api/|location /profile/|location /public/|proxy_pass http://127.0.0.1:8080" docs/deploy-online/nestjs-vue-production-deployment.md
rg -n "ExecStart=.*/node dist/src/main.js|Restart=on-failure|KillSignal=SIGTERM|certbot renew --dry-run" docs/deploy-online/nestjs-vue-production-deployment.md
```

Expected: every required proxy and systemd directive appears.

- [ ] **Step 7: Commit systemd and Nginx chapters**

```bash
git add docs/deploy-online/nestjs-vue-production-deployment.md
git commit -m "docs: add systemd Nginx and HTTPS deployment"
```

### Task 3: Document database/Redis hardening and both executable deployment paths

**Files:**
- Modify: `docs/deploy-online/nestjs-vue-production-deployment.md`
- Reference: `apps/server/prisma/schema.prisma`
- Reference: `apps/server/docker-entrypoint.sh`
- Reference: `apps/server/Dockerfile`
- Reference: `apps/web/Dockerfile`
- Reference: `docker-compose.yml`

**Interfaces:**
- Consumes: Build artifacts, environment variables, systemd unit, Nginx routes, and readiness gate from Tasks 1–2.
- Produces: Complete chapters 7–8, including copyable systemd and Docker Compose first-deployment/update procedures.

- [ ] **Step 1: Write PostgreSQL production hardening guidance in chapter 7**

Include a dedicated application database/user, least privilege, local/private-network binding, TLS for remote databases, backup retention, restore drills, connection limits, and a pre-migration `pg_dump` example. Explain that `DATABASE_URL` is mandatory because Prisma reads it directly.

- [ ] **Step 2: Write Redis production hardening guidance in chapter 7**

Cover protected mode, private binding, ACL/password authentication, AOF persistence, memory limit/eviction policy, backup, monitoring, and separate logical DB/key prefix considerations. Explicitly forbid exposing port 6379 to the public internet and warn that `FLUSHDB` invalidates sessions and cached menus.

- [ ] **Step 3: Define the production migration policy**

Use:

```bash
cd /opt/nest-admin-soybean/current/apps/server
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
```

Document `prisma:seed:migration` as a separately reviewed project data patch, not an automatic schema migration. Put destructive initialization commands in a “never run in production” warning table.

- [ ] **Step 4: Write the complete systemd deployment procedure in chapter 8**

Provide numbered first-deployment and update flows: preflight, build, upload to a timestamped release, install production dependencies, link shared uploads, backup database, check/apply Prisma migrations, atomically switch `current`, restart systemd, verify readiness/UI/login/static files, and switch back on failure.

- [ ] **Step 5: Add a safe systemd deployment script template**

The script must use `set -Eeuo pipefail`, explicit paths, a timestamped release, `trap` for failure reporting, readiness retries, and no recursive deletion of unresolved variables. It may retain releases but must not automatically delete them in the baseline example.

- [ ] **Step 6: Write the complete Docker Compose deployment procedure in chapter 8**

Include creation of a root `.env` with strong generated secrets, image build, dependency health, migration behavior, startup, readiness checks, logs, updates, and rollback by immutable image/Git SHA. Explain that the repository currently publishes the web container on `${WEB_PORT:-3000}` and the host Nginx should proxy to `127.0.0.1:3000`.

- [ ] **Step 7: Add a deployment-blocking repository drift warning**

Show the required correction conceptually:

```yaml
healthcheck:
  test:
    - CMD-SHELL
    - node -e "/* request http://127.0.0.1:8080/api/health/ready */"
```

State that current Dockerfile/Compose `/api/v1/health/ready` checks do not match `main.ts`, current `.env.prod` `/prod-api` does not match the Nginx `/api/` proxy, and current absolute `FILE_UPLOAD_LOCATION=/data/uploads` is joined to `process.cwd()` by the application instead of resolving to the mounted volume. Document `FILE_UPLOAD_LOCATION=../../../data/uploads` for the current container workdir. Do not edit those files in this task.

- [ ] **Step 8: Verify migration safety and dual-path completeness**

Run:

```bash
rg -n "prisma migrate deploy|pg_dump|FLUSHDB|systemd 首次部署|Docker Compose 首次部署|/api/health/ready" docs/deploy-online/nestjs-vue-production-deployment.md
rg -n "prisma (db push|migrate reset)|prisma:(seed|init|reset)" docs/deploy-online/nestjs-vue-production-deployment.md
```

Expected: safe migration and both deployment paths are present; destructive commands appear only inside explicit prohibition/warning sections.

- [ ] **Step 9: Commit database and deployment procedures**

```bash
git add docs/deploy-online/nestjs-vue-production-deployment.md
git commit -m "docs: add hardened production deployment procedures"
```

### Task 4: Complete operations, security, rollback, and environment comparison

**Files:**
- Modify: `docs/deploy-online/nestjs-vue-production-deployment.md`
- Reference: `apps/server/src/module/monitor/health/health.controller.ts`
- Reference: `apps/server/src/observability/metrics`
- Reference: `apps/server/src/infrastructure/logging`
- Reference: `apps/server/monitoring/README.md`

**Interfaces:**
- Consumes: Both deployment paths and their readiness/rollback primitives.
- Produces: Complete chapters 9–12 and operational checklists that finish the guide.

- [ ] **Step 1: Write chapter 9 for logs, health checks, metrics, and alerting**

Cover `journalctl -u nest-admin-server`, `docker compose logs`, Nginx access/error logs, Pino file logging when enabled, logrotate, `/api/health/live`, `/api/health/ready`, `/api/metrics`, and alert thresholds for process availability, 5xx rate, latency, memory, disk, PostgreSQL, Redis, and certificate expiry.

- [ ] **Step 2: Write chapter 10 as a production security checklist**

Use checkboxes for non-root execution, SSH keys, UFW, Fail2ban, restricted database/Redis ports, strong JWT/RSA keys, disabled source maps/debug logging, protected Swagger/metrics, upload permissions, encrypted backups, dependency/image patching, and sensitive-log redaction.

- [ ] **Step 3: Write chapter 11 with release and rollback runbooks**

Document `releases/<timestamp-or-git-sha>`, the `current` symlink, shared data, keeping at least two known-good releases, application rollback commands, Docker immutable tags, and post-rollback readiness checks. Explain why applied Prisma migrations use forward-fix/compensation migrations instead of deleting migration history.

- [ ] **Step 4: Write chapter 12 as a local-versus-production comparison table**

Compare process manager, hot reload, environment source, frontend API URL, CORS, database, Redis DB, migrations, logging, TLS, file storage, Swagger/metrics exposure, build artifacts, and restart behavior. State that Vite production environment variables require a rebuild.

- [ ] **Step 5: Add pre-deployment, post-deployment, and troubleshooting checklists**

Include checks for DNS, ports, secrets, backup, migrations, service state, health, UI refresh/history routes, login, uploads, logs, and certificate renewal. Add targeted troubleshooting for 502, SPA 404, Prisma connection failure, Redis authentication failure, failed readiness, and missing static uploads.

- [ ] **Step 6: Commit operations and rollback chapters**

```bash
git add docs/deploy-online/nestjs-vue-production-deployment.md
git commit -m "docs: complete production operations runbook"
```

### Task 5: Perform final documentation verification

**Files:**
- Modify if verification finds issues: `docs/deploy-online/nestjs-vue-production-deployment.md`
- Verify against: `docs/superpowers/specs/2026-08-08-nestjs-vue-production-deployment-design.md`

**Interfaces:**
- Consumes: Completed guide from Tasks 1–4.
- Produces: A consistent, safe, navigable production runbook ready for user handoff.

- [ ] **Step 1: Verify all twelve chapters and table-of-contents links**

Run:

```bash
rg -n '^## (一|二|三|四|五|六|七|八|九|十|十一|十二)、' docs/deploy-online/nestjs-vue-production-deployment.md
rg -n '^1\. \[部署架构总览\]|^12\. \[与本地开发环境差异对照\]' docs/deploy-online/nestjs-vue-production-deployment.md
```

Expected: exactly twelve chapter headings and both boundary table-of-contents entries.

- [ ] **Step 2: Cross-check source-derived paths, routes, and commands**

Run:

```bash
rg -n '"start:prod"|"build:prod"|"prisma:deploy"' apps/server/package.json
rg -n "setGlobalPrefix|API 版本控制已移除" apps/server/src/main.ts
rg -n "@Get\('/ready'\)|@Controller\('health'\)" apps/server/src/module/monitor/health/health.controller.ts
rg -n "dist/src/main.js|apps/web/dist|/api/health/ready" docs/deploy-online/nestjs-vue-production-deployment.md
```

Expected: documented paths/routes agree with the current source.

- [ ] **Step 3: Scan for secrets, placeholders, unsafe defaults, and stale routes**

Run:

```bash
rg -n "linlingqin\.top|MIIBIjAN|123456|change-me-in-production|postgres:postgres|/api/v1/health" docs/deploy-online/nestjs-vue-production-deployment.md
rg -n "TBD|TODO|稍后补充|此处省略" docs/deploy-online/nestjs-vue-production-deployment.md
```

Expected: stale `/api/v1/health` may appear only in the explicitly labeled repository-risk warning; every other pattern returns no matches.

- [ ] **Step 4: Validate Markdown and whitespace**

Run the repository-available Markdown checker if present, then always run:

```bash
git diff --check
```

Expected: no whitespace errors. Manually confirm every fenced code block is closed and each shell block has an appropriate language tag.

- [ ] **Step 5: Review every destructive command in context**

Search:

```bash
rg -n "rm -|DROP |FLUSHDB|reset|accept-data-loss|force-reset" docs/deploy-online/nestjs-vue-production-deployment.md
```

Expected: each match is either a clearly labeled prohibition, a bounded version-retention example with an explicit target, or a manually confirmed disaster-recovery procedure.

- [ ] **Step 6: Commit final corrections if verification changed the guide**

```bash
git add docs/deploy-online/nestjs-vue-production-deployment.md
git commit -m "docs: verify production deployment guide"
```

- [ ] **Step 7: Report verification evidence**

Report the final file path, chapter count, both covered deployment paths, validation commands, any repository drift warnings, and the resulting commit hashes.
