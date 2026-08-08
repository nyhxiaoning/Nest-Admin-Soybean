<script setup lang="ts">
import { ref } from 'vue';

const designerRef = ref();
</script>

<template>
  <div class="vform-designer-page">
    <VFormDesigner ref="designerRef" />
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
  min-width: 1200px;
  height: 100%;
  min-height: 800px;
}
</style>
