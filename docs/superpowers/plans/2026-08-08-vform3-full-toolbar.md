# VForm 3 Full Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the VForm designer panels uncompressed and expose all six official toolbar functions on `/tool/build`.

**Architecture:** Pass a page-owned `designerConfig` object into the globally registered `VFormDesigner` so VForm uses a stable `650px` toolbar and enables every required official action. Increase only the third-party root minimum width to `1500px`; the existing route wrapper remains the double-axis overflow owner.

**Tech Stack:** Vue 3 SFC, VForm 3.0.10, Element Plus, Vitest, Vue Test Utils, ESLint, Vite

## Global Constraints

- The designer minimum dimensions are exactly `1500px × 800px`.
- The toolbar minimum and maximum widths are exactly `650px`.
- Clear, preview, import JSON, export JSON, export code, and generate SFC must all remain enabled.
- Do not modify `vform3-builds` source code or recreate its toolbar and dialogs.
- Do not scale the designer or change scrolling behavior for other admin routes.

---

### Task 1: Configure the full VForm toolbar and widen the designer boundary

**Files:**
- Modify: `apps/web/test/components/tool/build.spec.ts`
- Modify: `apps/web/src/views/tool/build/index.vue`

**Interfaces:**
- Consumes: the `VFormDesigner` `designerConfig` prop provided by VForm 3.0.10.
- Produces: a stable `designerConfig` object with six enabled action flags and a `650px` toolbar, plus a `1500 × 800px` minimum designer root.

- [ ] **Step 1: Extend the component stub and write the failing toolbar test**

Add a `designerConfig` prop to `VFormDesignerStub`:

```ts
const VFormDesignerStub = defineComponent({
  name: 'VFormDesigner',
  props: {
    designerConfig: {
      type: Object,
      default: undefined
    }
  },
  template: '<div class="v-form-designer-stub" />'
});
```

Add the regression test inside the existing `describe` block:

```ts
it('enables the complete toolbar at a stable width', () => {
  const wrapper = mount(BuildPage, {
    global: {
      components: { VFormDesigner: VFormDesignerStub },
      stubs: { VFormDesigner: VFormDesignerStub }
    }
  });
  const designer = wrapper.findComponent(VFormDesignerStub);

  expect(designer.props('designerConfig')).toEqual({
    toolbarMaxWidth: 650,
    toolbarMinWidth: 650,
    clearDesignerButton: true,
    previewFormButton: true,
    importJsonButton: true,
    exportJsonButton: true,
    exportCodeButton: true,
    generateSFCButton: true
  });
});
```

Update the existing layout regression assertion from `min-width: 1200px;` to:

```ts
expect(buildPageSource).toContain('min-width: 1500px;');
```

- [ ] **Step 2: Run the focused test and verify both new expectations fail**

Run from `apps/web`:

```bash
./node_modules/.bin/vitest run test/components/tool/build.spec.ts
```

Expected: the toolbar test receives `undefined` for `designerConfig`, and the layout test cannot find `min-width: 1500px;`.

- [ ] **Step 3: Add the page-owned VForm configuration**

Add this constant after `designerRef` in `apps/web/src/views/tool/build/index.vue`:

```ts
const designerConfig = {
  toolbarMaxWidth: 650,
  toolbarMinWidth: 650,
  clearDesignerButton: true,
  previewFormButton: true,
  importJsonButton: true,
  exportJsonButton: true,
  exportCodeButton: true,
  generateSFCButton: true
};
```

Pass it to the official component:

```vue
<VFormDesigner ref="designerRef" :designer-config="designerConfig" />
```

Change the third-party root minimum width while retaining all other scroll styles:

```css
.vform-designer-page :deep(.el-container.full-height) {
  width: 100%;
  min-width: 1500px;
  height: 100%;
  min-height: 800px;
}
```

- [ ] **Step 4: Run focused tests and lint**

Run from `apps/web`:

```bash
./node_modules/.bin/vitest run test/components/tool/build.spec.ts
./node_modules/.bin/eslint src/views/tool/build/index.vue test/components/tool/build.spec.ts
```

Expected: three component tests pass and ESLint exits without errors or warnings.

- [ ] **Step 5: Run the production build**

Run from `apps/web`:

```bash
./node_modules/.bin/vite build --mode prod
```

Expected: `Build successful. Please see dist directory`. The existing `SvgIcon` auto-registration naming warning may remain. If the generator changes `apps/web/components.d.ts`, reverse only that generated incidental diff.

- [ ] **Step 6: Perform manual interaction acceptance**

Open `/tool/build` and verify that `清空`, `预览`, `导入JSON`, `导出JSON`, `导出代码`, and `生成SFC` are visible. Open each non-destructive dialog, verify the clear confirmation flow without accepting destructive clearing of user work, and resize the content area below `1500 × 800px`.

Expected: the six actions remain visible and invoke VForm's official dialogs or confirmation flow; all three panels retain their proportions; horizontal and vertical scrollbars expose overflow content.

- [ ] **Step 7: Commit the implementation**

```bash
git add apps/web/src/views/tool/build/index.vue apps/web/test/components/tool/build.spec.ts
git commit -m "fix(web): expose complete VForm toolbar"
```
