# VForm 3 Designer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken runtime-mounted `/tool/build` page with the officially registered VForm 3 designer filling the existing admin content area.

**Architecture:** Register Element Plus and VForm 3 once on the existing root Vue application through a focused plugin setup function. Render the globally registered `v-form-designer` directly in the route component, and limit custom CSS to the route container's height and overflow boundary.

**Tech Stack:** Vue 3.5, TypeScript 5.9, Vite 7, Element Plus 2.12, `vform3-builds` 3.0.10, Vitest 4, Vue Test Utils.

## Global Constraints

- Keep `vform3-builds` at the currently locked `3.0.10` release.
- Do not use an iframe, CDN, runtime CSS fetch, DOM style injection, or a second Vue application.
- Do not add backend persistence, custom VForm widgets, or form publication behavior.
- The designer must fill only the route content area, not use `100vh`, and must not cover the admin sidebar or global tabs.
- Do not add global layout overrides such as `body { margin: 0 }`; page-specific selectors may only control height, minimum height, width, and overflow.

---

## File Structure

- Create `apps/web/src/plugins/vform.ts`: owns Element Plus/VForm 3 registration and their official global CSS imports.
- Modify `apps/web/src/main.ts`: invokes `setupVForm(app)` on the existing root Vue application.
- Modify `apps/web/src/shims-vform.d.ts`: describes the package default export as a Vue plugin.
- Replace `apps/web/src/views/tool/build/index.vue`: directly renders the full-size designer and owns only route-scoped layout CSS.
- Create `apps/web/test/components/tool/build.spec.ts`: locks down the page structure and prevents the old card/manual-loader UI from returning.
- Modify `.gitignore`: explicitly tracks the route directory currently shadowed by the generic `build/` ignore rule.

---

### Task 1: Lock Down the Full-Size Route Component

**Files:**
- Modify: `.gitignore`
- Create: `apps/web/test/components/tool/build.spec.ts`
- Modify: `apps/web/src/views/tool/build/index.vue`

**Interfaces:**
- Consumes: global component name `v-form-designer` registered by Task 2.
- Produces: route root selector `.vform-designer-page` and exactly one `v-form-designer` child.

- [ ] **Step 1: Write the failing component test**

Create `apps/web/test/components/tool/build.spec.ts`:

```ts
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BuildPage from '@/views/tool/build/index.vue';

const VFormDesignerStub = defineComponent({
  name: 'VFormDesigner',
  template: '<div class="v-form-designer-stub" />'
});

describe('tool/build page', () => {
  it('renders the designer directly without the legacy loader shell', () => {
    const wrapper = mount(BuildPage, {
      global: {
        components: { VFormDesigner: VFormDesignerStub },
        stubs: { VFormDesigner: VFormDesignerStub }
      }
    });

    expect(wrapper.find('.vform-designer-page').exists()).toBe(true);
    expect(wrapper.find('.v-form-designer-stub').exists()).toBe(true);
    expect(wrapper.find('#vform-mount').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('重新加载');
  });
});
```

- [ ] **Step 2: Run the test and verify the old implementation fails**

Run from `apps/web`:

```bash
./node_modules/.bin/vitest run test/components/tool/build.spec.ts
```

Expected: FAIL because `.vform-designer-page` and the direct designer component do not exist in the current `NCard`/`#vform-mount` implementation.

- [ ] **Step 3: Replace the route component with the minimal direct render**

Before replacing the page, add these exceptions immediately after the existing `!apps/web/build/` rule in `.gitignore` so the route is versioned:

```gitignore
!apps/web/src/views/tool/build/
!apps/web/src/views/tool/build/index.vue
```

Replace `apps/web/src/views/tool/build/index.vue` with:

```vue
<template>
  <div class="vform-designer-page">
    <v-form-designer ref="designerRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const designerRef = ref();
</script>

<style scoped>
.vform-designer-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.vform-designer-page :deep(.el-container.full-height) {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
```

- [ ] **Step 4: Run the component test and verify it passes**

Run:

```bash
./node_modules/.bin/vitest run test/components/tool/build.spec.ts
```

Expected: one passing test; no dynamic import, DOM injection, or secondary `createApp()` execution.

- [ ] **Step 5: Lint the page and its test**

Run:

```bash
./node_modules/.bin/eslint src/views/tool/build/index.vue test/components/tool/build.spec.ts
```

Expected: exit code 0.

- [ ] **Step 6: Commit the route component slice**

```bash
git add .gitignore apps/web/src/views/tool/build/index.vue apps/web/test/components/tool/build.spec.ts
git commit -m "fix(web): render VForm designer directly"
```

---

### Task 2: Register VForm 3 on the Root Vue Application

**Files:**
- Create: `apps/web/src/plugins/vform.ts`
- Modify: `apps/web/src/main.ts`
- Modify: `apps/web/src/shims-vform.d.ts`

**Interfaces:**
- Produces: `setupVForm(app: App): void` and the globally registered `v-form-designer`/`v-form-render` components.
- Consumes: existing dependencies `element-plus@^2.12.0` and `vform3-builds@^3.0.10` from `apps/web/package.json`.

- [ ] **Step 1: Correct the package type declaration**

Replace `apps/web/src/shims-vform.d.ts` with:

```ts
declare module 'vform3-builds' {
  import type { Plugin } from 'vue';

  const VForm3: Plugin;
  export default VForm3;
}
```

Remove the obsolete declaration for `vform3-builds/dist/designer.umd.js`; the application will no longer import that internal file.

- [ ] **Step 2: Add the focused plugin setup module**

Create `apps/web/src/plugins/vform.ts`:

```ts
import type { App } from 'vue';
import ElementPlus from 'element-plus';
import VForm3 from 'vform3-builds';
import 'element-plus/dist/index.css';
import 'vform3-builds/dist/designer.style.css';

export function setupVForm(app: App) {
  app.use(ElementPlus);
  app.use(VForm3);
}
```

- [ ] **Step 3: Install the plugin on the existing root app**

In `apps/web/src/main.ts`, add:

```ts
import { setupVForm } from './plugins/vform';
```

Immediately after `const app = createApp(App);`, add:

```ts
setupVForm(app);
```

Do not call `createApp()` anywhere else.

- [ ] **Step 4: Run targeted lint and TypeScript checks**

Run from `apps/web`:

```bash
./node_modules/.bin/eslint src/main.ts src/plugins/vform.ts src/shims-vform.d.ts src/views/tool/build/index.vue test/components/tool/build.spec.ts
./node_modules/.bin/vue-tsc --noEmit --skipLibCheck
```

Expected: both commands exit 0. If the repository has unrelated pre-existing type errors, record their exact paths and also run a narrowed build in Step 5 to prove the touched integration compiles.

- [ ] **Step 5: Run the production build**

Run:

```bash
./node_modules/.bin/vite build --mode prod
```

Expected: exit code 0; output contains generated JS and CSS assets with no unresolved `vform3-builds` or `element-plus` imports.

- [ ] **Step 6: Re-run the component regression test**

Run:

```bash
./node_modules/.bin/vitest run test/components/tool/build.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the application integration slice**

```bash
git add apps/web/src/main.ts apps/web/src/plugins/vform.ts apps/web/src/shims-vform.d.ts
git commit -m "feat(web): register VForm 3 designer"
```

---

### Task 3: Verify the Designer in the Running Admin Layout

**Files:**
- Modify only if the browser check proves necessary: `apps/web/src/views/tool/build/index.vue`

**Interfaces:**
- Consumes: authenticated `/tool/build` dynamic route and the root-level VForm registration from Tasks 1–2.
- Produces: visual evidence that the designer is usable inside the current sidebar/tab/content layout.

- [ ] **Step 1: Start the frontend development server**

Run from `apps/web`:

```bash
./node_modules/.bin/vite --mode dev --host 127.0.0.1
```

Expected: Vite reports a local URL without dependency resolution errors.

- [ ] **Step 2: Open `/tool/build` in the in-app browser**

Authenticate using the project's available local session. Navigate to `/tool/build` and wait for the route content to settle.

Expected: the designer appears immediately; no “加载设计器” or “重新加载” button is present.

- [ ] **Step 3: Inspect the layout at desktop width**

Verify all of the following:

- Existing admin sidebar and global tab bar remain visible.
- VForm's component palette, center canvas, and property panel are visible in one content region.
- The designer does not extend below the route content area or create a document-level second scrollbar.
- Browser console contains no Vue component-resolution, CSS, or duplicate-app warnings.

- [ ] **Step 4: Verify one real designer interaction**

Drag one basic input component from the left palette into the center canvas, select it, and change one property in the right panel.

Expected: the canvas updates and the property editor remains usable.

- [ ] **Step 5: Verify route lifecycle**

Switch to another open admin tab, return to “表单构建”, and inspect the page again.

Expected: one designer instance is present, with no duplicated toolbar or leaked full-page styles.

- [ ] **Step 6: Apply a layout-only correction if evidence requires it**

If the designer does not inherit height, limit the correction to `apps/web/src/views/tool/build/index.vue` using scoped selectors under `.vform-designer-page`. Do not introduce `100vh`, `body` rules, global wildcard selectors, or dependency patches. Re-run Task 1 Step 4, Task 2 Steps 4–5, and browser Steps 2–5 after any correction.

- [ ] **Step 7: Commit any evidence-driven layout correction**

Skip this commit when no correction was needed. Otherwise:

```bash
git add apps/web/src/views/tool/build/index.vue
git commit -m "fix(web): constrain VForm designer layout"
```

---

## Final Verification

- [ ] `./node_modules/.bin/vitest run test/components/tool/build.spec.ts` passes.
- [ ] `./node_modules/.bin/eslint src/main.ts src/plugins/vform.ts src/shims-vform.d.ts src/views/tool/build/index.vue test/components/tool/build.spec.ts` passes.
- [ ] `./node_modules/.bin/vue-tsc --noEmit --skipLibCheck` passes or only documented unrelated pre-existing errors remain.
- [ ] `./node_modules/.bin/vite build --mode prod` passes.
- [ ] `/tool/build` fills the route content area and supports drag, selection, and property editing.
- [ ] `git diff --check` passes and no unrelated dirty-worktree files are included in implementation commits.

## Execution Record

- Completed the direct-render component and regression test.
- Completed root-app Element Plus/VForm 3 registration and static official CSS imports.
- Targeted ESLint and the component regression test passed.
- The production Vite build passed.
- The running Vite server returned HTTP 200 for the application root, the `/tool/build` Vue module, and VForm's designer CSS without compilation errors.
- Full `vue-tsc` remains blocked by pre-existing invalid declarations in `apps/web/components.d.ts` such as `const 'IconMaterialSymbols:add'`; no touched VForm file produced a type error before that parser failure.
- Interactive browser verification was not run because the browser runtime reported no available browser instance. Drag-and-drop and final visual inspection remain a manual verification item.
