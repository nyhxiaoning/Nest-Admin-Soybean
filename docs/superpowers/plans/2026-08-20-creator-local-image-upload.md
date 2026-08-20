# Creator Local Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated Creator image-upload API that temporarily stores any `image/*` file up to 10 MiB locally for seven days behind a replaceable storage contract.

**Architecture:** Extend `CreatorStorageModule` with an abstract image-storage provider, a local filesystem adapter, an upload service, and a cleanup service. Add a dedicated Creator upload controller; it depends only on the upload service, while provider wiring selects the local adapter and can later select an OSS adapter without changing the HTTP contract.

**Tech Stack:** NestJS 10, Multer memory storage, Node.js filesystem APIs, `mime-types`, Jest, Supertest.

## Global Constraints

- `POST /api/creator/uploads/images` requires `CreatorJwtGuard` but no backend role, menu, or tenant permission.
- Multipart field name is `file`.
- Accept every MIME beginning with `image/`; do not maintain an extension allowlist.
- Reject missing, empty, non-image, and files larger than 10 MiB.
- Store files under the authenticated Creator directory and expire them after seven days.
- Keep the existing OSS STS browser-direct-upload endpoint unchanged.
- Do not add a database table or a new dependency.

---

### Task 1: Define the replaceable image-storage contract and local adapter

**Files:**
- Create: `apps/server/src/module/creator/storage/interfaces/creator-image-storage.interface.ts`
- Create: `apps/server/src/module/creator/storage/services/local-creator-image-storage.service.ts`
- Test: `apps/server/test/unit/module/creator/storage/local-creator-image-storage.service.spec.ts`

**Interfaces:**
- Consumes: `CreatorSession`, `Express.Multer.File`, `AppConfigService.app.file`.
- Produces: `CreatorImageStorage.store(creatorId, file)` and `CreatorStoredImage` with `fileId`, `url`, `originalName`, `contentType`, `size`, `expiresAt`.

- [ ] Write a failing test using a temporary upload directory and assert Creator-isolated path, UUID file ID, URL, metadata, and seven-day expiry.
- [ ] Run `pnpm --dir apps/server exec jest --runInBand --no-watchman test/unit/module/creator/storage/local-creator-image-storage.service.spec.ts` and verify failure.
- [ ] Implement the abstract contract and local adapter with server-generated paths and MIME-derived extensions.
- [ ] Run the targeted test and verify it passes.

### Task 2: Add upload validation and authenticated HTTP endpoint

**Files:**
- Create: `apps/server/src/module/creator/storage/dto/creator-image-upload.response.dto.ts`
- Create: `apps/server/src/module/creator/storage/services/creator-image-upload.service.ts`
- Create: `apps/server/src/module/creator/storage/controllers/creator-image-upload.controller.ts`
- Modify: `apps/server/src/module/creator/storage/creator-storage.module.ts`
- Test: `apps/server/test/unit/module/creator/storage/creator-image-upload.service.spec.ts`
- Test: `apps/server/test/e2e/creator-image-upload.e2e-spec.ts`

**Interfaces:**
- Consumes: `CreatorImageStorage`, `CreatorSession`, multipart field `file`.
- Produces: `POST /creator/uploads/images` returning `Result.ok(CreatorImageUploadResponseDto)`.

- [ ] Write failing service tests for missing, empty, non-image, oversized, and valid image files.
- [ ] Implement service validation and delegate valid files to `CreatorImageStorage`.
- [ ] Write a failing E2E test for the multipart route, Creator session propagation, and response contract.
- [ ] Implement Controller with `FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })`, `CreatorJwtGuard`, `@NotRequireAuth()`, and `@IgnoreTenant()`.
- [ ] Export the upload service and verify unit/E2E tests pass.

### Task 3: Add seven-day local-file cleanup

**Files:**
- Create: `apps/server/src/module/creator/storage/services/creator-local-image-cleanup.service.ts`
- Modify: `apps/server/src/module/creator/storage/creator-storage.module.ts`
- Test: `apps/server/test/unit/module/creator/storage/creator-local-image-cleanup.service.spec.ts`

**Interfaces:**
- Consumes: Creator local image root and configured seven-day TTL.
- Produces: `cleanupExpiredFiles(now?: Date): Promise<number>` and a scheduled daily invocation.

- [ ] Write a failing test with expired, current, and non-Creator files in a temporary directory.
- [ ] Implement recursive traversal scoped strictly to `creator`, delete expired regular files, and remove empty directories.
- [ ] Register a daily Nest schedule and verify the targeted cleanup test passes.

### Task 4: Configuration, documentation, and final verification

**Files:**
- Modify: `apps/server/src/config/types/creator-storage.config.ts`
- Modify: `apps/server/src/config/index.ts`
- Modify: `apps/server/src/config/env.validation.ts`
- Modify: `apps/server/.env.example`
- Modify: `apps/server/src/module/creator/README.md`

**Interfaces:**
- Produces: `CREATOR_LOCAL_IMAGE_TTL_DAYS=7` and documented API/deployment behavior.

- [ ] Add typed TTL configuration with a minimum of one day and default seven days.
- [ ] Document the multipart contract, local directory, response, expiration, and OSS replacement boundary.
- [ ] Run Creator storage/works unit tests, upload E2E, Nest build, targeted ESLint, Prisma validation, and `git diff --check`.
- [ ] Confirm no database migration is required for this feature and no existing OSS STS route changed.
