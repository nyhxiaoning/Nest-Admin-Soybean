<script setup lang="ts">
import { onMounted, ref, h, createVNode } from 'vue';
import { fetchTagList, fetchTagCreate, fetchTagUpdate, fetchTagRemove } from '@/service/api';
import { NButton, NCard, NDataTable, NEmpty, NInput, NPopconfirm, NSpace, NSpin, NTag, NText, NDrawer, NForm, NFormItem, NColorPicker } from 'naive-ui';
import type { Api } from '@/typings/api';

defineOptions({ name: 'LiteratureTags' });

const loading = ref(false);
const data = ref<Api.Literature.Tag[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const drawerVisible = ref(false);
const editingTag = ref<Partial<Api.Literature.Tag>>({ tagName: '', color: '#2080f0' });
const isEdit = ref(false);

const columns = [
  { key: 'tagName', title: '标签名称' },
  {
    key: 'color',
    title: '颜色',
    width: 160,
    render: (row: Api.Literature.Tag) => h(NTag, { color: { color: row.color } }, { default: () => row.tagName }),
  },
  { key: 'manuscriptCount', title: '关联文稿数', width: 100, render: (row: any) => row.manuscriptCount ?? 0 },
  {
    key: 'operate',
    title: '操作',
    width: 200,
    render: (row: Api.Literature.Tag) => h(NSpace, {},
      () => [
        createVNode(NButton, { tertiary: true, size: 'small', onClick: () => edit(row) }, { default: () => '编辑' }),
        createVNode(NButton, { tertiary: true, size: 'small', type: 'info' as const, onClick: () => {} }, { default: () => '管理' }),
        createVNode(NPopconfirm, { onPositiveClick: () => handleRemove(row.tagId!) }, {
          trigger: () => createVNode(NButton, { tertiary: true, size: 'small', type: 'error' as const }, { default: () => '删除' }),
        }),
      ]
    ),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const res: any = await fetchTagList({ keyword: keyword.value || undefined, pageNum: page.value, pageSize: pageSize.value });
    data.value = res.data?.rows || [];
    total.value = res.data?.total || 0;
  } finally {
    loading.value = false;
  }
}

function edit(row: Api.Literature.Tag) {
  isEdit.value = true;
  editingTag.value = { ...row };
  drawerVisible.value = true;
}

function handleAdd() {
  isEdit.value = false;
  editingTag.value = { tagName: '', color: '#2080f0' };
  drawerVisible.value = true;
}

async function handleRemove(id: number) {
  await fetchTagRemove(id);
  loadData();
}

async function handleSubmit() {
  if (isEdit.value && editingTag.value.tagId) {
    await fetchTagUpdate({ tagId: editingTag.value.tagId, tagName: editingTag.value.tagName!, color: editingTag.value.color! });
  } else {
    await fetchTagCreate({ tagName: editingTag.value.tagName!, color: editingTag.value.color! });
  }
  drawerVisible.value = false;
  loadData();
}

onMounted(loadData);
</script>

<template>
  <NSpace vertical :size="16">
    <div class="flex items-center gap-12px">
      <NInput v-model:value="keyword" placeholder="搜索标签..." clearable style="width: 200px" @keyup.enter="loadData" />
      <div class="flex-1" />
      <NButton type="primary" @click="handleAdd">新增标签</NButton>
    </div>

    <NCard :bordered="false">
      <NSpin :show="loading">
        <NDataTable v-if="data.length" :columns="columns" :data="data" :pagination="{ pageSize: 10 }" :bordered="false" />
        <NEmpty v-else description="暂无标签" />
      </NSpin>
    </NCard>

    <NDrawer v-model:show="drawerVisible" :width="400" placement="right">
      <NSpace vertical :size="16" class="p-16px">
        <NText :depth="1" class="text-16px font-bold">{{ isEdit ? '编辑标签' : '新增标签' }}</NText>
        <NForm :model="editingTag" label-placement="top">
          <NFormItem label="标签名称">
            <NInput v-model:value="editingTag.tagName" placeholder="请输入标签名称" />
          </NFormItem>
          <NFormItem label="颜色">
            <NColorPicker v-model:value="editingTag.color" />
          </NFormItem>
          <NFormItem>
            <NSpace>
              <NButton type="primary" @click="handleSubmit">提交</NButton>
              <NButton @click="drawerVisible = false">取消</NButton>
            </NSpace>
          </NFormItem>
        </NForm>
      </NSpace>
    </NDrawer>
  </NSpace>
</template>

<style scoped></style>
