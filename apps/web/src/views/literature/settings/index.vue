<script setup lang="tsx">
import { NButton, NCard, NForm, NFormItem, NInputNumber, NRadioGroup, NRadioButton, NSlider, NSpace, NSpin, NStatistic, NText, NDescriptions, NDescriptionsItem } from 'naive-ui';
import { computed, onMounted, ref, h } from 'vue';
import { fetchSettingGet, fetchSettingUpdate, fetchWorkbenchOverview } from '@/service/api';
import type { Api } from '@/typings/api';

defineOptions({ name: 'LiteratureSettings' });

const loading = ref(false);
const saving = ref(false);
const overview = ref<Api.Literature.WorkbenchOverview | null>(null);
const setting = ref<Api.Literature.Setting>({
  settingId: 0,
  fontSize: 16,
  fontFamily: '',
  autosave: '1',
  autosaveInterval: 30,
  exportFormat: 'md',
});

const storageStats = computed(() => [
  { label: '文稿数量', value: (overview.value?.totalDrafts ?? 0) + (overview.value?.totalPublished ?? 0) + (overview.value?.totalArchived ?? 0) },
  { label: '素材数量', value: overview.value?.totalMaterials ?? 0 },
  { label: '标签数量', value: overview.value?.totalTags ?? 0 },
]);

const fontFamilies = [
  { label: '默认字体', value: '' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: '思源黑体', value: '"Source Han Sans CN", sans-serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '楷体', value: 'KaiTi, serif' },
];

const previewStyle = computed(() => ({
  fontSize: `${setting.value.fontSize}px`,
  fontFamily: setting.value.fontFamily,
  lineHeight: '1.8',
}));

async function loadSetting() {
  loading.value = true;
  try {
    const { data } = await fetchSettingGet();
    if (data) setting.value = data;
  } finally {
    loading.value = false;
  }
}

async function saveSetting() {
  saving.value = true;
  try {
    await fetchSettingUpdate(setting.value);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loadSetting();
  try {
    const { data } = await fetchWorkbenchOverview();
    overview.value = data;
  } catch {
    /* 概览拉取失败时存储统计保持 0 */
  }
});
</script>

<template>
  <NSpace vertical :size="16">
    <NText :depth="1" class="text-20px font-bold">编辑室设置</NText>

    <NSpin :show="loading">
      <NGrid :x-gap="16" :y-gap="16">
        <NGi :span="24">
          <NCard title="编辑器偏好" :bordered="false">
            <NForm label-placement="top" :model="setting">
              <NFormItem :label="`字体大小（${setting.fontSize}px）`">
                <NSlider v-model:value="setting.fontSize" :min="12" :max="24" :step="1" />
              </NFormItem>
              <NFormItem label="字体族">
                <NRadioGroup v-model:value="setting.fontFamily" :options="fontFamilies" />
              </NFormItem>
              <NFormItem label="自动保存">
                <NSwitch v-model:value="setting.autosave" :checked-value="'1'" :unchecked-value="'0'" />
              </NFormItem>
              <NFormItem label="自动保存间隔（秒）">
                <NInputNumber v-model:value="setting.autosaveInterval" :min="5" :max="300" :step="5" />
              </NFormItem>
              <NFormItem label="默认导出格式">
                <NRadioGroup v-model:value="setting.exportFormat" :options="[
                  { label: 'Markdown (.md)', value: 'md' },
                  { label: 'PDF (.pdf)', value: 'pdf' },
                ]" />
              </NFormItem>
              <NFormItem>
                <NButton type="primary" :loading="saving" @click="saveSetting">保存设置</NButton>
              </NFormItem>
            </NForm>
          </NCard>
        </NGi>
        <NGi :span="24">
          <NCard title="预览效果" :bordered="false">
            <div :style="previewStyle">
              <NText>这是编辑器预览效果，调整左侧设置可以实时查看字体大小和字体族变化。</NText>
            </div>
          </NCard>
          <NCard title="存储空间" :bordered="false" class="mt-16px">
            <NSpace vertical>
              <NStatistic v-for="stat in storageStats" :key="stat.label" :label="stat.label" :value="stat.value" />
            </NSpace>
          </NCard>
        </NGi>
      </NGrid>
    </NSpin>
  </NSpace>
</template>

<style scoped></style>
