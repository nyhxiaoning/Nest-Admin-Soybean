<script setup lang="tsx">
import { NButton, NCard, NButtonGroup, NSpin, NSelect, NSpace, NInput, NTooltip } from 'naive-ui';
import { defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import 'md-editor-v3/lib/style.css';
import {
  fetchManuscriptCreate,
  fetchManuscriptUpdate,
  fetchManuscriptChangeStatus,
  fetchManuscriptBindTags,
  fetchManuscriptDetail,
  fetchLiteratureUpload,
  fetchTagList,
} from '@/service/api';
import type { Api } from '@/typings/api';

type EditorMode = 'edit' | 'preview' | 'split';

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
const editorMode = ref<EditorMode>('edit');
const currentId = ref<number | null>(props.manuscriptId);
const manuscript = ref<Partial<Api.Literature.ManuscriptDetail>>({ title: '', content: '', status: '0' });
const tagOptions = ref<Api.Literature.Tag[]>([]);
const selectedTagIds = ref<number[]>([]);
const saveTimer = ref<ReturnType<typeof setInterval> | null>(null);
const saveInterval = ref(30);

const MdEditor = defineAsyncComponent(async () => {
  const mod = await import('md-editor-v3');
  return mod.MdEditor;
});

const MdPreview = defineAsyncComponent(async () => {
  const mod = await import('md-editor-v3');
  return mod.MdPreview;
});

const modeButtons = [
  { key: 'edit',    label: '✏️  编辑' },
  { key: 'preview', label: '👁️  预览' },
  { key: 'split',   label: '↔️  分屏' },
] as const;

function resetForm() {
  manuscript.value = { title: '', content: '', status: '0' };
  selectedTagIds.value = [];
  currentId.value = props.manuscriptId;
  editorMode.value = 'edit';
}

async function loadManuscript() {
  resetForm();
  if (!currentId.value) return;
  loading.value = true;
  try {
    const { data } = await fetchManuscriptDetail(currentId.value);
    manuscript.value = data;
    selectedTagIds.value = (data?.tags || []).map(t => t.tagId as number);
  } finally {
    loading.value = false;
  }
}

async function loadTags() {
  try {
    const { data } = await fetchTagList({ keyword: '' });
    tagOptions.value = data?.rows || [];
  } catch {
    tagOptions.value = [];
  }
}

function onClose() {
  flushSave();
  emit('update:visible', false);
}

async function flushSave() {
  if (saving.value) return;
  saving.value = true;
  try {
    if (currentId.value) {
      await fetchManuscriptUpdate({
        manuscriptId: currentId.value,
        title: manuscript.value.title?.trim() || '无标题文稿',
        content: manuscript.value.content || '',
        wordCount: 0,
      });
    } else if (manuscript.value.title?.trim() || manuscript.value.content?.trim()) {
      const { data } = await fetchManuscriptCreate({
        title: manuscript.value.title?.trim() || '无标题文稿',
        content: manuscript.value.content || '',
      });
      if (data?.manuscriptId) {
        currentId.value = data.manuscriptId;
        await flushTags(currentId.value);
      }
    }
  } finally {
    saving.value = false;
  }
}

async function flushTags(manuscriptId: number) {
  try {
    await fetchManuscriptBindTags({ manuscriptId, tagIds: selectedTagIds.value });
  } catch {
    /* 标签绑定失败不阻断保存 */
  }
}

function handleContentChange(v: string) {
  manuscript.value.content = v;
}

/**
 * 切换编辑模式
 *
 * 说明：md-editor-v3 的 previewOnly 内部状态硬编码初始化为 false（不从 prop 读取，
 * 仅工具栏内部 toggle 控制），因此"纯预览"改用独立的 MdPreview 组件渲染；
 * "编辑/分屏"由 MdEditor 的 :preview prop 控制（该 prop 生效）。
 *
 * | 模式     | 渲染组件      | 页面效果           |
 * |----------|---------------|--------------------|
 * | 纯编辑   | MdEditor      | 仅源码编辑面板     |
 * | 纯预览   | MdPreview     | 仅渲染预览页面     |
 * | 左右分屏 | MdEditor      | 编辑+预览双栏并排  |
 */
function switchMode(mode: EditorMode) {
  editorMode.value = mode;
}

async function changeStatus(status: string) {
  await flushSave();
  if (currentId.value) {
    await fetchManuscriptChangeStatus({ manuscriptId: currentId.value, status });
    await flushTags(currentId.value);
  }
  emit('submitted');
}

async function handleSubmit() {
  await flushSave();
  if (currentId.value) {
    await flushTags(currentId.value);
  }
  emit('submitted');
}

watch(() => props.visible, (val) => {
  if (val) {
    loadManuscript();
    loadTags();
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
    <!--
      editor-container: Flex-Column 纵向排布
      层级：顶部工具栏行 → 模式切换栏 → 下层编辑主体区域
      注意：这里用 div 而非 NSpace —— NSpace 会给每个子元素包一层 .n-space-item，
            导致 editor-main 的 flex:1 作用在错误的包裹元素上，无法占满剩余高度
    -->
    <div class="h-full editor-container">

      <!-- ══ 顶部工具栏行（标题 + 标签选择 + 操作按钮）══ -->
      <div class="toolbar-row">
        <NInput
          v-model:value="manuscript.title"
          placeholder="无标题文稿"
          class="title-input flex-1"
          :style="{ fontSize: '18px', fontWeight: 600 }"
        />
        <NSelect
          v-model:value="selectedTagIds"
          multiple
          filterable
          clearable
          :options="tagOptions.map(t => ({ label: t.tagName, value: t.tagId }))"
          placeholder="选择标签"
          class="tag-select"
        />
        <NSpace>
          <NButton :loading="saving" tertiary @click="flushSave">保存</NButton>
          <NButton :loading="saving" type="warning" @click="changeStatus('1')">发布</NButton>
          <NButton :loading="saving" tertiary @click="changeStatus('2')">归档</NButton>
          <NButton type="primary" :loading="saving" @click="handleSubmit">完成</NButton>
        </NSpace>
      </div>

      <!-- ══ 模式切换栏（工具栏下方，控制三种视图模式）══ -->
      <div class="mode-bar">
        <span class="mode-label">视图：</span>
        <NButtonGroup>
          <NButton
            v-for="btn in modeButtons"
            :key="btn.key"
            :type="editorMode === btn.key ? 'primary' : 'default'"
            size="small"
            @click="switchMode(btn.key as EditorMode)"
          >
            {{ btn.label }}
          </NButton>
        </NButtonGroup>
      </div>

      <!-- ══ 下层编辑主体区域（占满抽屉剩余全部可用高度）══ -->
      <NCard :bordered="false" class="editor-main">
        <NSpin :show="loading">
          <!-- 纯预览模式：独立 MdPreview 组件（md-editor 的 previewOnly 不受 prop 控制，故单独渲染） -->
          <MdPreview
            v-if="editorMode === 'preview'"
            :modelValue="manuscript.content"
            :theme="darkMode ? 'dark' : 'light'"
            language="zh-CN"
            class="md-preview-full"
          />
          <!-- 编辑 / 分屏模式：MdEditor，:preview 控制是否左右分屏 -->
          <MdEditor
            v-else
            :key="editorMode"
            v-model="manuscript.content"
            :theme="darkMode ? 'dark' : 'light'"
            language="zh-CN"
            :toolbars="[
              'bold', 'italic', 'strikeThrough', '|',
              'title', 'sub', 'sup', 'quote',
              'unorderedList', 'orderedList',
              'code', 'codeRow', 'link', 'image', 'table', '|',
              'save', 'fullscreen', 'preview', 'htmlPreview', 'catalog'
            ]"
            :preview="editorMode === 'split'"
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

    </div>
  </NDrawer>
</template>

<style scoped>
/* ═══════════════════════════════════════════
   editor-container: Flex-Column 纵向排布
   层级：顶部工具栏行 → 模式切换栏 → 下层编辑主体区域
═══════════════════════════════════════════ */
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;           /* 替代原 NSpace :size="10" 的纵向间距 */
}

/* ══ 顶部工具栏行 ═ */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;         /* 禁止工具栏被压缩 */
}
.title-input :deep(.n-input__input-el) {
  font-size: 18px;
  font-weight: 600;
}
.tag-select {
  width: 220px;
}

/* ══ 模式切换栏 ═ */
.mode-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 4px 0;
}
.mode-label {
  font-size: 13px;
  color: #888;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ══ n-drawer 内部 content-wrapper（portal 渲染在 body 下，无 scoped data-v）
     必须纵向 flex 才能让 editor-main 的 flex:1 生效               ═ */
:global(.n-drawer-content-wrapper) {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  overflow: hidden !important;
}

/* ══ 下层编辑主体区域（占满抽屉剩余全部可用高度）══ */
/*
 * flex:1   → 自动占用 drawer 除去工具栏之后的全部剩余空间
 * height:0 + min-height:0 → 消除 flex 子元素内容溢出撑开高度的默认行为，
 *                             保证编辑器区域严格受父容器约束、自适应填满可用区域
 */
.editor-main {
  flex: 1;
  height: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.editor-main :deep(.n-card__content) {
  flex: 1;
  height: 100%;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* NSpin 包裹层：必须占满才能让内部 md-editor 拉伸到满高 */
.editor-main :deep(.n-spin-container),
.editor-main :deep(.n-spin-content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ══ md-editor：工具栏横向 + 内容区自适应 ═ */
.editor-main :deep(.md-editor) {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/*
 * toolbar-wrap: 横向滚动工具栏
 * flex-wrap: nowrap  → 禁止按钮自动换行，强制横向排布
 * white-space: nowrap → 禁止按钮内部文本换行
 * overflow-x: auto    → 超出容器宽度时横向滚动，永不折叠成多行纵向布局
 * 工具栏位置固定悬浮，不跟随编辑区滚动
 */
.editor-main :deep(.md-editor-toolbar-wrapper) {
  flex-shrink: 0;
  display: flex;
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;           /* Firefox 隐藏滚动条 */
  -webkit-overflow-scrolling: touch;
}
.editor-main :deep(.md-editor-toolbar-wrapper::-webkit-scrollbar) {
  height: 0 !important;            /* Chrome/Safari 隐藏滚动条 */
}
.editor-main :deep(.md-editor-toolbar) {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: center;
  flex-shrink: 0;
}
.editor-main :deep(.md-editor-toolbar-left),
.editor-main :deep(.md-editor-toolbar-right) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  flex-shrink: 0;
}

/* 编辑内容区：自适应填充剩余高度 */
.editor-main :deep(.md-editor-content) {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: auto;
}
.editor-main :deep(.md-editor-catalog) {
  flex-shrink: 0;
}

/* 纯预览模式：MdPreview 占满编辑区 */
.editor-main :deep(.md-preview-full),
.md-preview-full {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}
.editor-main :deep(.md-preview-full .md-editor-preview-wrapper),
.md-preview-full .md-editor-preview-wrapper {
  padding: 0;
}
</style>
