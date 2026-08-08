<script setup lang="ts">
import { computed, onMounted, ref, h } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NGrid,
  NGi,
  NSpace,
  NSpin,
  NTag,
  NText,
} from 'naive-ui';
import { useAppStore } from '@/store/modules/app';
import { fetchWorkbenchOverview } from '@/service/api';
import type { Api } from '@/typings/api';

defineOptions({ name: 'LiteratureWorkbench' });

const appStore = useAppStore();
const loading = ref(false);
const overview = ref<Api.Literature.WorkbenchOverview | null>(null);

const statCards = computed(() => [
  { label: '草稿箱', value: overview.value?.totalDrafts ?? 0, color: '#808695' },
  { label: '正式稿件', value: overview.value?.totalPublished ?? 0, color: '#2d8cf0' },
  { label: '归档稿件', value: overview.value?.totalArchived ?? 0, color: '#19be6b' },
  { label: '总字数', value: overview.value?.totalWords ?? 0, color: '#ff9900' },
  { label: '素材数', value: overview.value?.totalMaterials ?? 0, color: '#9a66e4' },
  { label: '标签数', value: overview.value?.totalTags ?? 0, color: '#ed4014' },
]);

const recentColumns = [
  { title: '标题', key: 'title' },
  { title: '字数', key: 'wordCount', width: 80 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row: Api.Literature.Manuscript) => {
      const map: Record<string, string> = { '0': '草稿', '1': '正式', '2': '归档', '3': '回收站' };
      const colorMap: Record<string, string> = { '0': 'default', '1': 'success', '2': 'warning', '3': 'error' };
      return h(NTag, { color: { type: colorMap[row.status] as any } }, () => map[row.status] || row.status);
    },
  },
  { title: '更新时间', key: 'updateTime', width: 180 },
];

function loadOverview() {
  loading.value = true;
  fetchWorkbenchOverview()
    .then((res) => {
      overview.value = res.data;
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(loadOverview);
</script>

<template>
  <NSpace vertical :size="16">
    <div class="flex items-center justify-between">
      <NText :depth="1" class="text-20px font-bold">文稿工作台</NText>
      <NButton type="primary" @click="() => {}">新建文稿</NButton>
    </div>

    <NSpin :show="loading">
      <NGrid :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGi v-for="card in statCards" :key="card.label" :span="24">
          <NCard :bordered="false" class="stat-card">
            <NSpace vertical align="center">
              <NText :depth="3" class="text-14px">{{ card.label }}</NText>
              <NText :style="{ color: card.color, fontSize: '28px', fontWeight: 700 }">
                {{ card.value }}
              </NText>
            </NSpace>
          </NCard>
        </NGi>
      </NGrid>

      <NCard title="最近文稿" :bordered="false" class="mt-16px">
        <NDataTable
          :columns="recentColumns"
          :data="overview?.recent || []"
          :pagination="{ pageSize: 10 }"
          :bordered="false"
        />
        <template #empty>
          <NEmpty description="暂无文稿，点击新建开始写作" />
        </template>
      </NCard>
    </NSpin>
  </NSpace>
</template>

<style scoped>
.stat-card {
  transition: transform 0.2s;
}
.stat-card:hover {
  transform: translateY(-2px);
}
</style>
