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
