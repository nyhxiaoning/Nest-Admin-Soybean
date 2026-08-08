<script setup lang="tsx">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NCard, NEmpty, NSpin } from 'naive-ui';
import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import { fetchManuscriptDetail } from '@/service/api';
import type { Api } from '@/typings/api';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const manuscript = ref<Api.Literature.ManuscriptDetail | null>(null);

const id = computed(() => Number(route.params.id));

async function loadManuscript() {
  loading.value = true;
  try {
    const { data } = await fetchManuscriptDetail(id.value);
    manuscript.value = data;
  } finally {
    loading.value = false;
  }
}

onMounted(loadManuscript);

watch(id, loadManuscript);
</script>

<template>
  <div class="print-page p-24px">
    <NCard v-if="loading" :bordered="false">
      <NSpin />
    </NCard>
    <NCard v-else-if="manuscript" :bordered="false" class="print-content">
      <h1 class="print-title">{{ manuscript.title || '无标题文稿' }}</h1>
      <div class="print-meta">
        <span>创建时间：{{ manuscript.createTime }}</span>
        <span class="ml-16px">字数：{{ manuscript.wordCount }}</span>
      </div>
      <div class="mt-24px print-body">
        <MdPreview :modelValue="manuscript.content || ''" />
      </div>
      <div class="mt-24px text-center">
        <NButton type="primary" @click="() => window.print()">打印 / 另存为 PDF</NButton>
        <NButton class="ml-16px" @click="router.back()">返回</NButton>
      </div>
    </NCard>
    <NEmpty v-else description="文稿不存在" />
  </div>
</template>

<style scoped>
.print-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
}
.print-title {
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
}
.print-meta {
  text-align: center;
  color: #999;
  font-size: 14px;
}
.print-body {
  border-top: 1px solid #eee;
  padding-top: 24px;
}

@media print {
  .print-page {
    padding: 0;
    max-width: 100%;
  }
  .print-content {
    box-shadow: none !important;
  }
}
</style>
