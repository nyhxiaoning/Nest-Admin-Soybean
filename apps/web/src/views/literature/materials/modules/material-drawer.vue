<script setup lang="tsx">
import { NButton, NCard, NDrawer, NForm, NFormItem, NInput, NRadioGroup, NRadioButton, NSpace, NText } from 'naive-ui';
import { onMounted, ref, watch } from 'vue';
import { fetchMaterialCreate, fetchMaterialDetail, fetchMaterialUpdate } from '@/service/api';
import type { Api } from '@/typings/api';

const props = defineProps<{
  visible: boolean;
  materialId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'submitted'): void;
}>();

const loading = ref(false);
const saving = ref(false);
const form = ref<{ type: '0' | '1' | '2'; content: string; source: string }>({
  type: '0',
  content: '',
  source: '',
});

const typeOptions = [
  { label: '短句', value: '0' },
  { label: '金句', value: '1' },
  { label: '典故', value: '2' },
];

function resetForm() {
  form.value = { type: '0', content: '', source: '' };
}

async function loadMaterial() {
  resetForm();
  if (!props.materialId) return;
  loading.value = true;
  try {
    const { data } = await fetchMaterialDetail(props.materialId);
    if (data) {
      form.value = {
        type: data.type,
        content: data.content,
        source: data.source || '',
      };
    }
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (!form.value.content.trim()) return;
  saving.value = true;
  try {
    const payload = {
      type: form.value.type,
      content: form.value.content.trim(),
      source: form.value.source.trim() || undefined,
    };
    if (props.materialId) {
      await fetchMaterialUpdate({ materialId: props.materialId, ...payload });
    } else {
      await fetchMaterialCreate(payload);
    }
    emit('submitted');
  } finally {
    saving.value = false;
  }
}

watch(() => props.visible, (val) => {
  if (val) loadMaterial();
});

onMounted(() => {
  if (props.visible) loadMaterial();
});
</script>

<template>
  <NDrawer
    :show="visible"
    :width="420"
    placement="right"
    @update:show="(v: boolean) => emit('update:visible', v)"
  >
    <NSpace vertical :size="16" class="p-16px">
      <NText :depth="1" class="text-16px font-bold">{{ materialId ? '编辑素材' : '新增素材' }}</NText>
      <NForm :model="form" label-placement="top" :show-feedback="false">
        <NFormItem label="类型">
          <NRadioGroup v-model:value="form.type">
            <NRadioButton v-for="opt in typeOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem label="内容">
          <NInput v-model:value="form.content" type="textarea" :rows="6" placeholder="请输入素材内容（短句 / 金句 / 典故）" />
        </NFormItem>
        <NFormItem label="出处">
          <NInput v-model:value="form.source" placeholder="如：李白·行路难（可选）" />
        </NFormItem>
        <NFormItem>
          <NSpace>
            <NButton type="primary" :loading="saving" @click="handleSubmit">保存</NButton>
            <NButton @click="emit('update:visible', false)">取消</NButton>
          </NSpace>
        </NFormItem>
      </NForm>
    </NSpace>
  </NDrawer>
</template>

<style scoped></style>
