<template>
  <div class="pe-canvas-layer-row">
    <!-- Canvas Stage -->
    <div class="pe-panel pe-canvas-stage">
      <div class="pe-canvas-coordinate" aria-live="polite">
        <span v-if="hoverPoint">({{ hoverPoint.x }}, {{ hoverPoint.y }})</span>
        <span v-else>&nbsp;</span>
      </div>
      <canvas
        ref="editorCanvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerLeave"
      ></canvas>
    </div>

    <!-- Layers Panel -->
    <section class="pe-panel pe-layers-panel">
      <div class="pe-panel-title-row">
        <h2>图层</h2>
        <button
          type="button"
          class="pe-primary pe-small"
          :disabled="currentFrame?.layers?.length >= 4"
          @click="addLayer"
        >
          新增
        </button>
      </div>

      <div class="pe-layer-list">
        <div
          v-for="(layer, index) in currentFrame?.layers"
          :key="layer.id"
          role="button"
          tabindex="0"
          class="pe-layer-item"
          :class="{ active: activeLayer === index }"
          @click="selectLayer(index)"
        >
          <input
            type="checkbox"
            v-model="layer.visible"
            @click.stop
            @change="updateLayerSettings"
          />
          <span>{{ layer.name }}</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            v-model.number="layer.opacity"
            @click.stop
            @input="updateLayerSettings"
          />
          <button
            type="button"
            class="pe-danger-outline pe-mini"
            :disabled="currentFrame.layers.length <= 2"
            @click.stop="deleteLayer(index)"
          >
            删
          </button>
        </div>
      </div>

      <!-- Canvas Overview -->
      <div class="pe-canvas-overview">
        <div ref="overviewScroll" class="pe-overview-scroll">
          <canvas
            ref="overviewCanvas"
            :width="overviewCanvasSize"
            :height="overviewCanvasSize"
            :style="{
              width: `${overviewCanvasSize}px`,
              height: `${overviewCanvasSize}px`,
            }"
            @pointerdown="jumpViewportFromOverview"
            @pointermove="overviewPointerMove"
            @pointerleave="overviewPointerLeave"
          ></canvas>
        </div>
        <div class="pe-overview-actions">
          <label class="pe-overview-zoom-control">
            <span>缩放 {{ overviewZoom.toFixed(2) }}x</span>
            <input
              type="range"
              min="1"
              max="16"
              step="0.25"
              :value="overviewZoom"
              @input="setOverviewZoom($event.target.value)"
            />
          </label>
          <button type="button" class="pe-secondary" @click="saveOverviewPng">保存</button>
          <span class="pe-overview-coordinate" v-if="hoverOverviewPoint">
            ({{ hoverOverviewPoint.x }}, {{ hoverOverviewPoint.y }})
          </span>
          <span class="pe-overview-coordinate" v-else>&nbsp;</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  WIDTH,
  HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_VIEWPORT_X,
  DEFAULT_VIEWPORT_Y,
  compositeFrame,
  clampViewportX,
  clampViewportY,
  syncFrameCanvasFromVisible,
  refreshLayerVisibleFromCanvas,
} from '@/modules/pixel-editor/core';
import { downloadBlob } from '@/modules/pixel-editor/core/download';

interface Props {
  currentFrame?: any;
  activeLayer?: number;
  currentViewportX?: number;
  currentViewportY?: number;
  overviewZoom?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  activeLayer: 0,
  overviewZoom: 1,
  canvasWidth: 960,
  canvasHeight: 480,
});

const emit = defineEmits<{
  'update:activeLayer': [index: number];
  'update:currentViewportX': [x: number];
  'update:currentViewportY': [y: number];
  'update:overviewZoom': [zoom: number];
  hoverPoint: [point: { x: number; y: number } | null];
  overviewHoverPoint: [point: { x: number; y: number } | null];
}>();

// Refs
const editorCanvas = ref<HTMLCanvasElement>();
const overviewCanvas = ref<HTMLCanvasElement>();
const overviewScroll = ref<HTMLDivElement>();

const overviewCanvasSize = computed(() => CANVAS_WIDTH * props.overviewZoom);
const hoverPoint = ref<{ x: number; y: number } | null>(null);
const hoverOverviewPoint = ref<{ x: number; y: number } | null>(null);

// Canvas point calculation
const canvasPoint = (event: PointerEvent): { x: number; y: number; index: number; worldX: number; worldY: number } | null => {
  const canvas = editorCanvas.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * WIDTH);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * HEIGHT);
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null;
  return {
    x,
    y,
    index: y * WIDTH + x,
    worldX: props.currentViewportX + x,
    worldY: props.currentViewportY + y,
  };
};

// Canvas event handlers
const onPointerDown = (event: PointerEvent) => emit('pointerdown', event);
const onPointerMove = (event: PointerEvent) => {
  const point = canvasPoint(event);
  hoverPoint.value = point;
  emit('hoverPoint', point);
  emit('pointermove', event);
};
const onPointerUp = (event: PointerEvent) => emit('pointerup', event);
const onPointerLeave = () => {
  hoverPoint.value = null;
  emit('hoverPoint', null);
  emit('pointerleave');
};

// Overview canvas
const overviewPoint = (event: PointerEvent): { x: number; y: number } | null => {
  const canvas = overviewCanvas.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT);
  if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return null;
  return { x, y };
};

const overviewPointerMove = (event: PointerEvent) => {
  hoverOverviewPoint.value = overviewPoint(event);
  emit('overviewHoverPoint', hoverOverviewPoint.value);
};

const overviewPointerLeave = () => {
  hoverOverviewPoint.value = null;
  emit('overviewHoverPoint', null);
};

const jumpViewportFromOverview = (event: PointerEvent) => {
  const canvas = overviewCanvas.value;
  if (!canvas || !props.currentFrame) return;
  event.preventDefault();
  const point = overviewPoint(event);
  if (!point) return;
  emit('jumpViewport', point);
};

const setOverviewZoom = (value: string) => {
  const zoom = Number(value);
  emit('update:overviewZoom', Math.max(1, Math.min(16, Number.isFinite(zoom) ? zoom : 1)));
};

const saveOverviewPng = () => {
  emit('saveOverviewPng');
};

const selectLayer = (index: number) => emit('update:activeLayer', index);
const updateLayerSettings = () => emit('layerSettingsUpdated');

// Expose methods
defineExpose({
  editorCanvas,
  overviewCanvas,
  overviewScroll,
  canvasPoint,
  canvasSize: computed(() => ({ width: props.canvasWidth, height: props.canvasHeight })),
  overviewCanvasSize,
  renderOverview: () => emit('renderOverview'),
});
</script>

<style scoped>
/* Component styles are in the main styles file */
</style>
