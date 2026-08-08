# VForm 3 Action Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace six width-sensitive VForm toolbar buttons with one `表单操作` dropdown that invokes the same six official VForm methods.

**Architecture:** Disable VForm's six built-in horizontal buttons and inject an Element Plus dropdown through the designer's toolbar slot. Keep a typed designer ref and route each dropdown command to the matching public VForm method; retain the existing designer dimensions, scrolling, and SVG compatibility styles.

**Tech Stack:** Vue 3 SFC, VForm 3.0.10, Element Plus, Vitest, Vue Test Utils, ESLint, Vite

## Global Constraints

- The toolbar minimum and maximum widths are exactly `140px`.
- The single trigger label is exactly `表单操作`.
- The menu contains preview, import JSON, export JSON, export code, generate SFC, and clear; clear appears last with a divider and danger color.
- All actions call VForm's public methods; do not recreate official dialogs or data handling.
- Preserve the `1500 × 800px` designer boundary, double-axis scrolling, and inline SVG compatibility rule.

---

### Task 1: Replace horizontal actions with a typed dropdown menu

**Files:**
- Modify: `apps/web/test/components/tool/build.spec.ts`
- Modify: `apps/web/src/views/tool/build/index.vue`

**Interfaces:**
- Consumes: VForm public methods `clearDesigner()`, `previewForm()`, `importJson()`, `exportJson()`, `exportCode()`, and `generateSFC()`.
- Produces: `handleDesignerAction(command: DesignerAction): void` and a toolbar-slot dropdown whose command values exactly match those method names.

- [ ] **Step 1: Build test doubles for the toolbar slot and VForm methods**

Import `vi` from Vitest and define shared method spies:

```ts
const designerMethodMocks = {
  clearDesigner: vi.fn(),
  previewForm: vi.fn(),
  importJson: vi.fn(),
  exportJson: vi.fn(),
  exportCode: vi.fn(),
  generateSFC: vi.fn()
};
```

Update `VFormDesignerStub` so it exposes the methods and renders the toolbar slot:

```ts
const VFormDesignerStub = defineComponent({
  name: 'VFormDesigner',
  props: {
    designerConfig: {
      type: Object,
      default: undefined
    }
  },
  setup(_, { expose }) {
    expose(designerMethodMocks);
  },
  template: '<div class="v-form-designer-stub"><slot /></div>'
});
```

Add lightweight Element Plus menu stubs:

```ts
const ElDropdownStub = defineComponent({
  name: 'ElDropdown',
  emits: ['command'],
  template: '<div class="action-dropdown"><slot /><slot name="dropdown" /></div>'
});

const ElDropdownMenuStub = defineComponent({
  name: 'ElDropdownMenu',
  template: '<div class="action-menu"><slot /></div>'
});

const ElDropdownItemStub = defineComponent({
  name: 'ElDropdownItem',
  props: {
    command: { type: String, required: true },
    divided: Boolean
  },
  template: '<button class="action-menu-item" :data-command="command"><slot /></button>'
});
```

- [ ] **Step 2: Replace the horizontal toolbar expectations with failing menu tests**

Update the configuration expectation to require `toolbarMaxWidth: 140`, `toolbarMinWidth: 140`, and all six official button flags set to `false`.

Add a helper mount using `VFormDesignerStub`, `ElDropdownStub`, `ElDropdownMenuStub`, and `ElDropdownItemStub`, then add these assertions:

```ts
expect(wrapper.text()).toContain('表单操作');
expect(wrapper.findAll('.action-menu-item').map(item => item.text())).toEqual([
  '预览',
  '导入 JSON',
  '导出 JSON',
  '导出代码',
  '生成 SFC',
  '清空'
]);
```

For every command/method pair, emit the command and verify only the matching public method is called:

```ts
for (const command of [
  'previewForm',
  'importJson',
  'exportJson',
  'exportCode',
  'generateSFC',
  'clearDesigner'
] as const) {
  wrapper.findComponent(ElDropdownStub).vm.$emit('command', command);
  expect(designerMethodMocks[command]).toHaveBeenCalledTimes(1);
}
```

Update the real VForm plugin test to assert that `表单操作` renders instead of expecting six horizontal labels.

- [ ] **Step 3: Run focused tests and verify the new menu contract fails**

Run from `apps/web`:

```bash
./node_modules/.bin/vitest run test/components/tool/build.spec.ts
```

Expected: configuration still reports `650` and `true`, no `表单操作` trigger exists, and no dropdown commands can invoke exposed methods.

- [ ] **Step 4: Implement the typed method dispatcher and compact configuration**

Add these types and update the ref:

```ts
type DesignerAction =
  | 'clearDesigner'
  | 'previewForm'
  | 'importJson'
  | 'exportJson'
  | 'exportCode'
  | 'generateSFC';

type VFormDesignerExpose = Record<DesignerAction, () => void>;

const designerRef = ref<VFormDesignerExpose>();
```

Update `designerConfig` to:

```ts
const designerConfig = {
  toolbarMaxWidth: 140,
  toolbarMinWidth: 140,
  clearDesignerButton: false,
  previewFormButton: false,
  importJsonButton: false,
  exportJsonButton: false,
  exportCodeButton: false,
  generateSFCButton: false
};
```

Add the command handler:

```ts
function handleDesignerAction(command: DesignerAction) {
  designerRef.value?.[command]();
}
```

- [ ] **Step 5: Render the dropdown through the VForm toolbar slot**

Replace the self-closing designer component with:

```vue
<VFormDesigner ref="designerRef" :designer-config="designerConfig">
  <ElDropdown trigger="click" @command="handleDesignerAction">
    <ElButton type="primary">表单操作</ElButton>
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem command="previewForm">预览</ElDropdownItem>
        <ElDropdownItem command="importJson">导入 JSON</ElDropdownItem>
        <ElDropdownItem command="exportJson">导出 JSON</ElDropdownItem>
        <ElDropdownItem command="exportCode">导出代码</ElDropdownItem>
        <ElDropdownItem command="generateSFC">生成 SFC</ElDropdownItem>
        <ElDropdownItem command="clearDesigner" divided>
          <span class="danger-action">清空</span>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</VFormDesigner>
```

Add the scoped danger color:

```css
.danger-action {
  color: var(--el-color-danger);
}
```

- [ ] **Step 6: Run focused verification**

Run from `apps/web`:

```bash
./node_modules/.bin/vitest run test/components/tool/build.spec.ts
./node_modules/.bin/eslint src/views/tool/build/index.vue test/components/tool/build.spec.ts
```

Expected: all component tests pass and ESLint exits without errors or warnings. VForm may print its existing Element Plus radio deprecation warning during the real-plugin mount.

- [ ] **Step 7: Run production build and clean generated declarations**

Run from `apps/web`:

```bash
./node_modules/.bin/vite build --mode prod
```

Expected: `Build successful. Please see dist directory`. Reverse only the build-generated `apps/web/components.d.ts` diff if present.

- [ ] **Step 8: Perform manual acceptance and commit**

Open `/tool/build` at a narrow width. Confirm the single `表单操作` trigger is visible, its dropdown contains all six entries, the five non-destructive items open official VForm dialogs, and clear is visually separated at the bottom. Do not confirm destructive clearing of user form data.

```bash
git add apps/web/src/views/tool/build/index.vue apps/web/test/components/tool/build.spec.ts
git commit -m "fix(web): collapse VForm actions into menu"
```
