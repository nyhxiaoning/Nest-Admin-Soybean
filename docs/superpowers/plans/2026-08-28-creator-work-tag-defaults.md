# Creator Work Tag Defaults Implementation Plan

> **For agentic workers:** Implement inline with a red-green-refactor cycle; this task does not require subagent delegation.

**Goal:** Persist eight default creator work classifications while preserving existing and custom database rows.

**Architecture:** Define defaults once, insert missing rows during Nest module initialization with Prisma conflict skipping, and reuse the same data in the seed script. The existing query remains the public read interface.

**Tech Stack:** NestJS 10, TypeScript, Prisma 5, Jest 29

## Global Constraints

- Existing rows must never be overwritten based on a matching `tagCode`.
- The endpoint response remains `{ id: string; name: string; tagCode: string }[]`.
- Do not commit unrelated working-tree changes.

---

### Task 1: Default work tag persistence

**Files:**
- Create: `apps/server/src/module/creator/works/constants/creator-work-tag.defaults.ts`
- Create: `apps/server/test/unit/module/creator/works/creator-work-tag.repository.spec.ts`
- Modify: `apps/server/src/module/creator/works/repositories/creator-work-tag.repository.ts`
- Modify: `apps/server/prisma/seed.ts`

**Interfaces:**
- Produces: `DEFAULT_CREATOR_WORK_TAGS` and `CreatorWorkTagRepository.onModuleInit(): Promise<void>`.
- Preserves: `CreatorWorkTagRepository.findEnabled()` returning only `id`, `name`, and `tagCode`.

- [x] Add one failing repository behavior test for preserving existing rows while adding all missing defaults.
- [x] Run the targeted test and confirm it fails because initialization behavior is absent.
- [x] Add the shared eight-item defaults constant and idempotent repository initialization.
- [x] Reuse the shared defaults in Prisma seed without overwriting matching rows.
- [x] Run the targeted test, creator works unit suite, and server build.
