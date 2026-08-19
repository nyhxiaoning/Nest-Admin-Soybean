<script setup lang="ts">
import { useAppI18n } from '@@/composables/useI18n'
const { t } = useAppI18n()
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold mb-4">{{ t('components.navigation.settings') }}</h2>
    <p class="text-gray-600">这里是设置页面示例。</p>
  </div>
  
</template>

<style scoped></style>

