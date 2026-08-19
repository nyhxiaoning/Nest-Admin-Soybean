<template>
  <section class="pe-panel pe-preview-panel">
    <div class="pe-panel-title-row">
      <h2>LED 预览</h2>
    </div>
    <button
      type="button"
      class="pe-secondary pe-preview-play-btn"
      @click="togglePreview"
    >
      {{ isPlaying ? '停止播放' : '播放全部帧' }}
    </button>
    <canvas ref="previewCanvas" :width="previewWidth" :height="previewHeight"></canvas>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { Frame, drawPixels, compositeFrame, EMPTY } from '@/modules/pixel-editor/core';

interface Props {
  frames?: Frame[];
  previewWidth?: number;
  previewHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  frames: () => [],
  previewWidth: 480,
  previewHeight: 240,
});

const emit = defineEmits<{
  previewUpdate: [pixels: (string | null)[]];
}>();

// Refs
const previewCanvas = ref<HTMLCanvasElement>();

// State
const isPlaying = ref(false);
const currentFrameIndex = ref(0);
let previewTimer: number | null = null;

// Methods
const togglePreview = () => {
  if (isPlaying.value) {
    stopPreview();
  } else {
    startPreview();
  }
};

const startPreview = () => {
  if (props.frames.length === 0) return;
  isPlaying.value = true;
  currentFrameIndex.value = 0;
  renderFrame();
};

const stopPreview = () => {
  isPlaying.value = false;
  currentFrameIndex.value = 0;
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  // Render current frame when stopped
  if (props.frames.length > 0) {
    renderFrame();
  }
};

const renderFrame = () => {
  if (!previewCanvas.value || !props.frames[currentFrameIndex.value]) return;

  const canvas = previewCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#05070b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pixels = compositeFrame(props.frames[currentFrameIndex.value]);
  const cw = canvas.width / 32;
  const ch = canvas.height / 16;
  const gap = Math.max(1, Math.floor(Math.min(cw, ch) * 0.08));

  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      const color = pixels[y * 32 + x];
      const px = x * cw;
      const py = y * ch;
      const innerX = px + gap;
      const innerY = py + gap;
      const innerW = Math.max(1, cw - gap * 2);
      const innerH = Math.max(1, ch - gap * 2);

      // Background
      ctx.fillStyle = '#101520';
      ctx.fillRect(px, py, cw, ch);

      if (!color || color === EMPTY) {
        ctx.fillStyle = '#070a10';
        ctx.fillRect(innerX, innerY, innerW, innerH);
        continue;
      }

      // Pixel color
      ctx.fillStyle = color;
      ctx.fillRect(innerX, innerY, innerW, innerH);

      // Glow effect
      const centerX = px + cw / 2;
      const centerY = py + ch / 2;
      const glowRadius = Math.min(innerW, innerH) * 0.48;

      ctx.fillStyle = mixWithWhite(color, 0.52);
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  emit('previewUpdate', pixels);

  // Schedule next frame
  if (isPlaying.value && currentFrameIndex.value < props.frames.length - 1) {
    const delay = props.frames[currentFrameIndex.value].delay;
    currentFrameIndex.value += 1;
    previewTimer = window.setTimeout(renderFrame, delay);
  } else {
    isPlaying.value = false;
  }
};

const mixWithWhite = (hex: string, amount: number): string => {
  const raw = hex.slice(1);
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel * (1 - amount) + 255 * amount).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
};

// Watch for frame changes
watch(
  () => props.frames,
  () => {
    if (!isPlaying.value && props.frames.length > 0) {
      currentFrameIndex.value = 0;
      renderFrame();
    }
  }
);

// Cleanup
onBeforeUnmount(() => {
  stopPreview();
});

// Expose
defineExpose({
  isPlaying,
  renderFrame,
  stopPreview,
  startPreview,
});
</script>

<style scoped>
/* Component styles are in the main styles file */
</style>
