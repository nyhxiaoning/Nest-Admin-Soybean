# PC Creator Center Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated NestJS authentication module for PC Creator Center with four-digit phone codes, phone/password login, automatic user creation, password management, JWT sessions, and logout.

**Architecture:** Add a standalone `CreatorUser` Prisma model and a `src/module/creator/auth` bounded context. Reuse project Prisma, Redis, JWT configuration, bcrypt, response, and exception infrastructure while keeping all Creator identities and Redis keys separate from `SysUser` and backend admin sessions. Public endpoints bypass the admin global guard; protected endpoints use a dedicated Creator JWT guard.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL, ioredis, `@nestjs/jwt`, bcryptjs, class-validator, Jest

## Global Constraints

- Use the term `PC Creator Center` in Swagger, code comments, JWT subject type, Redis prefixes, and documentation.
- Do not read or write `SysUser`, tenant, role, menu, or admin login-session data.
- Only `PHONE` accounts are supported; `EMAIL` must be rejected explicitly.
- Verification codes are exactly four digits, expire after five minutes, and are consumed after successful verification.
- Code login automatically creates a missing Creator user.
- Production responses never expose verification codes; development and test responses may include them.
- Passwords are bcrypt hashes and must be 8–64 characters before hashing.
- No new npm dependency is added.

---

## File Structure

- `apps/server/prisma/schema.prisma`: owns the `CreatorUser` persistence model.
- `apps/server/prisma/migrations/202608190001_add_pc_creator_center_auth/migration.sql`: creates the isolated database table and unique phone index.
- `apps/server/src/module/creator/creator.module.ts`: composes the PC Creator Center domain.
- `apps/server/src/module/creator/README.md`: documents layering and reuse rules for future Creator modules.
- `apps/server/src/module/creator/common/constants/creator-auth.constants.ts`: owns reusable account/login/status values, Redis keys, TTLs, and JWT subject type.
- `apps/server/src/module/creator/common/interfaces/creator-session.interface.ts`: owns the shared Creator session contract.
- `apps/server/src/module/creator/common/index.ts`: is the supported shared import surface for future Creator modules.
- `apps/server/src/module/creator/auth/dto/*.ts`: owns request validation and Swagger schemas.
- `apps/server/src/module/creator/auth/services/creator-auth.service.ts`: owns code, login, password, session, and logout behavior.
- `apps/server/src/module/creator/common/guards/creator-jwt.guard.ts`: validates Creator JWT sessions for all Creator modules.
- `apps/server/src/module/creator/common/decorators/creator-user.decorator.ts`: exposes the validated Creator session to Creator controllers.
- `apps/server/src/module/creator/auth/controllers/creator-auth.controller.ts`: exposes the four `/creator/auth` endpoints.
- `apps/server/src/module/creator/auth/creator-auth.module.ts`: configures JWT and dependency injection.
- `apps/server/src/app.module.ts`: imports `CreatorModule`.
- `apps/server/test/unit/module/creator/auth/creator-auth.service.spec.ts`: verifies service behavior.
- `apps/server/test/unit/module/creator/auth/creator-jwt.guard.spec.ts`: verifies token-domain and Redis-session isolation.

### Task 1: Add isolated Creator persistence

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Create: `apps/server/prisma/migrations/202608190001_add_pc_creator_center_auth/migration.sql`

**Interfaces:**
- Produces: Prisma delegate `prisma.creatorUser` and generated type `CreatorUser`

- [ ] **Step 1: Add the Prisma model**

```prisma
/// PC Creator Center 独立用户，不属于后台 SysUser、租户、角色或菜单体系。
model CreatorUser {
  id          String    @id @default(uuid()) @db.Uuid
  phone       String    @unique @db.VarChar(11)
  password    String?   @db.VarChar(200)
  name        String    @db.VarChar(50)
  status      String    @default("ACTIVE") @db.VarChar(20)
  lastLoginAt DateTime? @map("last_login_at") @db.Timestamp(6)
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)

  @@index([status])
  @@map("creator_user")
}
```

- [ ] **Step 2: Add the SQL migration**

```sql
CREATE TABLE "creator_user" (
  "id" UUID NOT NULL,
  "phone" VARCHAR(11) NOT NULL,
  "password" VARCHAR(200),
  "name" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "last_login_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creator_user_phone_key" ON "creator_user"("phone");
CREATE INDEX "creator_user_status_idx" ON "creator_user"("status");
```

- [ ] **Step 3: Generate and validate Prisma Client**

Run: `pnpm --dir apps/server prisma:generate`

Run: `pnpm --dir apps/server exec prisma validate`

Expected: both commands exit 0 and `PrismaService` exposes `creatorUser`.

### Task 2: Implement four-digit verification codes

**Files:**
- Create: `apps/server/src/module/creator/auth/creator-auth.constants.ts`
- Create: `apps/server/src/module/creator/auth/dto/send-creator-code.request.dto.ts`
- Create: `apps/server/src/module/creator/auth/dto/creator-auth.response.dto.ts`
- Create: `apps/server/src/module/creator/auth/dto/index.ts`
- Create: `apps/server/src/module/creator/auth/creator-auth.service.ts`
- Create: `apps/server/test/unit/module/creator/auth/creator-auth.service.spec.ts`

**Interfaces:**
- Produces: `CreatorAuthService.sendCode(dto): Promise<{ code?: string }>`
- Produces: Redis keys under `pc-creator-center:auth:code:*` and `pc-creator-center:auth:code-cooldown:*`

- [ ] **Step 1: Write the failing send-code tests**

```ts
it('stores a four-digit code for five minutes', async () => {
  jest.spyOn(crypto, 'randomInt').mockReturnValue(42);

  await service.sendCode({ accountType: 'PHONE', phone: '13800138000' });

  expect(redis.set).toHaveBeenCalledWith(
    'pc-creator-center:auth:code:13800138000',
    { code: '0042', attempts: 0 },
    300_000,
  );
});

it('rejects another code during the 60 second cooldown', async () => {
  redis.get.mockResolvedValueOnce('1');
  await expect(service.sendCode({ accountType: 'PHONE', phone: '13800138000' })).rejects.toThrow(
    '验证码发送过于频繁',
  );
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `pnpm --dir apps/server test -- --runInBand test/unit/module/creator/auth/creator-auth.service.spec.ts`

Expected: FAIL because the Creator service and DTOs do not exist.

- [ ] **Step 3: Implement constants, DTO validation, and sendCode**

Use `randomInt(0, 10_000).toString().padStart(4, '0')`. Store `{ code, attempts: 0 }` for `300_000` ms and the cooldown marker for `60_000` ms. Return `{ code }` only when `NODE_ENV !== 'production'`; otherwise return `{}`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `pnpm --dir apps/server test -- --runInBand test/unit/module/creator/auth/creator-auth.service.spec.ts`

Expected: PASS for four-digit formatting, TTL, cooldown, and production masking.

### Task 3: Implement login, automatic creation, sessions, and passwords

**Files:**
- Create: `apps/server/src/module/creator/auth/dto/creator-login.request.dto.ts`
- Create: `apps/server/src/module/creator/auth/dto/set-creator-password.request.dto.ts`
- Create: `apps/server/src/module/creator/auth/dto/creator-logout.request.dto.ts`
- Modify: `apps/server/src/module/creator/auth/dto/index.ts`
- Modify: `apps/server/src/module/creator/auth/creator-auth.service.ts`
- Modify: `apps/server/test/unit/module/creator/auth/creator-auth.service.spec.ts`

**Interfaces:**
- Produces: `login(dto): Promise<CreatorLoginResult>`
- Produces: `setPassword(session, dto): Promise<void>`
- Produces: `logout(session): Promise<void>`
- Produces JWT payload `{ sub, uuid, subjectType: 'pc-creator-center' }`

- [ ] **Step 1: Add a failing code-login auto-creation test**

```ts
it('creates a Creator user after a valid code and returns a Creator JWT', async () => {
  redis.get.mockResolvedValue({ code: '0042', attempts: 0 });
  prisma.creatorUser.findUnique.mockResolvedValue(null);
  prisma.creatorUser.upsert.mockResolvedValue(creatorUser);
  jwt.signAsync.mockResolvedValue('creator-jwt');

  await expect(
    service.login({ accountType: 'PHONE', loginType: 'CODE', phone: '13800138000', code: '0042' }),
  ).resolves.toMatchObject({ token: 'creator-jwt', id: creatorUser.id, phone: creatorUser.phone });
});
```

- [ ] **Step 2: Implement one-time code verification and auto-creation**

Increment the stored attempt counter after a mismatch and delete the code after five failures. On success, delete the code before issuing a session, then use `creatorUser.upsert({ where: { phone }, create: { phone, name: `用户${phone.slice(-5)}` }, update: {} })` and update `lastLoginAt`.

- [ ] **Step 3: Add a failing password-login test**

```ts
it('rejects a missing or incorrect Creator password without revealing account existence', async () => {
  prisma.creatorUser.findUnique.mockResolvedValue({ ...creatorUser, password: null });
  await expect(passwordLogin()).rejects.toThrow('手机号或密码错误');
});
```

- [ ] **Step 4: Implement password login and lockout**

Validate the lock key first. Compare with `bcrypt.compare`. Increment the password failure counter with a 15-minute TTL; at five failures set the lock key for 15 minutes. Clear failure state after success.

- [ ] **Step 5: Add failing password-management tests**

Cover first password set without `currentPassword`, rejection when an existing password has no correct `currentPassword`, and bcrypt hashing. Keep the authenticated request session active after a successful password change.

- [ ] **Step 6: Implement password management and logout**

Hash `newPassword` with `bcrypt.hash(newPassword, 10)`. Update only the authenticated `CreatorUser`. Logout deletes `pc-creator-center:auth:session:<uuid>`.

- [ ] **Step 7: Run the service tests**

Run: `pnpm --dir apps/server test -- --runInBand test/unit/module/creator/auth/creator-auth.service.spec.ts`

Expected: PASS for code login, auto-creation, password login, lockout, password management, session creation, and logout.

### Task 4: Add the dedicated Creator JWT boundary and HTTP endpoints

**Files:**
- Create: `apps/server/src/module/creator/auth/creator-jwt.guard.ts`
- Create: `apps/server/src/module/creator/auth/creator-user.decorator.ts`
- Create: `apps/server/src/module/creator/auth/creator-auth.controller.ts`
- Create: `apps/server/src/module/creator/auth/creator-auth.module.ts`
- Create: `apps/server/src/module/creator/creator.module.ts`
- Modify: `apps/server/src/app.module.ts`
- Create: `apps/server/test/unit/module/creator/auth/creator-jwt.guard.spec.ts`

**Interfaces:**
- Consumes: Bearer JWT and `pc-creator-center:auth:session:<uuid>`
- Produces: `request.creatorUser` with `{ id, phone, name, sessionUuid }`
- Produces: `/creator/auth/code`, `/creator/auth/login`, `/creator/auth/password`, `/creator/auth/logout`

- [ ] **Step 1: Write failing guard-domain tests**

```ts
it('rejects an otherwise valid admin token', async () => {
  jwt.verifyAsync.mockResolvedValue({ sub: '1', uuid: 'admin-session' });
  await expect(guard.canActivate(context)).rejects.toThrow('无效的创作者登录凭证');
});

it('rejects a Creator token after logout', async () => {
  jwt.verifyAsync.mockResolvedValue({ sub: creatorUser.id, uuid: 'creator-session', subjectType: 'pc-creator-center' });
  redis.get.mockResolvedValue(null);
  await expect(guard.canActivate(context)).rejects.toThrow('创作者登录已过期');
});
```

- [ ] **Step 2: Implement CreatorJwtGuard and creator-user decorator**

Extract the Bearer token, call `jwt.verifyAsync`, validate the exact subject type, load the isolated Redis session, confirm `CreatorUser.status === 'ACTIVE'`, and assign the typed session to `request.creatorUser`.

- [ ] **Step 3: Implement the controller contract**

Annotate the controller with `@ApiTags('PC Creator Center - 认证')`, `@Controller('creator/auth')`, `@NotRequireAuth()`, and `@IgnoreTenant()`. Apply `@UseGuards(CreatorJwtGuard)` only to password and logout endpoints. Return all successful results with `Result.ok(...)`.

- [ ] **Step 4: Wire the modules**

Register `JwtModule` with `AppConfigService.jwt.secretkey`, export the service and guard from `CreatorAuthModule`, import it from `CreatorModule`, then import `CreatorModule` in `AppModule`.

- [ ] **Step 5: Run guard and service tests**

Run: `pnpm --dir apps/server test -- --runInBand test/unit/module/creator/auth`

Expected: all PC Creator Center auth tests pass.

### Task 5: Validate integration and generated Prisma types

**Files:**
- Verify: all files listed above

**Interfaces:**
- Produces: buildable Server module matching `apps/pc-creator-center/src/api/auth.ts`

- [ ] **Step 1: Validate Prisma**

Run: `pnpm --dir apps/server exec prisma validate`

Expected: schema is valid.

- [ ] **Step 2: Run focused tests**

Run: `pnpm --dir apps/server test -- --runInBand test/unit/module/creator/auth`

Expected: all Creator auth tests pass.

- [ ] **Step 3: Run TypeScript build**

Run: `pnpm --dir apps/server build:test`

Expected: Nest build exits 0.

- [ ] **Step 4: Run read-only lint on changed TypeScript files**

Run: `pnpm --dir apps/server exec eslint "src/module/creator/**/*.ts" "test/unit/module/creator/**/*.ts"`

Expected: exit code 0 without modifying files.

- [ ] **Step 5: Inspect the final diff**

Confirm the diff contains only the independent PC Creator Center model, migration, module, tests, AppModule import, and approved documentation. Confirm no `SysUser`, tenant, role, or menu service is referenced by `src/module/creator`.
