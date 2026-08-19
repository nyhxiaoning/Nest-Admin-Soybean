<template>
  <header class="pe-nav">
    <!-- Brand button -->
    <button class="pe-nav-brand" aria-label="Works">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="6" fill="#1f2933"/>
        <path d="M8 10h12M8 14h8M8 18h10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Title bar -->
    <div class="pe-nav-titlebar">
      <ElInput
        v-if="isEditing"
        :model-value="displayTitle"
        size="small"
        class="pe-nav-title-input"
        @update:model-value="onTitleUpdate"
        @blur="onTitleBlur"
        @keydown.enter="onTitleBlur"
      />
      <ElButton
        v-else
        text
        class="pe-nav-title-display"
        @click="isEditing = true"
      >
        {{ displayTitle }}
      </ElButton>
      <span class="pe-nav-meta">{{ displayMeta }}</span>
    </div>

    <!-- Action buttons -->
    <div class="pe-nav-actions">
      <ElDropdown trigger="click" @command="handleImportCommand">
        <ElButton class="pe-nav-icon-btn">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          <span>Import</span>
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem command="static"> Import Static Image </ElDropdownItem>
            <ElDropdownItem command="gif"> Import GIF </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
      <ElDropdown trigger="click" @command="handleExportCommand">
        <ElButton class="pe-nav-icon-btn">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          <span>Export</span>
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem command="png"> Export PNG </ElDropdownItem>
            <ElDropdownItem command="gif"> Export GIF </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>

      <!-- Hidden file inputs -->
      <input
        ref="staticFileInputRef"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        @change="onStaticFileChange"
      />
      <input
        ref="gifFileInputRef"
        type="file"
        accept="image/gif,image/webp"
        hidden
        @change="onGifFileChange"
      />

      <ElButton class="pe-nav-action-btn" @click="$emit('preview')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        Preview
      </ElButton>
      <ElButton type="primary" class="pe-nav-action-btn" @click="$emit('save')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
          />
          <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
          <path d="M7 3v4a1 1 0 0 0 1 1h7" />
        </svg>
        Save
      </ElButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElInput, ElButton, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus'

const props = defineProps<{
  title?: string
  meta?: string
}>()

const displayTitle = computed(() => props.title ?? 'Untitled')
const displayMeta = computed(() => props.meta ?? '')

const emit = defineEmits<{
  'update:title': [value: string]
  preview: []
  save: []
  'import-static': [file: File]
  'import-gif': [file: File]
  'export-png': []
  'export-gif': []
}>()

const isEditing = ref(false)
const staticFileInputRef = ref()
const gifFileInputRef = ref()

const onTitleUpdate = (val: string) => {
  emit('update:title', val)
}

const onTitleBlur = () => {
  isEditing.value = false
}

const handleImportCommand = (cmd: string) => {
  if (cmd === 'static') {
    staticFileInputRef.value?.click()
  } else if (cmd === 'gif') {
    gifFileInputRef.value?.click()
  }
}

const handleExportCommand = (cmd: string) => {
  emit(cmd === 'png' ? 'export-png' : ('export-gif' as any))
}

const onStaticFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('import-static', file)
  input.value = ''
}

const onGifFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('import-gif', file)
  input.value = ''
}
</script>

<style scoped>
.pe-nav {
  height: 57px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  background: #fff;
  border-bottom: 1px solid #e3e7eb;
  position: sticky;
  top: 0;
  z-index: 12;
}

.pe-nav-brand {
  height: 40px;
  width: 40px;
  border: 0;
  background: transparent;
  color: #1f2933;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.pe-nav-brand:hover {
  background: #f3f5f7;
}

.pe-nav-titlebar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.pe-nav-title-display {
  height: 36px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #20242b;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 10px;
  font-size: 14px;
  font-weight: 500;
}

.pe-nav-title-display:hover {
  background: #f8f9fb;
  border-color: #e2e8f0;
}

.pe-nav-title-input {
  width: min(420px, 50vw);
}

.pe-nav-meta {
  color: #89909a;
  font-size: 14px;
  white-space: nowrap;
}

.pe-nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pe-nav-icon-btn {
  height: 34px;
  min-width: 34px;
  border: 1px solid #e0e5ec;
  border-radius: 7px;
  background: #fff;
  color: #333b46;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 600;
}

.pe-nav-icon-btn:hover {
  background: #f5f7fa;
  border-color: #cfd8e4;
}

.pe-nav-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
