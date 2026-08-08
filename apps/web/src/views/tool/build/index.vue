<script setup lang="ts">
import { ref } from 'vue';

type DesignerAction = 'clearDesigner' | 'previewForm' | 'importJson' | 'exportJson' | 'exportCode' | 'generateSFC';

type VFormDesignerExpose = Record<DesignerAction, () => void>;

const designerRef = ref<VFormDesignerExpose>();

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

function handleDesignerAction(command: DesignerAction) {
  designerRef.value?.[command]();
}
</script>

<template>
  <div class="vform-designer-page">
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
  </div>
</template>

<style scoped>
.vform-designer-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.vform-designer-page :deep(.el-container.full-height) {
  width: 100%;
  min-width: 1500px;
  height: 100%;
  min-height: 800px;
}

.vform-designer-page :deep(.svg-icon) {
  display: inline-block;
}

.danger-action {
  color: var(--el-color-danger);
}
</style>
