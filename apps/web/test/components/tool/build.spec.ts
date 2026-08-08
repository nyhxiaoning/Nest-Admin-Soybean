import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BuildPage from '@/views/tool/build/index.vue';

const buildPageSource = readFileSync(resolve('src/views/tool/build/index.vue'), 'utf8');

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

  it('keeps the designer dimensions and enables double-axis scrolling', () => {
    expect(buildPageSource).toContain('overflow: auto;');
    expect(buildPageSource).toContain('min-width: 1200px;');
    expect(buildPageSource).toContain('min-height: 800px;');
  });
});
