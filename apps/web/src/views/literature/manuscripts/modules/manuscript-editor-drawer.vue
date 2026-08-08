<script setup lang="tsx">
import { NButton, NCard, NSpin } from 'naive-ui';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { fetchManuscriptSave, fetchManuscriptDetail, fetchLiteratureUpload } from '@/service/api';
import type { Api } from '@/typings/api';

const props = defineProps<{
  visible: boolean;
  operateType: string;
  manuscriptId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'submitted'): void;
}>();

const { darkMode } = useThemeStore();
const loading = ref(false);
const saving = ref(false);
const manuscript = ref<Partial<Api.Literature.ManuscriptDetail>>({ title: '', content: '', status: '0' });
const saveTimer = ref<ReturnType<typeof setInterval> | null>(null);
const saveInterval = ref(30);

const MdEditor = defineAsyncComponent(async () => {
  const mod = await import('md-editor-v3');
  return mod.MdEditor;
});

async function loadManuscript() {
  if (!props.manuscriptId) {
    manuscript.value = { title: '', content: '', status: '0' };
    return;
  }
  loading.value = true;
  try {
    const { data } = await fetchManuscriptDetail(props.manuscriptId);
    manuscript.value = data;
  } finally {
    loading.value = false;
  }
}

function onClose() {
  flushSave();
  emit('update:visible', false);
}

async function flushSave() {
  if (!props.manuscriptId || saving.value) return;
  saving.value = true;
  try {
    await fetchManuscriptSave({ manuscriptId: props.manuscriptId, content: manuscript.value.content || '', wordCount: 0 });
  } finally {
    saving.value = false;
  }
}

function handleContentChange(v: string) {
  manuscript.value.content = v;
}

async function handleSubmit() {
  await flushSave();
  emit('submitted');
}

watch(() => props.visible, (val) => {
  if (val) loadManuscript();
});

watch(() => props.visible, (val) => {
  if (val && props.manuscriptId) {
    // 启动自动保存（防抖节流 30s）
    if (saveTimer.value) clearInterval(saveTimer.value);
    saveTimer.value = setInterval(flushSave, saveInterval.value * 1000);
  } else {
    if (saveTimer.value) {
      clearInterval(saveTimer.value);
      saveTimer.value = null;
    }
  }
});

onBeforeUnmount(() => {
  if (saveTimer.value) clearInterval(saveTimer.value);
});
</script>

<template>
  <NDrawer
    :show="visible"
    :width="'70%'"
    placement="right"
    @after-leave="onClose"
  >
    <NSpace vertical :size="16" class="h-full">
      <div class="flex items-center justify-between">
        <NInput
          v-model:value="manuscript.title"
          placeholder="无标题文稿"
          class="title-input"
          :style="{ fontSize: '18px', fontWeight: 600 }"
        />
        <NSpace>
          <NButton :loading="saving" tertiary @click="flushSave">
            <template #icon>
              <NIcon :component="SaveOutline" />
            </template>
            保存
          </NButton>
          <NButton type="primary" :loading="saving" @click="handleSubmit">完成</NButton>
        </NSpace>
      </div>

      <NCard :bordered="false" class="flex-1 editor-card">
        <NSpin :show="loading">
          <MdEditor
            v-model="manuscript.content"
            :theme="darkMode ? 'dark' : 'light'"
            language="zh-CN"
            :toolbars="['bold', 'italic', 'strikeThrough', '|', 'title', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'code', 'codeRow', 'link', 'image', 'table', '|', 'save', 'fullscreen', 'preview', 'htmlPreview', 'catalog']"
            @onChange="handleContentChange"
            @onUploadImg="async (files: File[], _callbacks: any) => {
              const urls: { url: string; alt?: string }[] = [];
              for (const file of files) {
                const res: any = await fetchLiteratureUpload(file);
                urls.push({ url: res.data.url });
              }
              _callbacks(urls);
            }"
          />
        </NSpin>
      </NCard>
    </NSpace>
  </NDrawer>
</template>

<style scoped>
.title-input :deep(.n-input__input-el) {
  font-size: 18px;
  font-weight: 600;
}
.editor-card :deep(.n-card__content) {
  height: calc(100vh - 140px);
  padding: 0;
  overflow: hidden;
}
</style>
