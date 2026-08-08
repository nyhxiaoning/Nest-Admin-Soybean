<script setup lang="ts">
import { ref } from 'vue';

const designerRef = ref();

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
</script>

<template>
  <div class="vform-designer-page">
    <VFormDesigner ref="designerRef" :designer-config="designerConfig" />
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
</style>
