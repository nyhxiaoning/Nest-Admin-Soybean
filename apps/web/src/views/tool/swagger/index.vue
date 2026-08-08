<script setup lang="ts">
import { computed } from 'vue';

defineOptions({
  name: 'SwaggerPage'
});

/**
 * Swagger UI 地址
 *
 * frame-ancestors CSP 说明：
 * Swagger UI 自身页面嵌入了 frame-ancestors 'self' CSP 策略，
 * 要求嵌入它的父页面 origin 必须与其自身 origin 相同（均为 localhost:8080）。
 *
 * 如果通过 iframe 嵌入（src 指向 localhost:9527/proxy 路径），
 * 父页面 origin = localhost:9527 ≠ localhost:8080，CSP 报错。
 *
 * 解决方案：改用 window.open 新开标签页打开，两个页面 origin 一致，CSP 自然通过。
 */
const swaggerUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_SERVICE_BASE_URL || 'http://localhost:8080/api/v1';
  return `${baseUrl}/api/swagger-ui`;
});

function handleOpenSwagger() {
  window.open(swaggerUrl.value, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <div class="h-full flex items-center justify-center">
    <div class="text-center">
      <p class="mb-4 text-lg">Swagger API 文档</p>
      <NButton type="primary" @click="handleOpenSwagger">
        在新标签页打开 Swagger 文档
      </NButton>
      <p class="mt-4 text-sm text-gray-400">
        由于 Swagger UI 的 CSP frame-ancestors 'self' 限制，无法在 iframe 中嵌入，请在新标签页查看。
      </p>
    </div>
  </div>
</template>

<style scoped>
.h-full {
  height: 100%;
}

.size-full {
  width: 100%;
  height: 100%;
}

.border-none {
  border: none;
}
</style>
