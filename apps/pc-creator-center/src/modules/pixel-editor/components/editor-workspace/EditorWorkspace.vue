<template>
  <section class="pe-workspace">
    <CanvasLayout
      :width="canvasWidth"
      :height="canvasHeight"
      :zoom="zoom"
      :pixels="pixels"
      :layers="layers"
      :active-layer-index="activeLayerIndex"
      :hover-point="hoverPoint"
      @addLayer="$emit('add-layer')"
      @selectLayer="$emit('select-layer', $event)"
      @deleteLayer="$emit('delete-layer', $event)"
      @update:layer="$emit('update-layer', $event)"
      @wheel="onCanvasWheel"
    />
    <FramePanel
      :frames="frames"
      :current-frame-index="currentFrameIndex"
      :is-playing="isPlaying"
      :frame-delay="frameDelay"
      @select="$emit('select-frame', $event)"
      @add="$emit('add-frame')"
      @duplicate="$emit('duplicate-frame')"
      @delete="$emit('delete-frame')"
      @toggle-play="$emit('toggle-play')"
      @update:frame-delay="$emit('update:frame-delay', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CanvasLayout from './CanvasLayout.vue'
import FramePanel from './FramePanel.vue'

interface FrameData {
  id: string
  preview?: string
}

interface Layer {
  id: string
  name: string
  visible: boolean
  opacity: number
}

defineProps<{
  canvasWidth?: number
  canvasHeight?: number
  zoom?: number
  pixels?: (string | null)[][]
  frames?: FrameData[]
  currentFrameIndex?: number
  isPlaying?: boolean
  frameDelay?: number
  layers?: Layer[]
  activeLayerIndex?: number
  hoverPoint?: { x: number; y: number } | null
}>()

const emit = defineEmits<{
  'add-layer': []
  'select-layer': [index: number]
  'delete-layer': [index: number]
  'update-layer': [layer: Layer]
  'select-frame': [index: number]
  'add-frame': []
  'duplicate-frame': []
  'delete-frame': []
  'toggle-play': []
  'update:frame-delay': [value: number]
  'canvas-wheel': [event: WheelEvent]
}>()

const onCanvasWheel = (e: WheelEvent) => {
  emit('canvas-wheel', e)
}
</script>

<style scoped>
.pe-workspace {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 14px;
}
</style>
