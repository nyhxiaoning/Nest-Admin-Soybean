<template>
  <aside class="pe-panel pe-tools-panel">
    <!-- Drawing Tools -->
    <section>
      <h2>工具</h2>
      <div class="pe-tool-grid" role="toolbar">
        <button
          v-for="tool in drawingTools"
          :key="tool.id"
          type="button"
          class="pe-tool"
          :class="{ active: activeTool === tool.id }"
          @click="selectTool(tool.id)"
          :title="tool.label"
        >
          {{ tool.label }}
        </button>
      </div>

      <!-- Color Picker -->
      <div class="pe-control-row">
        <label>颜色</label>
        <input type="color" v-model="currentColor" />
        <input class="pe-hex-input" v-model="currentColor" maxlength="7" />
      </div>

      <!-- Color Palette -->
      <div class="pe-palette">
        <button
          v-for="color in palette"
          :key="color"
          type="button"
          class="pe-swatch"
          :class="{ active: color === currentColor }"
          :style="{ background: color }"
          @click="currentColor = color"
          :title="color"
        ></button>
      </div>

      <!-- Shape Tool -->
      <button
        type="button"
        class="pe-wide-tool pe-gap-top"
        :class="{ active: activeTool === 'shape' }"
        @click="selectTool('shape')"
        title="绘制形状"
      >
        绘制形状
      </button>
      <div class="pe-control-row pe-shape-row">
        <label>形状</label>
        <select v-model="shapeType">
          <option value="rectangle">矩形</option>
          <option value="square">正方形</option>
          <option value="line">直线</option>
          <option value="ellipse">椭圆</option>
          <option value="circle">圆形</option>
          <option value="triangle">三角形</option>
        </select>
        <select v-model="shapeFill">
          <option value="filled">实心</option>
          <option value="outline">空心</option>
        </select>
      </div>

      <!-- Selection Tools -->
      <button
        type="button"
        class="pe-wide-tool pe-gap-top"
        :class="{ active: activeTool === 'select' }"
        @click="selectTool('select')"
        title="选择区域"
      >
        选择区域
      </button>
      <div class="pe-button-row">
        <button type="button" class="pe-secondary" @click="copySelection(false)">复制</button>
        <button type="button" class="pe-secondary" @click="copySelection(true)">剪切</button>
      </div>
      <div class="pe-button-row">
        <button type="button" class="pe-danger-outline" @click="deleteSelection">擦除</button>
        <button
          type="button"
          class="pe-secondary"
          :class="{ active: activeTool === 'move' }"
          @click="selectTool('move')"
        >
          移动
        </button>
      </div>
      <button type="button" class="pe-secondary pe-wide" :class="{ active: activeTool === 'magic' }" @click="selectTool('magic')">
        魔法棒
      </button>

      <!-- Transform Selection -->
      <div class="pe-button-row">
        <button type="button" class="pe-secondary" @click="transformSelection('rotate-cw')">顺时针 5°</button>
        <button type="button" class="pe-secondary" @click="transformSelection('rotate-ccw')">逆时针 5°</button>
      </div>
      <div class="pe-button-row">
        <button type="button" class="pe-secondary" @click="transformSelection('flip-h')">左右镜像</button>
        <button type="button" class="pe-secondary" @click="transformSelection('flip-v')">上下镜像</button>
      </div>

      <!-- Undo/Redo -->
      <div class="pe-button-row">
        <button type="button" class="pe-secondary" @click="undo">撤销</button>
        <button type="button" class="pe-secondary" @click="redo">重做</button>
      </div>

      <button type="button" class="pe-danger-outline pe-wide" @click="clearLayer">清空当前图层</button>
    </section>

    <!-- Onion Skinning -->
    <section>
      <h2>洋葱皮</h2>
      <label class="pe-switch-row">
        <input type="checkbox" v-model="onion.enabled" @change="renderAll" />
        <span>显示相邻帧</span>
      </label>
      <div class="pe-control-row">
        <label>颜色模式</label>
        <select v-model="onion.colorMode" @change="renderAll">
          <option value="real">真实颜色</option>
          <option value="tint">前后帧染色</option>
        </select>
      </div>
      <div class="pe-control-row">
        <label>前一帧透明度</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          v-model.number="onion.prevOpacity"
          @input="renderAll"
        />
        <span>{{ Math.round(onion.prevOpacity * 100) }}%</span>
      </div>
      <div class="pe-control-row">
        <label>后一帧透明度</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          v-model.number="onion.nextOpacity"
          @input="renderAll"
        />
        <span>{{ Math.round(onion.nextOpacity * 100) }}%</span>
      </div>
    </section>

    <!-- Text Tool -->
    <section>
      <h2>像素文字</h2>
      <textarea v-model="textTool.text" rows="3"></textarea>
      <div class="pe-control-row">
        <label>字号</label>
        <select v-model.number="textTool.size">
          <option :value="8">8 px</option>
          <option :value="10">10 px</option>
          <option :value="12">12 px</option>
        </select>
        <label>宽度模式</label>
        <select v-model="textTool.widthMode">
          <option value="monospaced">等宽</option>
          <option value="proportional">比例</option>
        </select>
      </div>
      <div class="pe-button-row">
        <button type="button" class="pe-secondary" @click="stampText(0)">左</button>
        <button type="button" class="pe-secondary" @click="stampText(1)">中</button>
        <button type="button" class="pe-secondary" @click="stampText(2)">右</button>
      </div>
    </section>

    <!-- Import -->
    <section>
      <h2>导入</h2>
      <input
        ref="staticFileInput"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        @change="loadStaticImage"
      />
      <input
        ref="gifFileInput"
        type="file"
        accept="image/gif"
        hidden
        @change="loadGifImage"
      />
      <button type="button" class="pe-secondary pe-wide" @click="onStaticFileClick">
        导入静态图
      </button>
      <button type="button" class="pe-secondary pe-wide" @click="onGifFileClick">
        导入 GIF 多帧
      </button>
    </section>

    <!-- Export -->
    <section>
      <h2>导出</h2>
      <div class="pe-button-row">
        <button type="button" class="pe-primary" @click="exportPng">PNG</button>
        <button type="button" class="pe-primary" @click="exportGif">GIF</button>
      </div>
      <div class="pe-control-row">
        <label>放大比例</label>
        <select v-model.number="exportScale">
          <option :value="1">1x</option>
          <option :value="4">4x</option>
          <option :value="8">8x</option>
          <option :value="16">16x</option>
          <option :value="20">20x</option>
        </select>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Props
interface Props {
  drawingTools?: any[];
  activeTool?: string;
  currentColor?: string;
  palette?: string[];
  shapeType?: string;
  shapeFill?: string;
  onion?: any;
  textTool?: any;
  exportScale?: number;
}

const props = withDefaults(defineProps<Props>(), {
  drawingTools: () => [
    { id: 'pencil', label: '画笔' },
    { id: 'eraser', label: '橡皮' },
    { id: 'fill', label: '填充' },
    { id: 'eyedropper', label: '吸色' },
    { id: 'shape', label: '绘制形状' },
    { id: 'select', label: '选择区域' },
  ],
  activeTool: 'pencil',
  currentColor: '#ffcc00',
  palette: () => [
    '#000000', '#ffffff', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c',
    '#7e2553', '#ab5236', '#ff77a8', '#ffccaa', '#c2c3c7', '#5f574f', '#008751', '#1d2b53',
    '#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600', '#2f4b7c', '#00b8a9', '#f6416c',
  ],
  shapeType: 'rectangle',
  shapeFill: 'filled',
  onion: () => ({ enabled: false, colorMode: 'real', prevOpacity: 0.35, nextOpacity: 0.3 }),
  textTool: () => ({ text: 'PIXEL', size: 8, widthMode: 'monospaced' }),
  exportScale: 1,
});

// Emits
const emit = defineEmits<{
  'update:activeTool': [tool: string];
  'update:currentColor': [color: string];
  'update:shapeType': [type: string];
  'update:shapeFill': [fill: string];
  'update:onion': [onion: any];
  'update:textTool': [textTool: any];
  'update:exportScale': [scale: number];
  selectTool: [tool: string];
  copySelection: [cut: boolean];
  deleteSelection: [];
  transformSelection: [mode: string];
  undo: [];
  redo: [];
  clearLayer: [];
  stampText: [align: number];
  exportPng: [];
  exportGif: [];
  loadStaticImage: [event: Event];
  loadGifImage: [event: Event];
}>();

// Refs
const staticFileInput = ref<HTMLInputElement>();
const gifFileInput = ref<HTMLInputElement>();

// Event handlers
const selectTool = (tool: string) => {
  emit('update:activeTool', tool);
  emit('selectTool', tool);
};

const copySelection = (cut: boolean) => emit('copySelection', cut);
const deleteSelection = () => emit('deleteSelection');
const transformSelection = (mode: string) => emit('transformSelection', mode);
const undo = () => emit('undo');
const redo = () => emit('redo');
const clearLayer = () => emit('clearLayer');
const stampText = (align: number) => emit('stampText', align);
const onStaticFileClick = () => staticFileInput.value?.click();
const onGifFileClick = () => gifFileInput.value?.click();
const loadStaticImage = (event: Event) => emit('loadStaticImage', event);
const loadGifImage = (event: Event) => emit('loadGifImage', event);

// Expose refs
const loadStaticImage = (event: Event) => emit('loadStaticImage', event);
const loadGifImage = (event: Event) => emit('loadGifImage', event);
</script>

<style scoped>
/* Component styles are in the main styles file */
</style>
