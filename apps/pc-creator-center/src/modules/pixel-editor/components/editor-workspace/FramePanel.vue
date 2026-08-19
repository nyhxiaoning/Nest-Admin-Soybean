<template>
  <section class="pe-frame-panel">
    <div class="pe-frame-actions">
      <strong>Animation frames</strong>
      <div class="pe-frame-icon-row">
        <ElTooltip content="Play" placement="top">
          <ElButton
            :type="isPlaying ? 'success' : 'default'"
            class="pe-frame-icon"
            :class="{ 'play-active': isPlaying }"
            @click="$emit('toggle-play')"
          >
            <svg v-if="!isPlaying" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Add" placement="top">
          <ElButton type="success" class="pe-frame-icon" @click="$emit('add')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Duplicate" placement="top">
          <ElButton class="pe-frame-icon" @click="$emit('duplicate')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Delete" placement="top">
          <ElButton type="danger" plain class="pe-frame-icon" @click="$emit('delete')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </ElButton>
        </ElTooltip>
      </div>
      <div class="pe-frame-interval">
        <span>Frame interval</span>
        <ElInputNumber
          :model-value="frameDelay"
          :min="20"
          :max="5000"
          :step="10"
          size="small"
          controls-position="right"
          class="pe-interval-input"
          @update:model-value="$emit('update:frameDelay', $event)"
        />
        <span>ms</span>
      </div>
    </div>
    <div class="pe-frame-strip">
      <button
        v-for="(frame, index) in frames"
        :key="frame.id"
        class="pe-frame-card"
        :class="{ active: currentFrameIndex === index }"
        @click="$emit('select', index)"
      >
        <span :style="{ background: frame.preview ?? '#000', color: frame.preview ? '#fff' : '#ffd51d' }">
          {{ frame.preview ? '' : '\u{1F3AE}' }}
        </span>
        <strong>Frame {{ index + 1 }}</strong>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElButton, ElTooltip, ElInputNumber } from 'element-plus'

interface FrameData {
  id: string
  preview?: string
}

interface Props {
  frames?: FrameData[]
  currentFrameIndex?: number
  isPlaying?: boolean
  frameDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  frames: () => [],
  currentFrameIndex: 0,
  isPlaying: false,
  frameDelay: 120,
})

const emit = defineEmits<{
  select: [index: number]
  add: []
  duplicate: []
  delete: []
  'toggle-play': []
  'update:frameDelay': [value: number]
}>()
</script>

<style scoped>
.pe-frame-panel {
  min-height: 0;
  display: flex;
  gap: 14px;
  padding: 13px 13px 6px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e1e6ec;
  border-radius: 8px;
  box-shadow: 0 1px 2px #12224208;
}

.pe-frame-actions {
  width: 160px;
  flex: 0 0 160px;
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
  align-content: start;
  gap: 8px;
}

.pe-frame-actions strong {
  font-size: 13px;
}

.pe-frame-icon-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.pe-frame-icon {
  width: 30px;
  min-height: 30px !important;
  padding: 0 !important;
}

.pe-frame-icon :deep(.el-button__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-active {
  color: #fff !important;
  background: #35bd78 !important;
}

.play-active :deep(.el-button) {
  background-color: #35bd78 !important;
  border-color: #35bd78 !important;
}

.pe-frame-interval {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #687587;
  font-size: 12px;
}

.pe-frame-interval span {
  width: 96px;
  display: grid;
  grid-template-columns: 1fr 22px;
  align-items: center;
  gap: 4px;
}

.pe-interval-input {
  width: 60px;
}

.pe-interval-input :deep(input) {
  text-align: center;
  padding: 0 4px;
}

.pe-frame-strip {
  min-width: 0;
  flex: 1;
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 0 2px;
}

.pe-frame-card {
  width: 170px;
  min-width: 170px;
  height: 112px;
  border: 1px solid #e0e6ed;
  background: #f2f5f8;
  border-radius: 8px;
  padding: 9px 9px 5px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  color: #1e2a36;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.pe-frame-card span {
  display: block;
  width: 100%;
  aspect-ratio: 2 / 1;
  border-radius: 6px;
  background: #000;
  color: #ffd51d;
  font-size: 24px;
  line-height: 75px;
  overflow: hidden;
  text-align: left;
  padding-left: 8px;
  letter-spacing: 1px;
  white-space: nowrap;
}

.pe-frame-card strong {
  font-size: 15px;
  text-align: center;
  align-self: start;
  padding-bottom: 0;
}

.pe-frame-card.active {
  border-color: #50c891;
  background: #e2f8ee;
}
</style>
