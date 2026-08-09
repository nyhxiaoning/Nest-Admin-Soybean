<script setup lang="ts">
import { computed, onMounted, ref, h, createVNode } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NButton, NCard, NDataTable, NEmpty, NGrid, NGi,
  NInput, NPopconfirm, NSelect, NSpace, NSpin, NTag, NText, NTabs, NTabPane,
} from 'naive-ui';
import { useAppStore } from '@/store/modules/app';
import {
  fetchManuscriptList, fetchManuscriptRemove, fetchManuscriptPermanentDelete,
  fetchManuscriptRestore, fetchManuscriptCopy, fetchTagList,
} from '@/service/api';
import type { Api } from '@/typings/api';
import ManuscriptEditorDrawer from './modules/manuscript-editor-drawer.vue';

defineOptions({ name: 'LiteratureManuscripts' });

const appStore = useAppStore();
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const currentStatus = ref('0');
const tagOptions = ref<Api.Literature.Tag[]>([]);
const keyword = ref('');
const selectedTagId = ref<number | null>(null);
const data = ref<Api.Literature.Manuscript[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const drawerVisible = ref(false);
const editingManuscriptId = ref<number | null>(null);

const statusTabs = [
  { label: '草稿箱', value: '0' },
  { label: '正式稿件', value: '1' },
  { label: '归档稿件', value: '2' },
  { label: '回收站', value: '3' },
];

const columns = computed(() => [
  { key: 'title', title: '标题', minWidth: 280 },
  { key: 'wordCount', title: '字数', width: 80, align: 'center' },
  {
    key: 'tags',
    title: '标签',
    width: 200,
    render: (row: Api.Literature.Manuscript) => {
      if (!row.tags?.length) return '-';
      return h(NTag, { size: 'small' }, { default: () => row.tags.map((t: any) => t.tagName).join(' ') });
    },
  },
  { key: 'updateTime', title: '更新时间', width: 180 },
  {
    key: 'operate',
    title: '操作',
    width: 280,
    render: (row: Api.Literature.Manuscript) => {
      const inRecycle = currentStatus.value === '3';
      return h(NSpace, {},
        () => [
          createVNode(NButton, { tertiary: true, size: 'small', onClick: () => edit(row.manuscriptId!) }, { default: () => '编辑' }),
          createVNode(NPopconfirm, { onPositiveClick: () => copy(row.manuscriptId!) }, {
            trigger: () => createVNode(NButton, { tertiary: true, size: 'small' }, { default: () => '复制' }),
          }),
          inRecycle
            ? [
                createVNode(NPopconfirm, { onPositiveClick: () => restore(row.manuscriptId!) }, {
                  trigger: () => createVNode(NButton, { tertiary: true, size: 'small', type: 'info' as const }, { default: () => '恢复' }),
                }),
                createVNode(NPopconfirm, { onPositiveClick: () => purge(row.manuscriptId!) }, {
                  trigger: () => createVNode(NButton, { tertiary: true, size: 'small', type: 'error' as const }, { default: () => '永久删除' }),
                }),
              ]
            : createVNode(NPopconfirm, { onPositiveClick: () => remove(row.manuscriptId!) }, {
              trigger: () => createVNode(NButton, { tertiary: true, size: 'small', type: 'error' as const }, { default: () => '删除' }),
            }),
        ]
      );
    },
  },
]);

async function loadData() {
  loading.value = true;
  try {
    const res: any = await fetchManuscriptList({
      status: currentStatus.value,
      tagId: selectedTagId.value || undefined,
      keyword: keyword.value || undefined,
      pageNum: page.value,
      pageSize: pageSize.value,
    });
    data.value = res.data?.rows || [];
    total.value = res.data?.total || 0;
  } finally {
    loading.value = false;
  }
}

function edit(id: number) {
  editingManuscriptId.value = id;
  drawerVisible.value = true;
}

async function copy(id: number) {
  await fetchManuscriptCopy(id);
  loadData();
}

async function remove(id: number) {
  await fetchManuscriptRemove(id);
  loadData();
}

async function restore(id: number) {
  await fetchManuscriptRestore(id);
  loadData();
}

async function purge(id: number) {
  await fetchManuscriptPermanentDelete(id);
  loadData();
}

function onTabChange(val: string) {
  currentStatus.value = val;
  page.value = 1;
  loadData();
}

function onSubmitted() {
  drawerVisible.value = false;
  editingManuscriptId.value = null;
  loadData();
}

function handleRouteAction() {
  const { action, id } = route.query;
  if (action === 'new') {
    edit(null as any);
    router.replace({ query: {} });
  } else if (action === 'edit' && id) {
    edit(Number(id));
    router.replace({ query: {} });
  }
}

onMounted(async () => {
  const { data: tagsData } = await fetchTagList({ keyword: '' });
  tagOptions.value = tagsData?.rows || [];
  loadData();
  handleRouteAction();
});
</script>

<template>
  <NSpace vertical :size="16">
    <div class="flex items-center gap-12px">
      <NTabs v-model:value="currentStatus" @update:value="onTabChange">
        <NTabPane v-for="t in statusTabs" :key="t.value" :name="t.value" :tab="t.label" />
      </NTabs>
      <div class="flex-1" />
      <NInput v-model:value="keyword" placeholder="搜索标题..." clearable style="width: 200px" @keyup.enter="loadData" />
      <NSelect
        v-model:value="selectedTagId"
        placeholder="标签筛选"
        clearable
        :options="tagOptions.map(t => ({ label: t.tagName, value: t.tagId }))"
        style="width: 160px"
        @update:value="loadData"
      />
      <NButton type="primary" @click="edit(null as any)">新建文稿</NButton>
    </div>

    <NCard :bordered="false" class="flex-1-hidden" :body-style="{ height: '100%' }">
      <template v-if="loading">
        <NSpin />
      </template>
      <template v-else-if="data.length === 0">
        <NEmpty description="暂无文稿" />
      </template>
      <NDataTable
        v-else
        :columns="columns"
        :data="data"
        :pagination="appStore.isMobile ? undefined : { pageSize: 10 }"
        :bordered="false"
      />
    </NCard>

    <ManuscriptEditorDrawer
      v-model:visible="drawerVisible"
      :manuscript-id="editingManuscriptId"
      @submitted="onSubmitted"
    />
  </NSpace>
</template>

<style scoped></style>
