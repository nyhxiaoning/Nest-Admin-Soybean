<template>
  <section class="pe-panel pe-frames-panel">
    <div class="pe-frame-strip-head">
      <div class="pe-panel-title-row">
        <h2>动画帧</h2>
        <button type="button" class="pe-primary pe-small" @click="addFrame">新增</button>
      </div>
      <div class="pe-button-row">
        <button type="button" class="pe-secondary" @click="duplicateFrame">复制</button>
        <button type="button" class="pe-danger-outline" @click="deleteFrame">删除</button>
      </div>
      <button type="button" class="pe-danger-outline pe-wide" @click="deleteAllFrames">删除全部</button>
    </div>

    <div class="pe-frames-list">
      <button
        v-for="(frame, index) in frames"
        :key="frame.id"
        type="button"
        class="pe-frame-item"
        :class="{
          active: currentFrameIndex === index,
          dragging: draggingFrameIndex === index,
          'drag-over': dragOverFrameIndex === index,
        }"
        draggable="true"
        @click="selectFrame(index)"
        @dragstart="startFrameDrag(index, $event)"
        @dragover.prevent="dragOverFrame(index, $event)"
        @dragleave="dragOverFrameIndex = null"
        @drop.prevent="dropFrame(index)"
        @dragend="endFrameDrag"
      >
        <canvas
          :ref="(el) => setFrameThumb(frame.id, el)"
          width="96"
          height="48"
        ></canvas>
        <span>第 {{ index + 1 }} 帧</span>
      </button>
    </div>
  </section>

  <div class="pe-panel pe-frame-settings-bar">
    <div class="pe-control-row">
      <label>当前帧间隔</label>
      <input
        type="number"
        min="20"
        max="5000"
        step="10"
        :value="frameDelayInput"
        @blur="commitFrameDelay"
        @change="commitFrameDelay"
        @keydown.enter="commitFrameDelay"
      />
      <span>ms</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Frame } from '@/modules/pixel-editor/core';

interface Props {
  frames?: Frame[];
  currentFrameIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  frames: () => [],
  currentFrameIndex: 0,
});

const emit = defineEmits<{
  'update:currentFrameIndex': [index: number];
  addFrame: [];
  duplicateFrame: [];
  deleteFrame: [];
  deleteAllFrames: [];
  selectFrame: [index: number];
  reorderFrame: [from: number, to: number];
  commitFrameDelay: [delay: number];
}>();

// Reactive state
const frameThumbCanvases = ref<Record<string, HTMLCanvasElement>>({});
const frameDelayInput = ref('120');
const draggingFrameIndex = ref<number | null>(null);
const dragOverFrameIndex = ref<number | null>(null);

// Computed
const currentFrame = computed(() => props.frames[props.currentFrameIndex]);

// Methods
const setFrameThumb = (frameId: string, el: HTMLCanvasElement | null) => {
  if (el) {
    frameThumbCanvases.value[frameId] = el;
  } else {
    delete frameThumbCanvases.value[frameId];
  }
};

const renderFrameThumb = (frameId: string, pixels: (string | null)[]) => {
  const canvas = frameThumbCanvases.value[frameId];
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cw = canvas.width / 32;
  const ch = canvas.height / 16;
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      const color = pixels[y * 32 + x];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw), Math.ceil(ch));
    }
  }
};

const renderAllThumbs = (frames: Frame[]) => {
  frames.forEach((frame) => {
    const pixels = frame.layers
      .map((layer) => layer.pixels)
      .reduce((acc, layerPixels) => {
        return layerPixels.map((color, i) => (color ? color : acc[i]));
      }, Array(512).fill(null));
    renderFrameThumb(frame.id, pixels);
  });
};

const selectFrame = (index: number) => {
  emit('selectFrame', index);
};

const addFrame = () => emit('addFrame');
const duplicateFrame = () => emit('duplicateFrame');
const deleteFrame = () => emit('deleteFrame');
const deleteAllFrames = () => emit('deleteAllFrames');

// Drag and drop
const startFrameDrag = (index: number, event: DragEvent) => {
  draggingFrameIndex.value = index;
  dragOverFrameIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
};

const dragOverFrame = (index: number, event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverFrameIndex.value = index;
};

const dropFrame = (index: number) => {
  const from = draggingFrameIndex.value;
  endFrameDrag();
  if (from === null || from === index) return;
  emit('reorderFrame', from, index);
};

const endFrameDrag = () => {
  draggingFrameIndex.value = null;
  dragOverFrameIndex.value = null;
};

// Frame delay
const commitFrameDelay = () => {
  const delay = Math.max(20, Math.min(5000, Number(frameDelayInput.value) || 120));
  frameDelayInput.value = String(delay);
  emit('commitFrameDelay', delay);
};

// Watch for frame changes
watch(
  () => props.currentFrameIndex,
  () => {
    if (currentFrame.value) {
      frameDelayInput.value = String(currentFrame.value.delay || 120);
    }
  }
);

// Expose
defineExpose({
  frameThumbCanvases,
  renderFrameThumb,
  renderAllThumbs,
  frameDelayInput,
});
</script>

<style scoped>
/* Component styles are in the main styles file */
</style>
