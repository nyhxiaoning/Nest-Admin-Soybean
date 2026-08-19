<template>
  <aside class="pe-tools">
    <!-- Drawing Tools -->
    <section class="pe-tool-section pe-tool-section-drawing">
      <h2>Tools</h2>
      <div class="pe-tool-buttons">
        <ElTooltip
          v-for="tool in drawingTools"
          :key="tool.id"
          :content="tool.label"
          placement="right"
          :show-after="500"
        >
          <ElButton
            :type="activeTool === tool.id ? 'primary' : 'default'"
            class="pe-tool-icon-btn"
            :class="{ active: activeTool === tool.id }"
            @click="$emit('select-tool', tool.id)"
          >
            <span v-html="tool.icon" />
          </ElButton>
        </ElTooltip>
      </div>
      <div class="pe-color-picker-wrap">
        <div class="pe-compact-color-field">
          <ElInput
            :model-value="currentColor.toUpperCase()"
            size="small"
            class="pe-hex-input"
            @update:model-value="onColorInput"
          />
          <ElColorPicker
            :model-value="currentColor"
            size="small"
            class="pe-color-swatch"
            @change="onColorChange"
          />
          <ElInputNumber
            :model-value="alphaPercent"
            :min="0"
            :max="100"
            :step="1"
            size="small"
            class="pe-alpha-input"
            @update:model-value="onAlphaChange"
          >
            <template #suffix>%</template>
          </ElInputNumber>
        </div>
      </div>
    </section>

    <!-- Shapes -->
    <section class="pe-tool-section pe-tool-section-shape">
      <h2>Shapes</h2>
      <ElSelect
        :model-value="shapeType"
        size="small"
        class="pe-shape-select"
        @update:model-value="$emit('update:shapeType', $event)"
      >
        <ElOption label="Rectangle" value="rectangle" />
        <ElOption label="Square" value="square" />
        <ElOption label="Line" value="line" />
        <ElOption label="Ellipse" value="ellipse" />
        <ElOption label="Circle" value="circle" />
        <ElOption label="Triangle" value="triangle" />
      </ElSelect>
      <ElSelect
        :model-value="shapeFill"
        size="small"
        class="pe-shape-select"
        @update:model-value="$emit('update:shapeFill', $event)"
      >
        <ElOption label="Solid" value="filled" />
        <ElOption label="Hollow" value="outline" />
      </ElSelect>
    </section>

    <!-- Selection -->
    <section class="pe-tool-section pe-tool-section-transform">
      <h2>Selection</h2>
      <div class="pe-mode-tool-row">
        <ElTooltip content="Selection" placement="top">
          <ElButton
            :type="activeTool === 'select' ? 'primary' : 'default'"
            class="pe-icon-btn"
            @click="$emit('select-tool', 'select')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 4.1 12 6" /><path d="m5.1 8-2.9-.8" /><path d="m6 12-1.9 2" /><path d="M7.2 2.2 8 5.1" /><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Move" placement="top">
          <ElButton
            :type="activeTool === 'move' ? 'primary' : 'default'"
            class="pe-icon-btn"
            @click="$emit('select-tool', 'move')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20" /><path d="m15 19-3 3-3-3" /><path d="m19 9 3 3-3 3" /><path d="M2 12h20" /><path d="m5 9-3 3 3 3" /><path d="m9 5 3-3 3 3" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Magic wand" placement="top">
          <ElButton
            :type="activeTool === 'magic' ? 'primary' : 'default'"
            class="pe-icon-btn"
            @click="$emit('select-tool', 'magic')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" />
            </svg>
          </ElButton>
        </ElTooltip>
      </div>

      <!-- Transform operations -->
      <div class="pe-tool-buttons pe-icon-grid">
        <ElTooltip content="Copy" placement="top">
          <ElButton class="pe-icon-btn" @click="$emit('copy-selection', false)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Cut" placement="top">
          <ElButton class="pe-icon-btn" @click="$emit('copy-selection', true)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Erase" placement="top">
          <ElButton type="danger" plain class="pe-icon-btn" @click="$emit('delete-selection')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" />
            </svg>
          </ElButton>
        </ElTooltip>
      </div>
      <div class="pe-tool-buttons pe-icon-grid">
        <ElTooltip content="Rotate 5° CW" placement="top">
          <ElButton class="pe-icon-btn" @click="$emit('transform', 'rotate-cw')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Rotate 5° CCW" placement="top">
          <ElButton class="pe-icon-btn" @click="$emit('transform', 'rotate-ccw')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Flip X" placement="top">
          <ElButton class="pe-icon-btn" @click="$emit('transform', 'flip-h')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" /><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" /><path d="M12 20v2" /><path d="M12 14v2" /><path d="M12 8v2" /><path d="M12 2v2" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Flip Y" placement="top">
          <ElButton class="pe-icon-btn" @click="$emit('transform', 'flip-v')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" /><path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" /><path d="M4 12H2" /><path d="M10 12H8" /><path d="M16 12h-2" /><path d="M22 12h-2" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Undo" placement="top">
          <ElButton class="pe-icon-btn" @click="$emit('undo')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </ElButton>
        </ElTooltip>
        <ElTooltip content="Redo" placement="top">
          <ElButton class="pe-icon-btn" @click="$emit('redo')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 9 3-3 3 3" /><path d="M13 18H7a2 2 0 0 1-2-2V6" /><path d="m22 15-3 3-3-3" /><path d="M11 6h6a2 2 0 0 1 2 2v10" />
            </svg>
          </ElButton>
        </ElTooltip>
      </div>

      <!-- Clear layer -->
      <ElButton
        type="danger"
        plain
        class="pe-wide-tool pe-danger-wide"
        @click="$emit('clear-layer')"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m16 3 5 5-9.5 9.5a4 4 0 0 1-5.7 0l-.3-.3a4 4 0 0 1 0-5.7L16 3Z" /><path d="m14 5 5 5" /><path d="M4 21h10" /><path d="M7 18c0 1.7-1.3 3-3 3" />
        </svg>
      </ElButton>
    </section>

    <!-- Onion skin -->
    <section class="pe-tool-section pe-tool-section-appearance">
      <h2>Onion skin</h2>
      <ElCheckbox
        :model-value="onionSkin.enabled"
        label="Show adjacent frames"
        @change="onOnionSkinEnabledChange"
      />
      <ElSelect
        :model-value="onionSkin.colorMode"
        size="small"
        class="pe-full-width"
        @update:model-value="onOnionSkinColorModeChange"
      >
        <ElOption label="True color" value="real" />
        <ElOption label="Tint adjacent frames" value="tint" />
      </ElSelect>
      <div class="pe-range-row">
        <span>Previous opacity</span>
        <ElSlider
          :model-value="Math.round(onionSkin.prevOpacity * 100)"
          :min="0"
          :max="100"
          :step="5"
          size="small"
          class="pe-opacity-slider"
          @update:model-value="onPrevOpacityChange"
        />
        <span>{{ Math.round(onionSkin.prevOpacity * 100) }}%</span>
      </div>
      <div class="pe-range-row">
        <span>Next opacity</span>
        <ElSlider
          :model-value="Math.round(onionSkin.nextOpacity * 100)"
          :min="0"
          :max="100"
          :step="5"
          size="small"
          class="pe-opacity-slider"
          @update:model-value="onNextOpacityChange"
        />
        <span>{{ Math.round(onionSkin.nextOpacity * 100) }}%</span>
      </div>
    </section>

    <!-- Gradient tool -->
    <section class="pe-tool-section pe-tool-section-gradient">
      <h2>Gradient tool</h2>
      <div class="pe-gradient-mode-row">
        <ElButton
          :type="gradientMode === 'linear' ? 'primary' : 'default'"
          size="small"
          @click="$emit('update:gradientMode', 'linear')"
        >
          Linear Gradient
        </ElButton>
        <ElButton
          :type="gradientMode === 'radial' ? 'primary' : 'default'"
          size="small"
          @click="$emit('update:gradientMode', 'radial')"
        >
          Radial Gradient
        </ElButton>
      </div>
      <div class="pe-gradient-select">
        <span>Dithering</span>
        <ElSelect
          :model-value="gradientDither"
          size="small"
          class="pe-full-width"
          @update:model-value="$emit('update:gradientDither', $event)"
        >
          <ElOption label="No Dithering" value="none" />
          <ElOption label="Bayer Matrix 2x2" value="bayer2" />
          <ElOption label="Bayer Matrix 4x4" value="bayer4" />
          <ElOption label="Bayer Matrix 8x8" value="bayer8" />
        </ElSelect>
      </div>
      <div
        class="pe-gradient-preview"
        :class="`dither-${gradientDither}`"
      >
        <span />
      </div>
    </section>

    <!-- Pixel text -->
    <section class="pe-tool-section pe-tool-section-text">
      <h2>Pixel text</h2>
      <ElInput
        :model-value="textConfig.text"
        type="textarea"
        :rows="3"
        class="pe-text-input"
        @update:model-value="onTextChange"
      />
      <div class="pe-text-row">
        <ElInputNumber
          :model-value="textConfig.size"
          :min="1"
          size="small"
          controls-position="right"
          class="pe-font-size-input"
          @update:model-value="onTextSizeChange"
        />
        <ElSelect
          :model-value="textConfig.widthMode"
          size="small"
          class="pe-font-mode-select"
          @update:model-value="onTextWidthModeChange"
        >
          <ElOption label="Proportional" value="proportional" />
          <ElOption label="Monospace" value="monospaced" />
        </ElSelect>
      </div>
      <div class="pe-align-row">
        <ElButtonGroup>
          <ElButton
            v-for="(icon, idx) in textAlignIcons"
            :key="idx"
            size="small"
            :type="textConfig.align === idx ? 'primary' : 'default'"
            @click="$emit('stamp-text', idx)"
          >
            <span v-html="icon" />
          </ElButton>
        </ElButtonGroup>
      </div>
    </section>

    <!-- Import -->
    <section class="pe-tool-section">
      <h2>Import</h2>
      <ElButton
        class="pe-wide-btn"
        @click="onImportStatic"
      >
        Import Static Image
      </ElButton>
      <ElButton
        class="pe-wide-btn"
        @click="onImportGif"
      >
        Import GIF
      </ElButton>
    </section>

    <!-- Export -->
    <section class="pe-tool-section">
      <h2>Export</h2>
      <ElButtonGroup class="pe-export-row">
        <ElButton
          type="primary"
          @click="onExportPng"
        >
          PNG
        </ElButton>
        <ElButton
          type="primary"
          @click="onExportGif"
        >
          GIF
        </ElButton>
      </ElButtonGroup>
      <div class="pe-scale-row">
        <span>Scale</span>
        <ElSelect
          :model-value="exportScale"
          size="small"
          class="pe-scale-select"
          @update:model-value="$emit('update:exportScale', $event)"
        >
          <ElOption label="1x" :value="1" />
          <ElOption label="4x" :value="4" />
          <ElOption label="8x" :value="8" />
          <ElOption label="16x" :value="16" />
          <ElOption label="20x" :value="20" />
        </ElSelect>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Frame } from '@/modules/pixel-editor/core'
import {
  ElButton,
  ElTooltip,
  ElSelect,
  ElOption,
  ElInput,
  ElInputNumber,
  ElCheckbox,
  ElSlider,
  ElButtonGroup,
  ElColorPicker,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
} from 'element-plus'

interface DrawingTool {
  id: string
  label: string
  icon: string
}

interface OnionSkinConfig {
  enabled: boolean
  colorMode: 'real' | 'tint'
  prevOpacity: number
  nextOpacity: number
}

interface TextToolConfig {
  text: string
  size: number
  widthMode: 'proportional' | 'monospaced'
  align: number
}

const props = withDefaults(defineProps<{
  activeTool?: string
  currentColor?: string
  alpha?: number
  shapeType?: string
  shapeFill?: string
  onionSkin?: OnionSkinConfig
  gradientMode?: 'linear' | 'radial'
  gradientDither?: string
  textConfig?: TextToolConfig
  exportScale?: number
}>(), {
  activeTool: 'brush',
  currentColor: '#FFC000',
  alpha: 1,
  shapeType: 'rectangle',
  shapeFill: 'filled',
  onionSkin: () => ({
    enabled: false,
    colorMode: 'real',
    prevOpacity: 0.4,
    nextOpacity: 0.3,
  }),
  gradientMode: 'linear',
  gradientDither: 'none',
  textConfig: () => ({ text: 'PIXEL', size: 8, widthMode: 'proportional', align: 0 }),
  exportScale: 1,
})

const emit = defineEmits<{
  'select-tool': [toolId: string]
  'update:currentColor': [color: string]
  'update:alpha': [alpha: number]
  'update:shapeType': [value: string]
  'update:shapeFill': [value: string]
  'update:onionSkin': [config: OnionSkinConfig]
  'update:gradientMode': [mode: 'linear' | 'radial']
  'update:gradientDither': [value: string]
  'update:textConfig': [config: TextToolConfig]
  'update:exportScale': [scale: number]
  'copy-selection': [cut: boolean]
  'delete-selection': []
  'transform': [action: string]
  'undo': []
  'redo': []
  'clear-layer': []
  'stamp-text': [align: number]
  'import:static': []
  'import:gif': []
  'export:png': []
  'export:gif': []
}>()

const alphaPercent = computed(() => Math.round((props.alpha ?? 1) * 100))

const drawingTools: DrawingTool[] = [
  {
    id: 'brush',
    label: 'Brush',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>',
  },
  {
    id: 'eraser',
    label: 'Eraser',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>',
  },
  {
    id: 'fill',
    label: 'Fill',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/></svg>',
  },
  {
    id: 'picker',
    label: 'Picker',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>',
  },
  {
    id: 'gradient',
    label: 'Gradient tool',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>',
  },
]

const textAlignIcons = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="9" y1="12" y2="12"/><line x1="21" x2="17" y1="18" y2="18"/><line x1="11" x2="7" y1="18" y2="18"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="6"/><line x1="21" x2="3" y1="12" y2="12"/><line x1="18" x2="6" y1="18" y2="18"/><line x1="11" x2="7" y1="18" y2="18"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="13" y1="12" y2="12"/><line x1="21" x2="17" y1="18" y2="18"/><line x1="7" x2="13" y1="18" y2="18"/></svg>',
]

const onColorInput = (val: string | null) => {
  if (typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val)) {
    emit('update:currentColor', val)
  }
}

const onColorChange = (val: string | null) => {
  if (typeof val === 'string') {
    emit('update:currentColor', val)
  }
}

const onAlphaChange = (val: number | undefined) => {
  emit('update:alpha', (val ?? 100) / 100)
}

const onPrevOpacityChange = (val: number | number[]) => {
  const numVal = Array.isArray(val) ? val[0] : val
  emit('update:onionSkin', { ...props.onionSkin, prevOpacity: numVal / 100 })
}

const onNextOpacityChange = (val: number | number[]) => {
  const numVal = Array.isArray(val) ? val[0] : val
  emit('update:onionSkin', { ...props.onionSkin, nextOpacity: numVal / 100 })
}

const onOnionSkinEnabledChange = (val: boolean | string) => {
  emit('update:onionSkin', { ...props.onionSkin, enabled: !!val })
}

const onOnionSkinColorModeChange = (val: string) => {
  emit('update:onionSkin', { ...props.onionSkin, colorMode: val as 'real' | 'tint' })
}

const onTextChange = (val: string | null) => {
  if (val !== null) {
    emit('update:textConfig', { ...props.textConfig, text: val })
  }
}

const onTextSizeChange = (val: number | null) => {
  if (val !== null) {
    emit('update:textConfig', { ...props.textConfig, size: val })
  }
}

const onTextWidthModeChange = (val: string) => {
  emit('update:textConfig', { ...props.textConfig, widthMode: val as 'proportional' | 'monospaced' })
}

const onImportStatic = () => emit('import:static')
const onImportGif = () => emit('import:gif')
const onExportPng = () => emit('export:png')
const onExportGif = () => emit('export:gif')
</script>

<style scoped>
.pe-tools {
  display: grid;
  grid-template-rows:
    minmax(92px, 0.9fr) minmax(96px, 0.9fr) minmax(84px, 0.75fr) minmax(132px, 1.2fr)
    minmax(106px, 0.95fr) minmax(94px, 0.85fr);
  gap: 0;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  background: #fff;
  border: 1px solid #e1e6ec;
  border-radius: 8px;
  box-shadow: 0 1px 2px #12224208;
}

.pe-tool-section {
  display: grid;
  gap: 5px;
  padding: 7px 10px;
  border-bottom: 1px solid #dfe5ec;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.pe-tool-section:last-child {
  border-bottom: 0;
}

.pe-tool-section h2 {
  margin: 0;
  color: #1f2732;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 600;
}

/* Drawing tool buttons */
.pe-tool-buttons {
  display: grid;
  gap: 6px;
}

.pe-tool-buttons.pe-icon-grid {
  grid-template-columns: repeat(4, 1fr);
}

.pe-tool-buttons.pe-icon-grid :deep(.el-button) {
  min-height: 26px;
  padding: 0;
}

.pe-tool-icon-btn :deep(.el-button__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pe-icon-btn {
  min-height: 26px;
  padding: 0;
}

.pe-icon-btn :deep(.el-button__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Color picker */
.pe-color-picker-wrap {
  position: relative;
}

.pe-compact-color-field {
  width: 100%;
  height: 28px;
  border: 1px solid #d7dfe8;
  border-radius: 6px;
  background: #fff;
  color: #28313d;
  display: grid;
  grid-template-columns: 1fr 24px 52px;
  align-items: center;
  gap: 4px;
  padding: 0 3px 0 8px;
  font-size: 12px;
  font-weight: 500;
}

.pe-hex-input {
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  color: #28313d;
  padding: 0;
  font-size: 12px;
  font-weight: 500;
  outline: 0;
}

.pe-hex-input :deep(input) {
  padding: 0;
  border: none;
  font-size: 12px;
  height: 22px;
  background: transparent;
}

.pe-color-swatch {
  width: 22px;
  height: 22px;
}

.pe-color-swatch :deep(.el-color-picker__trigger) {
  width: 22px !important;
  height: 22px !important;
  padding: 2px !important;
  border: none !important;
}

.pe-alpha-input {
  height: 22px;
}

.pe-alpha-input :deep(.el-input__wrapper) {
  padding: 0 4px;
  min-height: 22px;
  box-shadow: none !important;
  border-left: 1px solid #e2e8f0;
  border-radius: 0;
}

.pe-alpha-input :deep(input) {
  font-size: 10px;
  text-align: center;
  padding: 0;
}

/* Mode tool row */
.pe-mode-tool-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.pe-mode-tool-row :deep(.el-button) {
  min-height: 28px;
}

/* Range row */
.pe-range-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #687587;
}

.pe-opacity-slider {
  flex: 1;
}

.pe-full-width {
  width: 100%;
}

/* Gradient section */
.pe-gradient-mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.pe-gradient-select {
  display: grid;
  grid-template-columns: 64px 1fr;
  align-items: center;
  gap: 7px;
  color: #687587;
  font-size: 12px;
}

.pe-gradient-preview {
  height: 28px;
  border: 1px solid #d7dfe8;
  border-radius: 7px;
  background: linear-gradient(90deg, #111, #fff);
  overflow: hidden;
}

.pe-gradient-preview span {
  display: block;
  width: 100%;
  height: 100%;
}

.pe-gradient-preview.dither-bayer2 span {
  background-image: radial-gradient(#111 1px, transparent 1px);
  background-size: 4px 4px;
  opacity: 0.35;
}

.pe-gradient-preview.dither-bayer4 span {
  background-image: radial-gradient(#111 1px, transparent 1px);
  background-size: 6px 6px;
  opacity: 0.45;
}

.pe-gradient-preview.dither-bayer8 span {
  background-image: radial-gradient(#111 1px, transparent 1px);
  background-size: 8px 8px;
  opacity: 0.5;
}

/* Text section */
.pe-text-input {
  min-height: 32px;
}

.pe-text-row {
  display: grid;
  grid-template-columns: 58px 1fr;
  align-items: center;
  gap: 8px;
  color: #687587;
  font-size: 12px;
}

.pe-font-size-input {
  width: 58px;
}

.pe-font-mode-select {
  width: 100%;
}

.pe-align-row {
  display: flex;
  justify-content: center;
}

/* Buttons */
.pe-wide-btn {
  width: 100%;
}

.pe-export-row {
  width: 100%;
  display: flex;
}

.pe-export-row :deep(.el-button) {
  flex: 1;
}

.pe-scale-row {
  display: grid;
  grid-template-columns: 58px 1fr;
  align-items: center;
  gap: 8px;
  color: #687587;
  font-size: 12px;
}

.pe-scale-select {
  width: 100%;
}

/* Shape section */
.pe-shape-select {
  width: 100%;
}
</style>
