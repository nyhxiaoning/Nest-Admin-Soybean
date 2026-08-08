import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import VForm3 from 'vform3-builds';
import { describe, expect, it } from 'vitest';
import BuildPage from '@/views/tool/build/index.vue';

const buildPageSource = readFileSync(resolve('src/views/tool/build/index.vue'), 'utf8');

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

  it('keeps the designer dimensions and enables double-axis scrolling', () => {
    expect(buildPageSource).toContain('overflow: auto;');
    expect(buildPageSource).toContain('min-width: 1500px;');
    expect(buildPageSource).toContain('min-height: 800px;');
  });

  it('keeps VForm icons inline inside fixed-height component cards', () => {
    expect(buildPageSource).toMatch(/\.vform-designer-page :deep\(\.svg-icon\)\s*\{\s*display: inline-block;/);
  });

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

  it('renders all official toolbar actions with the real VForm plugin', () => {
    const wrapper = mount(BuildPage, {
      global: {
        plugins: [ElementPlus, VForm3]
      }
    });

    for (const action of ['清空', '预览', '导入JSON', '导出JSON', '导出代码', '生成SFC']) {
      expect(wrapper.text()).toContain(action);
    }
  });
});
