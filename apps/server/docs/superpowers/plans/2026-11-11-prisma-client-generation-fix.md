# Prisma Client Generation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Prisma engine installation and generated Client exports for the server package.

**Architecture:** Persist a pnpm build-script allowlist at the monorepo root, then rebuild the three Prisma packages and regenerate the schema-specific client. Verify the engine binaries and ensure TypeScript no longer reports TS2305 for `@prisma/client`.

**Tech Stack:** pnpm 10.5.0, Prisma 5.22.0, TypeScript, NestJS

## Global Constraints

- Do not modify business source files or existing `@prisma/client` imports.
- Permit install scripts only for `@prisma/engines`, `prisma`, and `@prisma/client`.
- Preserve unrelated working-tree and staged changes.

---

### Task 1: Restore Prisma generated artifacts

**Files:**
- Modify: `pnpm-workspace.yaml`
- Verify: `apps/server/node_modules/@prisma/client`

**Interfaces:**
- Consumes: `apps/server/prisma/schema.prisma`
- Produces: generated `.prisma/client` exports and local `darwin-arm64` engine binaries

- [x] **Step 1: Capture the failing signal**

Run: `pnpm --filter @nest-admin/server exec tsc --noEmit --incremental false --pretty false`

Expected before the fix: TS2305 errors stating that `@prisma/client` has no exported member `Prisma` or `PrismaClient`.

- [x] **Step 2: Add the pnpm build allowlist**

Add this root configuration to `pnpm-workspace.yaml`:

```yaml
onlyBuiltDependencies:
  - '@prisma/engines'
  - prisma
  - '@prisma/client'
```

- [x] **Step 3: Rebuild and generate Prisma Client**

Run from the repository root:

```bash
pnpm rebuild @prisma/engines prisma @prisma/client
pnpm --filter @nest-admin/server prisma:generate
```

Expected: Prisma reports that Client 5.22.0 was generated successfully.

- [x] **Step 4: Verify engines and generated exports**

Run:

```bash
pnpm --filter @nest-admin/server exec prisma --version
node -e "const client = require('@prisma/client'); if (!client.PrismaClient || !client.Prisma) process.exit(1)"
```

Expected: query and schema engine versions resolve without `E_CANNOT_RESOLVE_PATH`, and the generated Client exports are available through pnpm's isolated linker.

- [x] **Step 5: Run the regression compile**

Run: `pnpm --filter @nest-admin/server exec tsc --noEmit --incremental false --pretty false`

Expected: no TS2305 diagnostics referencing `@prisma/client`. Pre-existing unrelated TypeScript diagnostics may remain and must be reported separately.
