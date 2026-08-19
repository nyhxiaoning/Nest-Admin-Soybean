# Creator Center Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login-required, role-independent Creator Center with Approval and Publish Management placeholder pages to the Web application.

**Architecture:** Define the Creator Center as a local non-constant auth route so the existing route store merges it with backend dynamic routes before router and menu generation. Let Elegant Router discover the two view files and generate the component map and route types. Protect the behavior with a focused route-definition test.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Elegant Router, Pinia route store, Naive UI, Vue I18n, Vitest

## Global Constraints

- The Creator Center requires an authenticated session.
- The Creator Center must not require a backend menu entry or a user role.
- The two child pages are accessible placeholders only; no business API is added.
- Existing backend-controlled permission routes remain unchanged.
- No new dependency is introduced.
- `apps/web/src/layouts/base-layout/index.vue` is not modified.

---

## File Structure

- `apps/web/src/router/routes/index.ts`: owns the local route tree that participates in dynamic route merging.
- `apps/web/src/views/creator/approval/index.vue`: owns the Approval placeholder UI.
- `apps/web/src/views/creator/publish-management/index.vue`: owns the Publish Management placeholder UI.
- `apps/web/src/locales/langs/zh-cn.ts`: owns Chinese route labels.
- `apps/web/src/locales/langs/en-us.ts`: owns English route labels.
- `apps/web/src/router/elegant/imports.ts`: generated mapping from route keys to view components.
- `apps/web/src/router/elegant/routes.ts`: generated file-system route definitions used in static mode.
- `apps/web/src/typings/elegant-router.d.ts`: generated route names and path types.
- `apps/web/test/unit/router/creator-route.spec.ts`: verifies authentication and merge-facing route metadata.

### Task 1: Lock the creator route contract

**Files:**
- Create: `apps/web/test/unit/router/creator-route.spec.ts`
- Modify: `apps/web/src/router/routes/index.ts`

**Interfaces:**
- Consumes: `createDynamicRoutes(): { constantRoutes: ElegantConstRoute[]; authRoutes: ElegantConstRoute[] }`
- Produces: a local route named `creator` with child route names `creator_approval` and `creator_publish-management`

- [ ] **Step 1: Write the failing route test**

```ts
import { describe, expect, it } from 'vitest';
import { createDynamicRoutes } from '@/router/routes';

describe('creator center local route', () => {
  it('is login-required and independent of roles and backend menus', () => {
    const { constantRoutes, authRoutes } = createDynamicRoutes();
    const creatorRoute = authRoutes.find(route => route.name === 'creator');

    expect(constantRoutes.some(route => route.name === 'creator')).toBe(false);
    expect(creatorRoute).toMatchObject({
      path: '/creator',
      component: 'layout.base',
      meta: {
        i18nKey: 'route.creator'
      }
    });
    expect(creatorRoute?.meta?.constant).not.toBe(true);
    expect(creatorRoute?.meta?.roles).toBeUndefined();
    expect(creatorRoute?.children?.map(route => route.name)).toEqual([
      'creator_approval',
      'creator_publish-management'
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm the missing route failure**

Run: `pnpm --dir apps/web vitest run test/unit/router/creator-route.spec.ts`

Expected: FAIL because `createDynamicRoutes().authRoutes` has no route named `creator`.

- [ ] **Step 3: Add the minimal local auth route tree**

Add this non-constant entry to the local dynamic route definitions:

```ts
{
  name: 'creator',
  path: '/creator',
  component: 'layout.base',
  meta: {
    title: 'creator',
    i18nKey: 'route.creator',
    icon: 'mdi:account-edit-outline',
    order: 2
  },
  children: [
    {
      name: 'creator_approval',
      path: '/creator/approval',
      component: 'view.creator_approval',
      meta: {
        title: 'creator_approval',
        i18nKey: 'route.creator_approval'
      }
    },
    {
      name: 'creator_publish-management',
      path: '/creator/publish-management',
      component: 'view.creator_publish-management',
      meta: {
        title: 'creator_publish-management',
        i18nKey: 'route.creator_publish-management'
      }
    }
  ]
}
```

- [ ] **Step 4: Run the focused test**

Run: `pnpm --dir apps/web vitest run test/unit/router/creator-route.spec.ts`

Expected: PASS.

### Task 2: Add routable placeholder pages and labels

**Files:**
- Create: `apps/web/src/views/creator/approval/index.vue`
- Create: `apps/web/src/views/creator/publish-management/index.vue`
- Modify: `apps/web/src/locales/langs/zh-cn.ts`
- Modify: `apps/web/src/locales/langs/en-us.ts`
- Modify (generated): `apps/web/src/router/elegant/imports.ts`
- Modify (generated): `apps/web/src/router/elegant/routes.ts`
- Modify (generated): `apps/web/src/typings/elegant-router.d.ts`

**Interfaces:**
- Consumes: route component keys `view.creator_approval` and `view.creator_publish-management`
- Produces: lazy-loaded Vue components and translated route labels for both locale schemas

- [ ] **Step 1: Create the Approval placeholder page**

```vue
<script setup lang="ts">
defineOptions({
  name: 'CreatorApproval'
});
</script>

<template>
  <NCard title="审批" :bordered="false">
    <NEmpty description="审批功能正在建设中" />
  </NCard>
</template>
```

- [ ] **Step 2: Create the Publish Management placeholder page**

```vue
<script setup lang="ts">
defineOptions({
  name: 'CreatorPublishManagement'
});
</script>

<template>
  <NCard title="发布管理" :bordered="false">
    <NEmpty description="发布管理功能正在建设中" />
  </NCard>
</template>
```

- [ ] **Step 3: Add route translations**

Add to the Chinese `route` object:

```ts
creator: '创作者中心',
creator_approval: '审批',
'creator_publish-management': '发布管理',
```

Add to the English `route` object:

```ts
creator: 'Creator Center',
creator_approval: 'Approval',
'creator_publish-management': 'Publish Management',
```

- [ ] **Step 4: Generate Elegant Router artifacts**

Run from `apps/web`: `pnpm gen-route`

When prompted, do not create another route. If the command is interactive-only, run the normal Vite/Elegant Router generation path through `pnpm typecheck` and inspect the three generated files. They must contain:

```ts
creator_approval: () => import('@/views/creator/approval/index.vue')
"creator_publish-management": () => import('@/views/creator/publish-management/index.vue')
```

The generated type map must include `/creator/approval` and `/creator/publish-management`.

- [ ] **Step 5: Re-run the focused route test**

Run: `pnpm --dir apps/web vitest run test/unit/router/creator-route.spec.ts`

Expected: PASS.

### Task 3: Verify the Web application

**Files:**
- Verify only: all files changed in Tasks 1 and 2

**Interfaces:**
- Consumes: the complete Creator Center route tree, generated view mapping, and locale schema
- Produces: fresh evidence that the feature compiles and builds without changing backend-controlled routes

- [ ] **Step 1: Run TypeScript and Vue type checking**

Run: `pnpm --dir apps/web typecheck`

Expected: exit code 0.

- [ ] **Step 2: Run the Web test suite**

Run: `pnpm --dir apps/web test`

Expected: exit code 0.

- [ ] **Step 3: Run the production build**

Run: `pnpm --dir apps/web build`

Expected: exit code 0 and a generated `dist` bundle.

- [ ] **Step 4: Inspect the final diff and route contract**

Run:

```bash
git diff -- apps/web/src/router/routes/index.ts \
  apps/web/src/views/creator \
  apps/web/src/locales/langs/zh-cn.ts \
  apps/web/src/locales/langs/en-us.ts \
  apps/web/src/router/elegant/imports.ts \
  apps/web/src/router/elegant/routes.ts \
  apps/web/src/typings/elegant-router.d.ts \
  apps/web/test/unit/router/creator-route.spec.ts
```

Expected: only the approved Creator Center route, placeholders, translations, generated route artifacts, and focused test are present. The Creator Center route has neither `constant: true` nor `roles`.
