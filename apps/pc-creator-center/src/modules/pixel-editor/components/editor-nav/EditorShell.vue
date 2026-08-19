<template>
  <div class="pe-shell pe-theme-host">
    <EditorNav
      :title="title"
      :meta="meta"
      @update:title="$emit('update:title', $event)"
      @preview="$emit('preview')"
      @save="$emit('save')"
      @import-static="$emit('import-static', $event)"
      @import-gif="$emit('import-gif', $event)"
      @export-png="$emit('export-png')"
      @export-gif="$emit('export-gif')"
    />
    <EditorBody
      :active-tool="activeTool"
      :current-color="currentColor"
      :alpha="alpha"
      :shape-type="shapeType"
      :shape-fill="shapeFill"
      :onion-skin="onionSkin"
      :gradient-mode="gradientMode"
      :gradient-dither="gradientDither"
      :text-config="textConfig"
      :export-scale="exportScale"
      :canvas-width="canvasWidth"
      :canvas-height="canvasHeight"
      :zoom="zoom"
      :pixels="pixels"
      :frames="frames"
      :current-frame-index="currentFrameIndex"
      :is-playing="isPlaying"
      :frame-delay="frameDelay"
      :layers="layers"
      :active-layer-index="activeLayerIndex"
      :hover-point="hoverPoint"
      @select-tool="$emit('select-tool', $event)"
      @update:current-color="$emit('update:currentColor', $event)"
      @update:alpha="$emit('update:alpha', $event)"
      @update:shapeType="$emit('update:shapeType', $event)"
      @update:shapeFill="$emit('update:shapeFill', $event)"
      @update:onionSkin="$emit('update:onionSkin', $event)"
      @update:gradientMode="$emit('update:gradientMode', $event)"
      @update:gradientDither="$emit('update:gradientDither', $event)"
      @update:textConfig="$emit('update:textConfig', $event)"
      @update:exportScale="$emit('update:exportScale', $event)"
      @copy-selection="$emit('copy-selection', $event)"
      @delete-selection="$emit('delete-selection')"
      @transform="$emit('transform', $event)"
      @undo="$emit('undo')"
      @redo="$emit('redo')"
      @clear-layer="$emit('clear-layer')"
      @stamp-text="$emit('stamp-text', $event)"
      @addLayer="$emit('add-layer')"
      @selectLayer="$emit('select-layer', $event)"
      @deleteLayer="$emit('delete-layer', $event)"
      @update:layer="$emit('update-layer', $event)"
      @select-frame="$emit('select-frame', $event)"
      @add-frame="$emit('add-frame')"
      @duplicate-frame="$emit('duplicate-frame')"
      @delete-frame="$emit('delete-frame')"
      @toggle-play="$emit('toggle-play')"
      @update:frame-delay="$emit('update:frame-delay', $event)"
      @canvas-wheel="$emit('canvas-wheel', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import EditorNav from './EditorNav.vue'
import EditorBody from '../editor-workspace/EditorBody.vue'

defineProps<{
  title?: string
  meta?: string
  activeTool?: string
  currentColor?: string
  alpha?: number
  shapeType?: string
  shapeFill?: string
  onionSkin?: {
    enabled: boolean
    colorMode: 'real' | 'tint'
    prevOpacity: number
    nextOpacity: number
  }
  gradientMode?: 'linear' | 'radial'
  gradientDither?: string
  textConfig?: {
    text: string
    size: number
    widthMode: 'proportional' | 'monospaced'
    align: number
  }
  exportScale?: number
  canvasWidth?: number
  canvasHeight?: number
  zoom?: number
  pixels?: (string | null)[][]
  frames?: { id: string; preview?: string }[]
  currentFrameIndex?: number
  isPlaying?: boolean
  frameDelay?: number
  layers?: { id: string; name: string; visible: boolean; opacity: number }[]
  activeLayerIndex?: number
  hoverPoint?: { x: number; y: number } | null
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  preview: []
  save: []
  'import-static': [file: File]
  'import-gif': [file: File]
  'export-png': []
  'export-gif': []
  'select-tool': [toolId: string]
  'update:currentColor': [color: string]
  'update:alpha': [alpha: number]
  'update:shapeType': [value: string]
  'update:shapeFill': [value: string]
  'update:onionSkin': [config: any]
  'update:gradientMode': [mode: string]
  'update:gradientDither': [value: string]
  'update:textConfig': [config: any]
  'update:exportScale': [scale: number]
  'copy-selection': [cut: boolean]
  'delete-selection': []
  'transform': [action: string]
  undo: []
  redo: []
  'clear-layer': []
  'stamp-text': [align: number]
  'add-layer': []
  'select-layer': [index: number]
  'delete-layer': [index: number]
  'update-layer': [layer: any]
  'select-frame': [index: number]
  'add-frame': []
  'duplicate-frame': []
  'delete-frame': []
  'toggle-play': []
  'update:frame-delay': [value: number]
  'canvas-wheel': [event: WheelEvent]
}>()
</script>

<style scoped>
.pe-shell {
  min-width: 1120px;
  min-height: 100vh;
  background: #eef1f4;
}
</style>
