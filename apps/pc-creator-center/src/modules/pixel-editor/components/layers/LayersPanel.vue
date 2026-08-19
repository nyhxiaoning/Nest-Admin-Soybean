<template>
  <section class="pe-panel pe-layers-panel">
    <div class="pe-panel-title-row">
      <h2>图层</h2>
      <button
        type="button"
        class="pe-primary pe-small"
        :disabled="layers.length >= maxLayers"
        @click="$emit('addLayer')"
      >
        新增
      </button>
    </div>

    <div class="pe-layer-list">
      <div
        v-for="(layer, index) in layers"
        :key="layer.id"
        role="button"
        tabindex="0"
        class="pe-layer-item"
        :class="{ active: activeLayerIndex === index }"
        @click="$emit('selectLayer', index)"
      >
        <input
          type="checkbox"
          :checked="layer.visible"
          @click.stop
          @change="$emit('update:layer', { ...layer, visible: ($event.target as HTMLInputElement).checked })"
        />
        <span>{{ layer.name }}</span>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          :value="layer.opacity"
          @click.stop
          @input="$emit('update:layer', { ...layer, opacity: Number(($event.target as HTMLInputElement).value) })"
        />
        <button
          type="button"
          class="pe-danger-outline pe-mini"
          :disabled="layers.length <= 2"
          @click.stop="$emit('deleteLayer', index)"
        >
          删
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Layer } from '@/modules/pixel-editor/core';

interface Props {
  layers?: Layer[];
  activeLayerIndex?: number;
  maxLayers?: number;
}

withDefaults(defineProps<Props>(), {
  layers: () => [],
  activeLayerIndex: 0,
  maxLayers: 4,
});

defineEmits<{
  addLayer: [];
  selectLayer: [index: number];
  deleteLayer: [index: number];
  'update:layer': [layer: Layer];
}>();
</script>

<style scoped>
/* Component styles are in the main styles file */
</style>
