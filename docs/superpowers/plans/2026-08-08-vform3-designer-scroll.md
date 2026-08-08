# VForm 3 Designer Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the `/tool/build` VForm 3 designer from shrinking below `1200 × 800px` and expose horizontal and vertical scrolling when the route content area is smaller.

**Architecture:** Keep VForm 3 registered and rendered exactly as it is. Make the route page the only overflow owner and apply minimum dimensions to the third-party designer root through the existing scoped `:deep()` selector.

**Tech Stack:** Vue 3 SFC, scoped CSS, Vitest, Vue Test Utils, ESLint, Vite

## Global Constraints

- The designer minimum dimensions are exactly `1200px × 800px`.
- Do not scale the designer or modify `vform3-builds` source code.
- Do not change the admin application's global scrolling behavior.
- Preserve all existing VForm drag, configuration, import, and export behavior.

---

### Task 1: Add double-axis overflow without shrinking the designer

**Files:**
- Modify: `apps/web/test/components/tool/build.spec.ts`
- Modify: `apps/web/src/views/tool/build/index.vue`

**Interfaces:**
- Consumes: the globally registered `VFormDesigner` component and its `.el-container.full-height` root element.
- Produces: a `/tool/build` page whose outer `.vform-designer-page` owns overflow and whose VForm root has `min-width: 1200px` and `min-height: 800px`.

- [ ] **Step 1: Write the failing regression test**

Add Node's file reader and load the SFC source so the test verifies the scoped layout contract as well as component rendering:

```ts
import { readFileSync } from 'node:fs';

const buildPageSource = readFileSync(new URL('../../../src/views/tool/build/index.vue', import.meta.url), 'utf8');
```

Add this test inside the existing `describe` block:

```ts
it('keeps the designer dimensions and enables double-axis scrolling', () => {
  expect(buildPageSource).toContain('overflow: auto;');
  expect(buildPageSource).toContain('min-width: 1200px;');
  expect(buildPageSource).toContain('min-height: 800px;');
});
```

- [ ] **Step 2: Run the focused test and verify the regression test fails**

Run from `apps/web`:

```bash
../../node_modules/.bin/vitest run test/components/tool/build.spec.ts
```

Expected: the new test fails because the page still contains `overflow: hidden` and has no `1200px × 800px` minimum dimensions.

- [ ] **Step 3: Implement the minimum-size scroll container**

Update the scoped style in `apps/web/src/views/tool/build/index.vue` to:

```css
.vform-designer-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.vform-designer-page :deep(.el-container.full-height) {
  width: 100%;
  min-width: 1200px;
  height: 100%;
  min-height: 800px;
}
```

- [ ] **Step 4: Run focused verification**

Run from `apps/web`:

```bash
../../node_modules/.bin/vitest run test/components/tool/build.spec.ts
../../node_modules/.bin/eslint src/views/tool/build/index.vue test/components/tool/build.spec.ts
```

Expected: all tests pass and ESLint exits without errors or warnings.

- [ ] **Step 5: Run production build verification**

Run from `apps/web`:

```bash
../../node_modules/.bin/vite build --mode prod
```

Expected: Vite reports a successful build. If the build generator changes `apps/web/components.d.ts`, discard only those generated incidental changes after confirming they are unrelated.

- [ ] **Step 6: Perform manual layout acceptance**

Start the web application, open `/tool/build`, then resize the route content area below `1200 × 800px`.

Expected: a horizontal scrollbar appears at the bottom, a vertical scrollbar appears at the right, the left component library, center canvas, and right settings panel keep their proportions, and VForm drag-and-drop remains usable.

- [ ] **Step 7: Commit the implementation**

```bash
git add apps/web/src/views/tool/build/index.vue apps/web/test/components/tool/build.spec.ts
git commit -m "fix(web): preserve VForm designer dimensions"
```
