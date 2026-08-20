# PC Creator Center Works Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement authenticated PC Creator Center work CRUD, tags, Aliyun OSS STS upload credentials, release management, and creator-side publication state transitions in `apps/server`, matching the existing PC frontend APIs.

**Architecture:** Add a cohesive `CreatorWorksModule` under the existing Creator domain, split into CRUD, release, upload, repository, and DTO responsibilities. Keep reusable Aliyun STS access in a sibling `CreatorStorageModule`; every operation derives ownership from `CreatorJwtGuard` and `@CreatorUser()`, while Prisma persists works, tags, tag relations, and immutable submission snapshots.

**Tech Stack:** NestJS 10, Prisma 5/PostgreSQL, class-validator, Jest/Supertest, Alibaba Cloud Node.js V2 STS SDK, Vue 3/Axios, ali-oss 6.22.

## Global Constraints

- All `/api/creator/works/**` and `/api/creator/work-tags` endpoints require a valid PC Creator Center session through `CreatorJwtGuard`.
- Never use `SysUser`, tenant, role, menu, or backend-admin permission checks for Creator works.
- Never accept `creatorId` from request bodies; derive it from `CreatorSession.id`.
- Every work lookup, update, delete, and release transition must scope by `creatorId` and `deletedAt: null`.
- Deletion is soft deletion; `REVIEWING` and `PUBLISHED` works cannot be directly deleted.
- Browser upload uses 900-second Aliyun STS credentials restricted to one creator-owned object prefix; no permanent AccessKey may be returned or logged.
- Preserve the server-wide `{ code, msg, data }` response contract and normalize it to the frontend's existing `result` field in the PC Creator Center HTTP adapter.
- Preserve unrelated existing worktree changes, especially `apps/server/src/main.ts` and `apps/pc-creator-center/src/locales/zh-CN/common.ts`.

---

## File Structure

**Create:**

```text
apps/server/src/config/types/creator-storage.config.ts
apps/server/src/module/creator/storage/creator-storage.module.ts
apps/server/src/module/creator/storage/services/creator-oss-sts.service.ts
apps/server/src/module/creator/storage/interfaces/creator-upload-credential.interface.ts
apps/server/src/module/creator/works/creator-works.module.ts
apps/server/src/module/creator/works/constants/creator-work.constants.ts
apps/server/src/module/creator/works/controllers/creator-works.controller.ts
apps/server/src/module/creator/works/controllers/creator-work-tags.controller.ts
apps/server/src/module/creator/works/dto/index.ts
apps/server/src/module/creator/works/dto/requests/creator-work-save.request.dto.ts
apps/server/src/module/creator/works/dto/requests/creator-work-page.request.dto.ts
apps/server/src/module/creator/works/dto/requests/creator-release-page.request.dto.ts
apps/server/src/module/creator/works/dto/requests/creator-work-submit.request.dto.ts
apps/server/src/module/creator/works/dto/requests/creator-upload-token.request.dto.ts
apps/server/src/module/creator/works/dto/responses/creator-work.response.dto.ts
apps/server/src/module/creator/works/dto/responses/creator-work-page.response.dto.ts
apps/server/src/module/creator/works/dto/responses/creator-release.response.dto.ts
apps/server/src/module/creator/works/dto/responses/creator-upload-token.response.dto.ts
apps/server/src/module/creator/works/repositories/creator-work.repository.ts
apps/server/src/module/creator/works/repositories/creator-work-tag.repository.ts
apps/server/src/module/creator/works/repositories/creator-work-submission.repository.ts
apps/server/src/module/creator/works/services/creator-works.service.ts
apps/server/src/module/creator/works/services/creator-work-release.service.ts
apps/server/src/module/creator/works/services/creator-work-upload.service.ts
apps/server/test/unit/module/creator/works/creator-works.service.spec.ts
apps/server/test/unit/module/creator/works/creator-work-release.service.spec.ts
apps/server/test/unit/module/creator/works/creator-work-upload.service.spec.ts
apps/server/test/integration/creator/creator-works.integration.spec.ts
apps/server/test/e2e/creator-works.e2e-spec.ts
```

**Modify:**

```text
apps/server/package.json
pnpm-lock.yaml
apps/server/prisma/schema.prisma
apps/server/prisma/seed.ts
apps/server/src/config/index.ts
apps/server/src/config/types/index.ts
apps/server/src/config/app-config.service.ts
apps/server/src/config/env.validation.ts
apps/server/.env.example
apps/server/src/module/creator/creator.module.ts
apps/server/src/module/creator/README.md
apps/pc-creator-center/src/http/request.ts
apps/pc-creator-center/src/lib/images/AliOSS.ts
apps/pc-creator-center/src/api/works.ts
```

---

### Task 1: Lock the Creator work contract and response normalization

**Files:**
- Modify: `apps/pc-creator-center/src/http/request.ts`
- Modify: `apps/pc-creator-center/src/api/works.ts`
- Test: `apps/server/test/e2e/creator-works.e2e-spec.ts`

**Interfaces:**
- Consumes: NestJS `Result<T>` shaped as `{ code, msg, data }`.
- Produces: frontend `ApiResult<T>` shaped as `{ code, message, result }` without changing existing call sites.

- [ ] **Step 1: Add the failing contract assertion**

Add an E2E assertion that a successful work endpoint uses the server standard:

```ts
expect(response.body).toMatchObject({
  code: 200,
  msg: expect.any(String),
  data: expect.anything(),
});
```

- [ ] **Step 2: Run the focused E2E test and verify it fails because the route is absent**

Run:

```bash
pnpm --dir apps/server test:e2e -- --runInBand test/e2e/creator-works.e2e-spec.ts
```

Expected: failure with `404` for `/api/creator/works`.

- [ ] **Step 3: Normalize the PC frontend response shape**

In `src/http/request.ts`, preserve the raw response while adding the frontend alias:

```ts
if (data?.code === 200) {
  return {
    ...data,
    message: data.message ?? data.msg,
    result: data.result ?? data.data,
  }
}
```

Correct `CreatorUploadTokenRequest.role` so it contains each role exactly once:

```ts
role: 'COVER_IMAGE' | 'GIF_FILE' | 'EDITABLE_JSON' | 'STATIC_BIN'
```

Change `getUploadTokenApi` to accept a `CreatorUploadTokenRequest`, not a string hidden behind `any`.

- [ ] **Step 4: Type-check the PC frontend**

Run:

```bash
pnpm --dir apps/pc-creator-center exec vue-tsc --noEmit
```

Expected: no new TypeScript errors from the HTTP or works API changes; pre-existing errors, if present, must be recorded separately.

- [ ] **Step 5: Commit only the contract changes**

```bash
git add apps/pc-creator-center/src/http/request.ts apps/pc-creator-center/src/api/works.ts apps/server/test/e2e/creator-works.e2e-spec.ts
git commit -m "test: lock creator works api contract"
```

---

### Task 2: Add the Prisma work, tag, and submission schema

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Create: `apps/server/prisma/migrations/202608200001_add_creator_works/migration.sql`
- Modify: `apps/server/prisma/seed.ts`
- Test: `apps/server/test/integration/creator/creator-works.integration.spec.ts`

**Interfaces:**
- Consumes: existing `CreatorUser.id` UUID.
- Produces: Prisma delegates `creatorWork`, `creatorWorkTag`, `creatorWorkTagRelation`, and `creatorWorkSubmission`.

- [ ] **Step 1: Add an integration test for creator ownership and soft deletion**

Create two Creator users, create one work for the first user, and assert:

```ts
expect(await prisma.creatorWork.count({
  where: { creatorId: creatorA.id, deletedAt: null },
})).toBe(1)

expect(await prisma.creatorWork.count({
  where: { creatorId: creatorB.id, deletedAt: null },
})).toBe(0)
```

- [ ] **Step 2: Run the integration test and verify missing Prisma models**

Run:

```bash
pnpm --dir apps/server test:integration -- --runInBand test/integration/creator/creator-works.integration.spec.ts
```

Expected: TypeScript or runtime failure because `creatorWork` does not exist.

- [ ] **Step 3: Add the Prisma enums and models**

Use these enum values:

```prisma
enum CreatorWorkType {
  STATIC
  GIF
}

enum CreatorWorkPublishStatus {
  OFFLINE
  REVIEWING
  REJECTED
  PUBLISHED
}

enum CreatorWorkSubmissionType {
  PUBLISH
  UPDATE
}

enum CreatorWorkSubmissionStatus {
  REVIEWING
  APPROVED
  REJECTED
  WITHDRAWN
}
```

`CreatorWork` must include UUID ownership, all fields in `CreatorWorkSaveRequest`, `workVersion`, `contentConsistent`, `publishedSnapshot Json?`, `submittedAt`, `rejectedReason`, `lastViewAt`, `deletedAt`, `createdAt`, and `updatedAt`. Add indexes:

```prisma
@@index([creatorId, deletedAt, updatedAt])
@@index([creatorId, publishStatus, deletedAt])
@@index([creatorId, title])
```

`CreatorWorkTag` must have unique `tagCode`, `name`, `enabled`, `sortOrder`, and timestamps. `CreatorWorkTagRelation` must use `@@unique([workId, tagId])`. `CreatorWorkSubmission` must contain `snapshot Json`, submission type/status, version, remark, rejected reason, submission/audit timestamps, and creator/work relations.

- [ ] **Step 4: Generate and inspect the migration**

Run in development only:

```bash
pnpm --dir apps/server prisma:migrate -- --name add_creator_works
pnpm --dir apps/server prisma:generate
pnpm --dir apps/server exec prisma validate
```

Expected: migration SQL creates four tables, foreign keys to `creator_user` and creator work tables, unique tag code, and the declared indexes without resetting existing data.

- [ ] **Step 5: Seed stable initial tags idempotently**

Use `upsert({ where: { tagCode }, update: { name, enabled, sortOrder }, create })` for this initial list so repeated non-destructive seed execution is safe:

```ts
[
  { tagCode: 'ORIGINAL', name: '原创作品', sortOrder: 10 },
  { tagCode: 'ANIMATION', name: '动态作品', sortOrder: 20 },
  { tagCode: 'STATIC', name: '静态作品', sortOrder: 30 },
  { tagCode: 'OTHER', name: '其他', sortOrder: 40 },
]
```

- [ ] **Step 6: Re-run the integration test**

Run:

```bash
pnpm --dir apps/server test:integration -- --runInBand test/integration/creator/creator-works.integration.spec.ts
```

Expected: ownership and soft-delete persistence assertions pass.

- [ ] **Step 7: Commit the schema slice**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations apps/server/prisma/seed.ts apps/server/test/integration/creator/creator-works.integration.spec.ts
git commit -m "feat: add creator works persistence"
```

---

### Task 3: Implement Creator-specific DTOs and constants

**Files:**
- Create: `apps/server/src/module/creator/works/constants/creator-work.constants.ts`
- Create: `apps/server/src/module/creator/works/dto/requests/*.ts`
- Create: `apps/server/src/module/creator/works/dto/responses/*.ts`
- Create: `apps/server/src/module/creator/works/dto/index.ts`
- Test: `apps/server/test/unit/module/creator/works/creator-works.service.spec.ts`

**Interfaces:**
- Consumes: query names and enum strings from `apps/pc-creator-center/src/api/works.ts`.
- Produces: validated `CreatorWorkSaveRequestDto`, `CreatorWorkPageRequestDto`, `CreatorReleasePageRequestDto`, `CreatorWorkSubmitRequestDto`, and `CreatorUploadTokenRequestDto`.

- [ ] **Step 1: Write failing validation tests**

Cover these cases with `validate(plainToInstance(CreatorWorkPageRequestDto, payload))`, `validate(plainToInstance(CreatorWorkSaveRequestDto, payload))`, and `validate(plainToInstance(CreatorUploadTokenRequestDto, payload))`:

```ts
['pageNumber=0', 'pageSize=101', 'invalid sortBy', 'invalid direction',
 'empty title', 'width below 1', 'negative file size', 'unknown upload role']
```

- [ ] **Step 2: Run the unit test and verify DTO imports fail**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-works.service.spec.ts
```

- [ ] **Step 3: Implement the request contracts**

Creator pagination must expose:

```ts
pageNumber = 1
pageSize = 20
get skip() { return (this.pageNumber - 1) * this.pageSize }
get take() { return this.pageSize }
```

Map only allowed sort values:

```ts
const CREATOR_WORK_SORT_FIELD = {
  CREATED_AT: 'createdAt',
  LAST_VIEW_TIME: 'lastViewAt',
  TITLE: 'title',
} as const
```

Validate title length `1..100`, dimensions `1..4096`, frame count `1..10000`, frame delay `1..60000`, and file sizes as non-negative safe integers. Create and update share one DTO, but the service ignores body `id` and prevents client mutation of publication/audit fields.

- [ ] **Step 4: Implement response mapping**

Dates returned to the PC frontend must be epoch milliseconds:

```ts
createTime: entity.createdAt.getTime(),
updateTime: entity.updatedAt.getTime(),
submittedTime: entity.submittedAt?.getTime(),
lastViewTime: entity.lastViewAt?.getTime(),
```

Convert Prisma `BigInt` sizes to JavaScript numbers only after checking `Number.isSafeInteger(Number(value))`.

- [ ] **Step 5: Run unit tests and build**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-works.service.spec.ts
pnpm --dir apps/server build:test
```

Expected: validation tests pass and DTOs compile.

- [ ] **Step 6: Commit DTOs**

```bash
git add apps/server/src/module/creator/works/constants apps/server/src/module/creator/works/dto apps/server/test/unit/module/creator/works/creator-works.service.spec.ts
git commit -m "feat: define creator works contracts"
```

---

### Task 4: Implement the owned work Repository and CRUD service

**Files:**
- Create: `apps/server/src/module/creator/works/repositories/creator-work.repository.ts`
- Create: `apps/server/src/module/creator/works/services/creator-works.service.ts`
- Test: `apps/server/test/unit/module/creator/works/creator-works.service.spec.ts`
- Test: `apps/server/test/integration/creator/creator-works.integration.spec.ts`

**Interfaces:**
- Produces: `page`, `findOwnedDetail`, `create`, `updateOwned`, and `softDeleteOwned` methods.
- Ownership signature: every ID-based method accepts `(creatorId: string, workId: string)` in that order.

- [ ] **Step 1: Add failing CRUD service tests**

Test:

- creation always writes the session creator ID and starts as `OFFLINE`;
- pagination filters deleted rows and keyword-matches title;
- detail updates `lastViewAt` only for an owned work;
- update rejects foreign or missing work with the same public error;
- delete rejects `REVIEWING` and `PUBLISHED` and sets `deletedAt` for deletable work.

- [ ] **Step 2: Run tests and confirm missing implementation**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-works.service.spec.ts
```

- [ ] **Step 3: Implement atomic ownership-aware repository operations**

Use `findFirst` for reads:

```ts
where: { id: workId, creatorId, deletedAt: null }
```

Use `updateMany` for ownership-sensitive writes, check `count === 1`, then reload the row. Never load by ID and later update only by ID.

- [ ] **Step 4: Implement pagination and sorting**

Run `findMany` and `count` in a Prisma transaction. Return:

```ts
{
  list,
  total,
  pageNumber: query.pageNumber,
  nextPage: query.skip + list.length < total,
}
```

Default ordering is `updatedAt DESC, id DESC`; user-provided sort fields come only from `CREATOR_WORK_SORT_FIELD`.

- [ ] **Step 5: Implement create/update/delete rules**

Creation returns the UUID string. Updating editable fields sets `contentConsistent: false` when an approved snapshot already exists. Deletion sets `deletedAt` and does not delete OSS objects or audit history.

- [ ] **Step 6: Run unit and integration tests**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-works.service.spec.ts
pnpm --dir apps/server test:integration -- --runInBand test/integration/creator/creator-works.integration.spec.ts
```

- [ ] **Step 7: Commit CRUD behavior**

```bash
git add apps/server/src/module/creator/works/repositories/creator-work.repository.ts apps/server/src/module/creator/works/services/creator-works.service.ts apps/server/test/unit/module/creator/works/creator-works.service.spec.ts apps/server/test/integration/creator/creator-works.integration.spec.ts
git commit -m "feat: implement creator work crud"
```

---

### Task 5: Implement tags and publication state transitions

**Files:**
- Create: `apps/server/src/module/creator/works/repositories/creator-work-tag.repository.ts`
- Create: `apps/server/src/module/creator/works/repositories/creator-work-submission.repository.ts`
- Create: `apps/server/src/module/creator/works/services/creator-work-release.service.ts`
- Test: `apps/server/test/unit/module/creator/works/creator-work-release.service.spec.ts`
- Test: `apps/server/test/integration/creator/creator-works.integration.spec.ts`

**Interfaces:**
- Produces: `listTags`, `pageReleases`, `pageCandidates`, `submit`, `submitUpdate`, `withdraw`, `unpublish`, and `removeFromReleases`.
- Transaction boundary: each status transition updates work, submission, and tag relation in one Prisma transaction.

- [ ] **Step 1: Write a table-driven failing state-machine test**

Use cases:

```ts
[
  ['OFFLINE', 'submit', 'REVIEWING', true],
  ['REJECTED', 'submit', 'REVIEWING', true],
  ['REVIEWING', 'withdraw', 'OFFLINE', true],
  ['PUBLISHED', 'submitUpdate', 'PUBLISHED', true],
  ['PUBLISHED', 'unpublish', 'OFFLINE', true],
  ['OFFLINE', 'submitUpdate', 'OFFLINE', false],
  ['REVIEWING', 'submit', 'REVIEWING', false],
]
```

- [ ] **Step 2: Run the release service test and verify failure**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-work-release.service.spec.ts
```

- [ ] **Step 3: Implement immutable submission snapshots**

Build snapshots from a server-selected work projection rather than serializing the complete Prisma entity. Exclude ownership internals, deletion fields, relation objects, and credentials. Version values increment deterministically, for example `1`, `2`, `3`, and are exposed as strings.

- [ ] **Step 4: Implement release lists and statistics**

`pageReleases` must return:

```ts
{
  publishedCount,
  reviewingCount,
  applicableCount,
  page: { list, total, pageNumber, nextPage },
}
```

All counts are scoped to the logged-in creator. `applicableCount` counts non-deleted `OFFLINE` and `REJECTED` works. Candidates return those same statuses and exclude works with an active reviewing submission.

- [ ] **Step 5: Implement release removal semantics**

`DELETE /creator/works/releases/:id` removes an `OFFLINE` or `REJECTED` work from release management by clearing its tag relation and latest rejected metadata; it must not delete the work. Reject this operation for `REVIEWING` and `PUBLISHED`.

- [ ] **Step 6: Run unit and integration tests**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-work-release.service.spec.ts
pnpm --dir apps/server test:integration -- --runInBand test/integration/creator/creator-works.integration.spec.ts
```

- [ ] **Step 7: Commit release behavior**

```bash
git add apps/server/src/module/creator/works/repositories apps/server/src/module/creator/works/services/creator-work-release.service.ts apps/server/test/unit/module/creator/works/creator-work-release.service.spec.ts apps/server/test/integration/creator/creator-works.integration.spec.ts
git commit -m "feat: add creator work release workflow"
```

---

### Task 6: Add typed Aliyun STS configuration and reusable storage service

**Files:**
- Modify: `apps/server/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/server/src/config/types/creator-storage.config.ts`
- Modify: `apps/server/src/config/types/index.ts`
- Modify: `apps/server/src/config/index.ts`
- Modify: `apps/server/src/config/app-config.service.ts`
- Modify: `apps/server/src/config/env.validation.ts`
- Modify: `apps/server/.env.example`
- Create: `apps/server/src/module/creator/storage/interfaces/creator-upload-credential.interface.ts`
- Create: `apps/server/src/module/creator/storage/services/creator-oss-sts.service.ts`
- Create: `apps/server/src/module/creator/storage/creator-storage.module.ts`
- Test: `apps/server/test/unit/module/creator/works/creator-work-upload.service.spec.ts`

**Interfaces:**
- Consumes: `ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_ACCESS_KEY_SECRET`, `CREATOR_OSS_ROLE_ARN`, `CREATOR_OSS_REGION`, `CREATOR_OSS_BUCKET`, `CREATOR_OSS_ENDPOINT`, `CREATOR_OSS_PUBLIC_BASE_URL`.
- Produces: `assumeUploadRole(input): Promise<CreatorUploadCredential>`.

- [ ] **Step 1: Add the official Alibaba Cloud V2 STS dependencies**

Run:

```bash
pnpm --dir apps/server add @alicloud/sts20150401 @alicloud/openapi-client
```

- [ ] **Step 2: Write failing configuration and STS mapping tests**

Assert that production validation rejects missing Role ARN/Bucket/Region when Creator OSS is enabled, and that the service maps `credentials.securityToken` to frontend `token` without logging it.

- [ ] **Step 3: Add typed configuration**

Define:

```ts
export class CreatorStorageConfig {
  accessKeyId: string
  accessKeySecret: string
  roleArn: string
  region: string
  bucket: string
  endpoint: string
  publicBaseUrl: string
  stsDurationSeconds: number
}
```

Use `900` seconds as the default and validate `900..3600`. Secrets remain environment-only; do not read them from `SysOssConfig` for browser credentials.

- [ ] **Step 4: Implement `AssumeRole` with a per-request policy**

The policy must be equivalent to:

```json
{
  "Version": "1",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["oss:PutObject"],
    "Resource": ["acs:oss:*:*:<bucket>/<creator-prefix>/*"]
  }]
}
```

Set `roleSessionName` to a sanitized value such as `creator-<first 12 chars of creator UUID without hyphens>`. Return only temporary credentials and public OSS metadata.

- [ ] **Step 5: Run tests and configuration validation**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-work-upload.service.spec.ts test/unit/config/env.validation.spec.ts
pnpm --dir apps/server build:test
```

- [ ] **Step 6: Commit storage infrastructure**

```bash
git add apps/server/package.json pnpm-lock.yaml apps/server/src/config apps/server/.env.example apps/server/src/module/creator/storage apps/server/test/unit/module/creator/works/creator-work-upload.service.spec.ts
git commit -m "feat: add creator oss sts credentials"
```

---

### Task 7: Implement the work upload-token service

**Files:**
- Create: `apps/server/src/module/creator/works/services/creator-work-upload.service.ts`
- Create: `apps/server/src/module/creator/works/dto/requests/creator-upload-token.request.dto.ts`
- Create: `apps/server/src/module/creator/works/dto/responses/creator-upload-token.response.dto.ts`
- Test: `apps/server/test/unit/module/creator/works/creator-work-upload.service.spec.ts`

**Interfaces:**
- Consumes: `CreatorOssStsService.assumeUploadRole` and `CreatorSession.id`.
- Produces: `{ endpoint, region, bucketName, accessKeyId, accessKeySecret, expiration, token, requestId, path, fullPath }`.

- [ ] **Step 1: Add failing role/path/file validation tests**

Verify exact prefix mapping:

```ts
{
  COVER_IMAGE: 'cover',
  GIF_FILE: 'gif',
  EDITABLE_JSON: 'editable',
  STATIC_BIN: 'bin',
}
```

Reject path separators, control characters, unsupported extensions, and sizes over the role limit. Set limits to 10 MiB for covers, 50 MiB for GIF, 20 MiB for editable JSON, and 20 MiB for static BIN.

- [ ] **Step 2: Run the test and verify failure**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-work-upload.service.spec.ts
```

- [ ] **Step 3: Implement collision-resistant object paths**

Generate:

```ts
const path = `creator/${creatorId}/${roleDirectory}/${yyyyMMdd}/${randomUUID()}`
```

Return `fullPath` using the configured public base URL and `path`; the frontend appends the sanitized filename once.

- [ ] **Step 4: Run unit tests**

```bash
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works/creator-work-upload.service.spec.ts
```

- [ ] **Step 5: Commit upload-token behavior**

```bash
git add apps/server/src/module/creator/works/services/creator-work-upload.service.ts apps/server/src/module/creator/works/dto apps/server/test/unit/module/creator/works/creator-work-upload.service.spec.ts
git commit -m "feat: issue scoped creator upload tokens"
```

---

### Task 8: Wire authenticated Controllers and Nest modules

**Files:**
- Create: `apps/server/src/module/creator/works/controllers/creator-works.controller.ts`
- Create: `apps/server/src/module/creator/works/controllers/creator-work-tags.controller.ts`
- Create: `apps/server/src/module/creator/works/creator-works.module.ts`
- Modify: `apps/server/src/module/creator/creator.module.ts`
- Modify: `apps/server/src/module/creator/README.md`
- Test: `apps/server/test/e2e/creator-works.e2e-spec.ts`

**Interfaces:**
- Consumes: Creator guard/session and all Works services.
- Produces: every route listed in `works.ts` and `publish.ts`.

- [ ] **Step 1: Complete failing E2E coverage before Controller implementation**

Cover:

- no token returns 401;
- Creator A can complete CRUD;
- Creator B receives the same not-found response for Creator A's UUID;
- tags return enabled rows ordered by `sortOrder`;
- release statistics are creator-scoped;
- valid and invalid status transitions;
- upload-token delegates to a mocked STS service and returns a creator-owned path.

- [ ] **Step 2: Run the E2E suite and verify route failures**

```bash
pnpm --dir apps/server test:e2e -- --runInBand test/e2e/creator-works.e2e-spec.ts
```

- [ ] **Step 3: Implement Controller decorators and route order**

At Controller level:

```ts
@ApiTags('PC Creator Center - 作品')
@ApiBearerAuth('Authorization')
@Controller('creator/works')
@NotRequireAuth()
@IgnoreTenant()
@UseGuards(CreatorJwtGuard)
```

Declare `/upload-token`, `/releases`, and `/release-candidates` before `/:id`. Return `Result.ok(serviceResult)` consistently, with `Result.ok(undefined, '删除成功')` for void mutations. Use `ParseUUIDPipe` for work IDs.

- [ ] **Step 4: Register module dependencies**

`CreatorWorksModule` imports `CreatorAuthModule` and `CreatorStorageModule`, provides repositories/services, and exports no internal repository. Add it to `CreatorModule.imports`.

- [ ] **Step 5: Run E2E and build**

```bash
pnpm --dir apps/server test:e2e -- --runInBand test/e2e/creator-works.e2e-spec.ts
pnpm --dir apps/server build:test
```

Expected: all Creator Works E2E cases pass and Nest dependency injection resolves.

- [ ] **Step 6: Commit module wiring**

```bash
git add apps/server/src/module/creator/works apps/server/src/module/creator/creator.module.ts apps/server/src/module/creator/README.md apps/server/test/e2e/creator-works.e2e-spec.ts
git commit -m "feat: expose authenticated creator works api"
```

---

### Task 9: Update the PC OSS client for scoped STS and V4 signing

**Files:**
- Modify: `apps/pc-creator-center/src/lib/images/AliOSS.ts`
- Modify: `apps/pc-creator-center/src/lib/images/uploadFile.ts`
- Modify: `apps/pc-creator-center/src/api/works.ts`

**Interfaces:**
- Consumes: the temporary credential response from `POST /api/creator/works/upload-token`.
- Produces: an `ali-oss` client that uploads only under the server-issued path.

- [ ] **Step 1: Tighten the API call signature**

Call:

```ts
getUploadTokenApi({ role, fileName, fileSize, fileType })
```

Do not wrap the object again as `{ role: typeRole }`.

- [ ] **Step 2: Enable V4 signing and preserve STS field mapping**

Initialize:

```ts
new OSS({
  region: result.region,
  endpoint: result.endpoint,
  authorizationV4: true,
  accessKeyId: result.accessKeyId,
  accessKeySecret: result.accessKeySecret,
  stsToken: result.token,
  bucket: result.bucketName,
})
```

Never persist the returned credential in Pinia, localStorage, IndexedDB, logs, or error telemetry.

- [ ] **Step 3: Type-check and build the PC frontend**

```bash
pnpm --dir apps/pc-creator-center exec vue-tsc --noEmit
pnpm --dir apps/pc-creator-center build:qa
```

Expected: successful type-check and production bundle.

- [ ] **Step 4: Commit the frontend integration**

```bash
git add apps/pc-creator-center/src/lib/images/AliOSS.ts apps/pc-creator-center/src/lib/images/uploadFile.ts apps/pc-creator-center/src/api/works.ts
git commit -m "feat: use scoped sts for creator uploads"
```

---

### Task 10: Final verification and deployment documentation

**Files:**
- Modify: `apps/server/src/module/creator/README.md`
- Modify: `apps/server/.env.example`

**Interfaces:**
- Produces: reproducible local setup, migration, RAM, OSS CORS, and production deployment instructions.

- [ ] **Step 1: Document required RAM and OSS setup**

Document:

- RAM caller may only assume the configured upload role;
- upload role policy permits `oss:PutObject` and is further narrowed per request;
- OSS Bucket CORS allows the PC Creator Center origins, `PUT/POST/OPTIONS`, and the headers required by `ali-oss`;
- production secrets are injected through environment variables and never committed;
- migration deployment uses `prisma migrate deploy`, not `migrate dev`, `db push --force-reset`, or the destructive repository seed script.

- [ ] **Step 2: Run the complete targeted verification sequence**

```bash
pnpm --dir apps/server exec prisma validate
pnpm --dir apps/server prisma:generate
pnpm --dir apps/server test -- --runInBand test/unit/module/creator/works
pnpm --dir apps/server test:integration -- --runInBand test/integration/creator/creator-works.integration.spec.ts
pnpm --dir apps/server test:e2e -- --runInBand test/e2e/creator-works.e2e-spec.ts
pnpm --dir apps/server build:test
pnpm --dir apps/pc-creator-center exec vue-tsc --noEmit
pnpm --dir apps/pc-creator-center build:qa
```

Expected: all commands pass. If an existing unrelated failure occurs, capture its command, file, and error text separately and prove that all Creator Works focused checks pass.

- [ ] **Step 3: Inspect the final diff for secret leakage and ownership gaps**

Run:

```bash
git diff --check
git diff -- apps/server/src/module/creator apps/server/prisma apps/server/src/config apps/pc-creator-center/src/api/works.ts apps/pc-creator-center/src/http/request.ts apps/pc-creator-center/src/lib/images
```

Confirm:

- no real AccessKey, Role ARN, token, phone number, or production URL is committed;
- every work mutation includes Creator ownership;
- no Controller uses backend role/menu permission decorators;
- no hard delete of works, submissions, or tags exists;
- all frontend routes have matching Controller methods.

- [ ] **Step 4: Commit documentation and verification adjustments**

```bash
git add apps/server/src/module/creator/README.md apps/server/.env.example
git commit -m "docs: document creator works deployment"
```

---

## Acceptance Checklist

- [ ] A logged-in Creator can create, list, view, update, and soft-delete only their own works.
- [ ] Creator A cannot infer whether a Creator B work UUID exists.
- [ ] Pagination, keyword search, sorting, epoch timestamps, and response fields match the PC frontend contracts.
- [ ] Tags, release statistics, release candidates, submit, submit-update, withdraw, unpublish, and release removal operate through explicit state transitions.
- [ ] Published content remains the last approved snapshot while a newer edit is pending review.
- [ ] Upload credentials are temporary, expire in 900 seconds, use a creator-specific path, and permit only `oss:PutObject` under that path.
- [ ] The browser OSS client uses STS and V4 signing without persisting credentials.
- [ ] Prisma validation, focused unit/integration/E2E tests, server build, frontend type-check, and frontend build pass.

## Deferred Follow-up

The backend administrator audit API is intentionally a separate follow-up because it requires an administrator authentication and permission contract not defined in the current PC Creator Center API. It should consume `CreatorWorkSubmission` and implement approve/reject operations without importing Creator-facing Services directly.
