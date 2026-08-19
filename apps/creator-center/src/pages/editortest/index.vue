<template>
  <EditorShell
    title="Test Project"
    meta="1 frame · 2 layers"
    :current-color="currentColor"
    :alpha="alpha"
    :shape-type="shapeType"
    :shape-fill="shapeFill"
    :onion-skin="onionSkin"
    :gradient-mode="gradientMode"
    :gradient-dither="gradientDither"
    :text-config="textConfig"
    :export-scale="exportScale"
    :zoom="zoom"
    :frames="frames"
    :current-frame-index="currentFrameIndex"
    :frame-delay="frameDelay"
    :layers="layers"
    :active-layer-index="activeLayerIndex"
    @select-tool="onSelectTool"
    @update:current-color="onColorChange"
    @update:alpha="onAlphaChange"
    @update:shape-type="onShapeTypeChange"
    @update:shape-fill="onShapeFillChange"
    @update:onion-skin="onOnionSkinChange"
    @update:gradient-mode="onGradientModeChange"
    @update:gradient-dither="onGradientDitherChange"
    @update:text-config="onTextConfigChange"
    @update:export-scale="onExportScaleChange"
    @copy-selection="onCopySelection"
    @delete-selection="onDeleteSelection"
    @transform="onTransform"
    @undo="onUndo"
    @redo="onRedo"
    @clear-layer="onClearLayer"
    @stamp-text="onStampText"
    @import-static="onImportStatic"
    @import-gif="onImportGif"
    @export-png="onExportPng"
    @export-gif="onExportGif"
    @add-layer="onAddLayer"
    @select-layer="onSelectLayer"
    @delete-layer="onDeleteLayer"
    @update-layer="onUpdateLayer"
    @select-frame="onSelectFrame"
    @add-frame="onAddFrame"
    @duplicate-frame="onDuplicateFrame"
    @delete-frame="onDeleteFrame"
    @toggle-play="onTogglePlay"
    @update:frame-delay="onFrameDelayChange"
    @canvas-wheel="onCanvasWheel"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import EditorShell from '@/modules/pixel-editor/components/editor-nav/EditorShell.vue'

interface FrameData {
  id: string
  preview?: string
}

interface LayerData {
  id: string
  name: string
  visible: boolean
  opacity: number
}

// Tool state
const currentColor = ref('#FFC000')
const alpha = ref(1)
const activeTool = ref('brush')
const shapeType = ref('rectangle')
const shapeFill = ref('filled')

// Onion skin
const onionSkin = ref({
  enabled: false,
  colorMode: 'real' as const,
  prevOpacity: 0.4,
  nextOpacity: 0.3,
})

// Gradient
const gradientMode = ref<'linear' | 'radial'>('linear')
const gradientDither = ref('none')

// Text
const textConfig = ref({
  text: 'PIXEL',
  size: 8,
  widthMode: 'proportional' as const,
  align: 0,
})

// Export
const exportScale = ref(1)

// Canvas
const zoom = ref(1)

// Frames
const frames = ref<FrameData[]>([
  { id: 'frame-1', preview: '#34d27f' },
  { id: 'frame-2', preview: '#f83c72' },
])
const currentFrameIndex = ref(0)
const isPlaying = ref(false)
const frameDelay = ref(120)

// Layers
const layers = ref<LayerData[]>([
  { id: 'layer-1', name: 'Layer 1', visible: true, opacity: 1 },
  { id: 'layer-2', name: 'Layer 2', visible: true, opacity: 0.86 },
])
const activeLayerIndex = ref(0)

// --- Event handlers ---
const onSelectTool = (toolId: string) => {
  activeTool.value = toolId
  console.log('select tool:', toolId)
}

const onColorChange = (color: string) => {
  currentColor.value = color
}

const onAlphaChange = (val: number) => {
  alpha.value = val
}

const onShapeTypeChange = (val: string) => {
  shapeType.value = val
}

const onShapeFillChange = (val: string) => {
  shapeFill.value = val
}

const onOnionSkinChange = (config: typeof onionSkin.value) => {
  onionSkin.value = config
}

const onGradientModeChange = (mode: string) => {
  if (mode === 'linear' || mode === 'radial') {
    gradientMode.value = mode
  }
}

const onGradientDitherChange = (val: string) => {
  gradientDither.value = val
}

const onTextConfigChange = (config: typeof textConfig.value) => {
  textConfig.value = config
}

const onExportScaleChange = (scale: number) => {
  exportScale.value = scale
}

const onCopySelection = (cut: boolean) => {
  console.log(cut ? 'cut selection' : 'copy selection')
}

const onDeleteSelection = () => {
  console.log('delete selection')
}

const onTransform = (action: string) => {
  console.log('transform:', action)
}

const onUndo = () => console.log('undo')
const onRedo = () => console.log('redo')
const onClearLayer = () => console.log('clear layer')
const onStampText = (align: number) => console.log('stamp text align:', align)
const onImportStatic = (file: File) => console.log('import static:', file.name)
const onImportGif = (file: File) => console.log('import gif:', file.name)
const onExportPng = () => console.log('export png')
const onExportGif = () => console.log('export gif')

const onAddLayer = () => {
  layers.value.push({
    id: `layer-${Date.now()}`,
    name: `Layer ${layers.value.length + 1}`,
    visible: true,
    opacity: 1,
  })
}

const onSelectLayer = (index: number) => {
  activeLayerIndex.value = index
}

const onDeleteLayer = (index: number) => {
  if (layers.value.length > 2) {
    layers.value.splice(index, 1)
    if (activeLayerIndex.value >= layers.value.length) {
      activeLayerIndex.value = layers.value.length - 1
    }
  }
}

const onUpdateLayer = (layer: any) => {
  const idx = layers.value.findIndex((l: any) => l.id === layer.id)
  if (idx !== -1) layers.value[idx] = layer
}

const onSelectFrame = (index: number) => {
  currentFrameIndex.value = index
}

const onAddFrame = () => {
  frames.value.push({ id: `frame-${Date.now()}` })
}

const onDuplicateFrame = () => {
  const frame = frames.value[currentFrameIndex.value]
  frames.value.splice(currentFrameIndex.value + 1, 0, { ...frame, id: `frame-${Date.now()}`, preview: frame.preview })
}

const onDeleteFrame = () => {
  if (frames.value.length > 1) {
    frames.value.splice(currentFrameIndex.value, 1)
    if (currentFrameIndex.value >= frames.value.length) {
      currentFrameIndex.value = frames.value.length - 1
    }
  }
}

const onTogglePlay = () => {
  isPlaying.value = !isPlaying.value
}

const onFrameDelayChange = (val: number) => {
  frameDelay.value = val
}

const onCanvasWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  zoom.value = Math.max(0.25, Math.min(4, zoom.value + delta))
}
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
</style>
