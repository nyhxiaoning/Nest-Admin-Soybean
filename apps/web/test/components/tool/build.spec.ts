import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import VForm3 from 'vform3-builds';
import { describe, expect, it, vi } from 'vitest';
import BuildPage from '@/views/tool/build/index.vue';

const buildPageSource = readFileSync(resolve('src/views/tool/build/index.vue'), 'utf8');

const designerMethodMocks = {
  clearDesigner: vi.fn(),
  previewForm: vi.fn(),
  importJson: vi.fn(),
  exportJson: vi.fn(),
  exportCode: vi.fn(),
  generateSFC: vi.fn()
};

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

const ElButtonStub = defineComponent({
  name: 'ElButton',
  template: '<button><slot /></button>'
});

function mountBuildPageWithStubs() {
  const components = {
    VFormDesigner: VFormDesignerStub,
    ElDropdown: ElDropdownStub,
    ElDropdownMenu: ElDropdownMenuStub,
    ElDropdownItem: ElDropdownItemStub,
    ElButton: ElButtonStub
  };

  return mount(BuildPage, {
    global: {
      components,
      stubs: components
    }
  });
}

describe('tool/build page', () => {
  it('renders the designer directly without the legacy loader shell', () => {
    const wrapper = mountBuildPageWithStubs();

    expect(wrapper.find('.vform-designer-page').exists()).toBe(true);
    expect(wrapper.find('.v-form-designer-stub').exists()).toBe(true);
    expect(wrapper.find('#vform-mount').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('重新加载');
  });

  it('keeps the designer dimensions and enables double-axis scrolling', () => {
    expect(buildPageSource).toContain('overflow: auto;');
    expect(buildPageSource).toContain('min-width: 1500px;');
    expect(buildPageSource).toContain('min-height: 800px;');
  });

  it('keeps VForm icons inline inside fixed-height component cards', () => {
    expect(buildPageSource).toMatch(/\.vform-designer-page :deep\(\.svg-icon\)\s*\{\s*display: inline-block;/);
  });

  it('enables the complete toolbar at a stable width', () => {
    const wrapper = mountBuildPageWithStubs();
    const designer = wrapper.findComponent(VFormDesignerStub);

    expect(designer.props('designerConfig')).toEqual({
      toolbarMaxWidth: 140,
      toolbarMinWidth: 140,
      clearDesignerButton: false,
      previewFormButton: false,
      importJsonButton: false,
      exportJsonButton: false,
      exportCodeButton: false,
      generateSFCButton: false
    });
  });

  it('renders one action menu and dispatches all commands to VForm', () => {
    const wrapper = mountBuildPageWithStubs();

    expect(wrapper.text()).toContain('表单操作');
    expect(wrapper.findAll('.action-menu-item').map(item => item.text())).toEqual([
      '预览',
      '导入 JSON',
      '导出 JSON',
      '导出代码',
      '生成 SFC',
      '清空'
    ]);

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
  });

  it('renders the compact action trigger with the real VForm plugin', () => {
    const wrapper = mount(BuildPage, {
      global: {
        plugins: [ElementPlus, VForm3]
      }
    });

    expect(wrapper.text()).toContain('表单操作');
  });
});
