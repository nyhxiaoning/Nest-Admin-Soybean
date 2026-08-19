<template>
  <div class="pe-canvas-layout">
    <!-- Canvas Panel -->
    <section class="pe-panel pe-canvas-panel">
      <div class="pe-canvas-meta">
        <span>Canvas W {{ width }}, H {{ height }}</span>
        <strong>Zoom {{ Math.round(zoom * 100) }}%</strong>
      </div>
      <div class="pe-canvas-viewport" @wheel.passive="onWheel">
        <div
          class="pe-pixel-canvas"
          :style="{ transform: `scale(${zoom})` }"
        >
          <template v-for="(row, rowIndex) in pixelRows" :key="rowIndex">
            <button
              v-for="(pixel, colIndex) in row"
              :key="colIndex"
              class="pe-pixel-btn"
              :aria-label="`Pixel ${rowIndex * width + colIndex + 1}`"
              :style="pixel ? { background: pixel } : {}"
            />
          </template>
        </div>
      </div>
      <!-- Coordinate overlay -->
      <div v-if="hoverPoint" class="pe-canvas-coordinate">
        <span>({{ hoverPoint.x }}, {{ hoverPoint.y }})</span>
      </div>
    </section>

    <!-- Layers Panel -->
    <LayersPanel
      :layers="layers"
      :active-layer-index="activeLayerIndex"
      @add-layer="$emit('add-layer')"
      @select-layer="$emit('select-layer', $event)"
      @delete-layer="$emit('delete-layer', $event)"
      @update:layer="$emit('update:layer', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LayersPanel from '../layers/LayersPanel.vue'

interface Layer {
  id: string
  name: string
  visible: boolean
  opacity: number
}

interface Props {
  width?: number
  height?: number
  zoom?: number
  pixels?: (string | null)[][]
  layers?: Layer[]
  activeLayerIndex?: number
  hoverPoint?: { x: number; y: number } | null
}

const props = withDefaults(defineProps<Props>(), {
  width: 32,
  height: 16,
  zoom: 1,
  pixels: () => [],
  layers: () => [],
  activeLayerIndex: 0,
  hoverPoint: null,
})

const emit = defineEmits<{
  addLayer: []
  selectLayer: [index: number]
  deleteLayer: [index: number]
  'update:layer': [layer: Layer]
  wheel: [event: WheelEvent]
}>()

const pixelRows = computed(() => {
  if (props.pixels.length === 0) {
    // Generate empty grid
    const rows: (string | null)[][] = []
    for (let r = 0; r < props.height; r++) {
      rows.push(new Array(props.width).fill(null))
    }
    return rows
  }
  return props.pixels
})

const onWheel = (e: WheelEvent) => {
  emit('wheel', e)
}
</script>

<style scoped>
.pe-canvas-layout {
  display: grid;
  grid-template-columns: minmax(620px, 1fr) 260px;
  gap: 14px;
  align-items: stretch;
  min-height: 0;
  height: 100%;
}

.pe-canvas-panel {
  padding: 13px;
  min-height: 0;
  display: grid;
  grid-template-rows: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  overflow: hidden;
  position: relative;
  background: #fff;
  border: 1px solid #e1e6ec;
  border-radius: 8px;
  box-shadow: 0 1px 2px #12224208;
}

.pe-canvas-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #7b8796;
  font-size: 12px;
}

.pe-canvas-meta strong {
  color: #27303b;
  font-weight: 600;
}

.pe-canvas-meta em {
  margin-left: auto;
  color: #16804e;
  font-style: normal;
}

.pe-canvas-viewport {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: auto;
}

.pe-pixel-canvas {
  width: 100%;
  aspect-ratio: 2 / 1;
  display: grid;
  grid-template-columns: repeat(32, minmax(0, 1fr));
  grid-template-rows: repeat(16, minmax(0, 1fr));
  gap: 1px;
  background: #303640;
  border: 1px solid #d6dee8;
  border-radius: 6px;
  overflow: hidden;
  transform-origin: center;
}

.pe-pixel-btn {
  min-width: 0;
  min-height: 0;
  border: 0;
  padding: 0;
  border-radius: 0;
  background: #05090f;
}

.pe-pixel-btn:hover {
  outline: 1px solid #77b7ff;
  outline-offset: -1px;
  z-index: 1;
}

.pe-canvas-coordinate {
  position: absolute;
  top: 54px;
  right: 20px;
  z-index: 4;
  height: 30px;
  border: 1px solid rgba(215, 223, 232, 0.88);
  border-radius: 999px;
  background: #ffffffeb;
  box-shadow: 0 8px 22px #0f172a1f;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  pointer-events: none;
}

.pe-canvas-coordinate span {
  color: #7b8796;
  font-size: 11px;
}

.pe-canvas-coordinate strong {
  color: #1f2732;
  font-size: 12px;
  font-weight: 600;
}
</style>
