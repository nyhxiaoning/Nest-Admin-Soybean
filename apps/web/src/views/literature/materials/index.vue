<script setup lang="ts">
import { computed, onMounted, ref, h, createVNode } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { fetchMaterialList, fetchMaterialRemove } from '@/service/api';
import { NButton, NCard, NDataTable, NEmpty, NInput, NPopconfirm, NSpace, NSpin, NTabPane, NTabs, NTag, NText } from 'naive-ui';
import type { Api } from '@/typings/api';

defineOptions({ name: 'LiteratureMaterials' });

const appStore = useAppStore();
const loading = ref(false);
const activeTab = ref('all');
const data = ref<Api.Literature.Material[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');

const typeMap: Record<string, string> = { '0': '短句', '1': '金句', '2': '典故' };
const typeTagColor: Record<string, string> = { '0': '#2d8cf0', '1': '#ff9900', '2': '#9a66e4' };

const columns = computed(() => [
  {
    key: 'type',
    title: '类型',
    width: 90,
    render: (row: Api.Literature.Material) => h(NTag, { color: { color: typeTagColor[row.type] } }, { default: () => typeMap[row.type] || row.type }),
  },
  { key: 'content', title: '内容', minWidth: 300 },
  { key: 'source', title: '出处', width: 150, render: (row: Api.Literature.Material) => row.source || '-' },
  { key: 'createTime', title: '创建时间', width: 180 },
  {
    key: 'operate',
    title: '操作',
    width: 140,
    render: (row: Api.Literature.Material) => h(NSpace, {},
      () => [
        createVNode(NButton, { tertiary: true, size: 'small' }, { default: () => '编辑' }),
        createVNode(NPopconfirm, { onPositiveClick: () => handleRemove(row.materialId!) }, {
          trigger: () => createVNode(NButton, { tertiary: true, size: 'small', type: 'error' as const }, { default: () => '删除' }),
        }),
      ]
    ),
  },
]);

async function loadData() {
  loading.value = true;
  try {
    const typeVal = activeTab.value === 'all' ? null : activeTab.value;
    const res: any = await fetchMaterialList({ type: typeVal, keyword: keyword.value || undefined, pageNum: page.value, pageSize: pageSize.value });
    data.value = res.data?.rows || [];
    total.value = res.data?.total || 0;
  } finally {
    loading.value = false;
  }
}

async function handleRemove(id: number) {
  await fetchMaterialRemove(id);
  loadData();
}

onMounted(loadData);
</script>

<template>
  <NSpace vertical :size="16">
    <div class="flex items-center gap-12px">
      <NTabs v-model:value="activeTab" @update:value="loadData">
        <NTabPane name="all" tab="全部" />
        <NTabPane name="0" tab="短句" />
        <NTabPane name="1" tab="金句" />
        <NTabPane name="2" tab="典故" />
      </NTabs>
      <div class="flex-1" />
      <NInput v-model:value="keyword" placeholder="搜索内容..." clearable style="width: 200px" @keyup.enter="loadData" />
      <NButton type="primary" @click="() => {}">新增素材</NButton>
    </div>
    <NCard :bordered="false">
      <NSpin :show="loading">
        <template v-if="data.length">
          <NDataTable :columns="columns" :data="data" :pagination="{ pageSize: 10 }" :bordered="false" />
        </template>
        <NEmpty v-else description="暂无素材" />
      </NSpin>
    </NCard>
  </NSpace>
</template>

<style scoped></style>
