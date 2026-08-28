<template>
  <!-- <div v-if="view === 'library'" class="pe-library-view">
    <section class="pe-library-head">
      <div>
        <h1>{{ t('common.pxm_editor_library_title') }}</h1>
        <p>{{ projects.length }} {{ t('common.pxm_editor_library_local_count') }}</p>
      </div>
      <ThemeSwitcher />
      <button type="button" class="pe-primary" @click="handleNewProject">
        {{ t('common.pxm_editor_library_new') }}
      </button>
    </section>

    <section v-if="projects.length" class="pe-project-grid">
      <article v-for="item in sortedProjects" :key="item.id" class="pe-project-card">
        <canvas :ref="(el) => setProjectThumbRef(item.id, el)" width="128" height="64" />
        <div class="pe-project-card-body">
          <h2>{{ item.name }}</h2>
          <p>
            {{ item.width }} x {{ item.height }} · {{ item.frames.length }}
            {{ t('common.pxm_editor_frame_unit') }} ·
            {{ formatTime(item.updatedAt) }}
          </p>
          <div class="pe-project-card-actions">
            <button type="button" class="pe-primary" @click="handleOpenProject(item.id)">
              {{ t('common.pxm_editor_library_continue') }}
            </button>
            <button type="button" class="pe-secondary" @click="handleDuplicateProject(item.id)">
              {{ t('common.pxm_editor_duplicate') }}
            </button>
            <button type="button" class="pe-secondary" @click="handleExportProjectPng(item.id)">
              PNG
            </button>
            <button type="button" class="pe-secondary" @click="handleExportProjectGif(item.id)">
              GIF
            </button>
            <button type="button" class="pe-danger-outline" @click="handleDeleteProject(item.id)">
              {{ t('common.pxm_editor_delete') }}
            </button>
          </div>
        </div>
      </article>
    </section>
    <section v-else class="pe-empty-library">
      <h2>{{ t('common.pxm_editor_library_empty') }}</h2>
      <p>{{ t('common.pxm_editor_library_empty_hint') }}</p>
    </section>
  </div> -->

  <div class="pe-workspace pe-theme-host">
    <aside class="pe-panel pe-tools-panel">
      <section>
        <h2>{{ t('common.pxm_editor_tools') }}</h2>
        <div class="pe-tool-grid" role="toolbar">
          <button
            v-for="tool in drawingTools"
            :key="tool.id"
            type="button"
            class="pe-tool"
            :class="{ active: activeTool === tool.id }"
            :title="tool.label"
            @click="handleSelectTool(tool.id)"
          >
            {{ tool.label }}
          </button>
        </div>
        <div class="pe-control-row">
          <label>{{ t('common.pxm_editor_color') }}</label>
          <input v-model="currentColor" type="color" />
          <input v-model="currentColor" class="pe-hex-input" maxlength="7" />
        </div>
        <div class="pe-palette">
          <button
            v-for="color in palette"
            :key="color"
            type="button"
            class="pe-swatch"
            :class="{ active: color === currentColor }"
            :style="{ background: color }"
            :title="color"
            @click="currentColor = color"
          />
        </div>
        <button
          type="button"
          class="pe-tool pe-wide-tool pe-gap-top"
          :class="{ active: activeTool === 'shape' }"
          :title="t('common.pxm_editor_shapes')"
          @click="handleSelectTool('shape')"
        >
          {{ t('common.pxm_editor_shapes') }}
        </button>
        <div class="pe-control-row pe-shape-row">
          <label>{{ t('common.pxm_editor_shapes') }}</label>
          <select v-model="shapeType">
            <option value="rectangle">{{ t('common.pxm_editor_rectangle') }}</option>
            <option value="square">{{ t('common.pxm_editor_square') }}</option>
            <option value="line">{{ t('common.pxm_editor_line') }}</option>
            <option value="ellipse">{{ t('common.pxm_editor_ellipse') }}</option>
            <option value="circle">{{ t('common.pxm_editor_circle') }}</option>
            <option value="triangle">{{ t('common.pxm_editor_triangle') }}</option>
          </select>
          <select v-model="shapeFill">
            <option value="filled">{{ t('common.pxm_editor_solid') }}</option>
            <option value="outline">{{ t('common.pxm_editor_hollow') }}</option>
          </select>
        </div>
        <button
          type="button"
          class="pe-tool pe-wide-tool pe-gap-top"
          :class="{ active: activeTool === 'select' }"
          :title="t('common.pxm_editor_selection')"
          @click="handleSelectTool('select')"
        >
          {{ t('common.pxm_editor_selection') }}
        </button>
        <div class="pe-button-row">
          <button type="button" class="pe-secondary" @click="handleCopySelection(false)">
            {{ t('common.pxm_editor_copy') }}
          </button>
          <button type="button" class="pe-secondary" @click="handleCopySelection(true)">
            {{ t('common.pxm_editor_cut') }}
          </button>
        </div>
        <div class="pe-button-row">
          <button type="button" class="pe-danger-outline" @click="handleDeleteSelection">
            {{ t('common.pxm_editor_erase') }}
          </button>
          <button
            type="button"
            class="pe-secondary"
            :class="{ active: activeTool === 'move' }"
            @click="handleSelectTool('move')"
          >
            {{ t('common.pxm_editor_move') }}
          </button>
        </div>
        <button
          type="button"
          class="pe-secondary pe-wide"
          :class="{ active: activeTool === 'magic' }"
          @click="handleSelectTool('magic')"
        >
          {{ t('common.pxm_editor_magic') }}
        </button>
        <div class="pe-button-row">
          <button type="button" class="pe-secondary" @click="handleTransformSelection('rotate-cw')">
            {{ t('common.pxm_editor_rotate_cw') }}
          </button>
          <button
            type="button"
            class="pe-secondary"
            @click="handleTransformSelection('rotate-ccw')"
          >
            {{ t('common.pxm_editor_rotate_ccw') }}
          </button>
        </div>
        <div class="pe-button-row">
          <button type="button" class="pe-secondary" @click="handleTransformSelection('flip-h')">
            {{ t('common.pxm_editor_flip_x') }}
          </button>
          <button type="button" class="pe-secondary" @click="handleTransformSelection('flip-v')">
            {{ t('common.pxm_editor_flip_y') }}
          </button>
        </div>
        <div class="pe-button-row">
          <button type="button" class="pe-secondary" @click="handleUndo">
            {{ t('common.pxm_editor_undo') }}
          </button>
          <button type="button" class="pe-secondary" @click="handleRedo">
            {{ t('common.pxm_editor_redo') }}
          </button>
        </div>
        <button type="button" class="pe-danger-outline pe-wide" @click="handleClearLayer">
          {{ t('common.pxm_editor_clear_layer') }}
        </button>
      </section>

      <section>
        <h2>{{ t('common.pxm_editor_onion') }}</h2>
        <label class="pe-switch-row">
          <input v-model="onion.enabled" type="checkbox" @change="renderAll" />
          <span>{{ t('common.pxm_editor_show_adjacent') }}</span>
        </label>
        <div class="pe-control-row">
          <label>{{ t('common.pxm_editor_color_title') }}</label>
          <select v-model="onion.colorMode" @change="renderAll">
            <option value="real">{{ t('common.pxm_editor_real_color') }}</option>
            <option value="tint">{{ t('common.pxm_editor_tint_color') }}</option>
          </select>
        </div>
        <div class="pe-control-row">
          <label>{{ t('common.pxm_editor_prev_opacity') }}</label>
          <input
            v-model.number="onion.prevOpacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            @input="renderAll"
          />
          <span>{{ Math.round(onion.prevOpacity * 100) }}%</span>
        </div>
        <div class="pe-control-row">
          <label>{{ t('common.pxm_editor_next_opacity') }}</label>
          <input
            v-model.number="onion.nextOpacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            @input="renderAll"
          />
          <span>{{ Math.round(onion.nextOpacity * 100) }}%</span>
        </div>
      </section>

      <section>
        <h2>{{ t('common.pxm_editor_text') }}</h2>
        <textarea v-model="textTool.text" rows="3" />
        <div class="pe-control-row">
          <label>{{ t('common.pxm_editor_tool_font_size') }}</label>
          <select v-model.number="textTool.size">
            <option :value="8">8 px</option>
            <option :value="10">10 px</option>
            <option :value="12">12 px</option>
          </select>
          <label>{{ t('common.pxm_editor_tool_width_mode') }}</label>
          <select v-model="textTool.widthMode">
            <option value="monospaced">{{ t('common.pxm_editor_equal_width') }}</option>
            <option value="proportional">{{ t('common.pxm_editor_proportional') }}</option>
          </select>
        </div>
        <div class="pe-button-row">
          <button type="button" class="pe-secondary" @click="handleStampText(0)">
            {{ t('common.pxm_editor_left') }}
          </button>
          <button type="button" class="pe-secondary" @click="handleStampText(1)">
            {{ t('common.pxm_editor_center') }}
          </button>
          <button type="button" class="pe-secondary" @click="handleStampText(2)">
            {{ t('common.pxm_editor_right') }}
          </button>
        </div>
      </section>

      <section>
        <h2>{{ t('common.pxm_editor_import') }}</h2>
        <input
          ref="staticFileInputRef"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          @change="handleLoadStaticImage"
        />
        <input
          ref="gifFileInputRef"
          type="file"
          accept="image/gif"
          hidden
          @change="handleLoadGifImage"
        />
        <button type="button" class="pe-secondary pe-wide" @click="handleStaticFileInputClick">
          {{ t('common.pxm_editor_import_static') }}
        </button>
        <button type="button" class="pe-secondary pe-wide" @click="handleGifFileInputClick">
          {{ t('common.pxm_editor_import_animated') }}
        </button>
      </section>

      <section>
        <h2>{{ t('common.pxm_editor_export') }}</h2>
        <div class="pe-button-row">
          <button type="button" class="pe-primary" @click="handleExportPng">
            {{ t('common.pxm_editor_export_png') }}
          </button>
          <button type="button" class="pe-primary" @click="handleExportGif">
            {{ t('common.pxm_editor_export_gif') }}
          </button>
        </div>
        <div class="pe-control-row">
          <label>{{ t('common.pxm_editor_scale_label') }}</label>
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

    <section class="pe-editor-panel">
      <div class="pe-panel pe-editor-toolbar">
        <div>
          <strong>{{ project.name }}</strong>
          <span
            >{{ project.frames.length }} {{ t('common.pxm_editor_frame_unit') }} ·
            {{ t('common.pxm_editor_layer_unit') }} {{ activeLayer + 1 }}</span
          >
          <span
            v-if="editingWork"
            class="pe-editing-badge"
            style="
              margin-left: 8px;
              padding: 2px 8px;
              background: #409eff;
              color: white;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
            "
          >
            {{ t('common.pxm_editor_editing_mode') }}
          </span>
        </div>
        <ThemeSwitcher />
        <div class="pe-status">
          {{ status }}
        </div>
        <button
          type="button"
          class="pe-save-btn"
          :class="{ disabled: saving }"
          @click="handleSaveToOSS"
        >
          {{ t('common.pxm_editor_save') }}
        </button>
        <button
          type="button"
          class="pe-save-btn"
          :title="$t('common.pxm_action_preview')"
          @click.stop="sendWorkToDevice"
        >
          {{ $t('common.pxm_action_preview') }}
        </button>
        <button type="button" class="pe-save-btn" @click="backHome">
          {{ t('common.pxm_editor_back_home') }}
        </button>
      </div>

      <section class="pe-panel pe-frames-panel">
        <div class="pe-frame-strip-head">
          <div class="pe-panel-title-row">
            <h2>{{ t('common.pxm_editor_frames') }}</h2>
            <button type="button" class="pe-primary pe-small" @click="handleAddFrame">
              {{ t('common.pxm_editor_add') }}
            </button>
          </div>
          <div class="pe-button-row">
            <button type="button" class="pe-secondary" @click="handleDuplicateFrame">
              {{ t('common.pxm_editor_duplicate') }}
            </button>
            <button type="button" class="pe-danger-outline" @click="handleDeleteFrame">
              {{ t('common.pxm_editor_delete') }}
            </button>
          </div>
          <button type="button" class="pe-danger-outline pe-wide" @click="handleDeleteAllFrames">
            {{ t('common.pxm_editor_delete_all') }}
          </button>
        </div>
        <div class="pe-frames-list">
          <button
            v-for="(frame, index) in project.frames"
            :key="frame.id"
            type="button"
            class="pe-frame-item"
            :class="{
              active: currentFrameIndex === index,
              dragging: draggingFrameIndex === index,
              'drag-over': dragOverFrameIndex === index,
            }"
            draggable="true"
            @click="handleSelectFrame(index)"
            @dragstart="handleStartFrameDrag(index, $event)"
            @dragover.prevent="handleDragOverFrame(index, $event)"
            @dragleave="dragOverFrameIndex = null"
            @drop.prevent="handleDropFrame(index)"
            @dragend="handleEndFrameDrag"
          >
            <canvas :ref="(el) => setFrameThumbRef(frame.id, el)" width="96" height="48" />
            <span
              >{{ t('common.pxm_editor_frame_prefix') }} {{ index + 1 }}
              {{ t('common.pxm_editor_frame_unit') }}</span
            >
          </button>
        </div>
      </section>

      <div class="pe-panel pe-frame-settings-bar">
        <div class="pe-control-row">
          <label>{{ t('common.pxm_editor_interval') }}</label>
          <input
            v-model="frameDelayInput"
            type="number"
            min="20"
            max="5000"
            step="10"
            @blur="handleCommitFrameDelay"
            @change="handleCommitFrameDelay"
            @keydown.enter="handleCommitFrameDelay"
          />
          <span>ms</span>
        </div>
      </div>

      <div class="pe-canvas-layer-row">
        <div class="pe-panel pe-canvas-stage">
          <div class="pe-canvas-coordinate">
            <span v-if="hoverPoint">({{ hoverPoint.x }}, {{ hoverPoint.y }})</span>
            <span v-else>&nbsp;</span>
          </div>
          <canvas
            ref="editorCanvasRef"
            width="960"
            height="480"
            @pointerdown="handlePointerDown"
            @pointermove="handlePointerMove"
            @pointerup="handlePointerUp"
            @pointercancel="handlePointerUp"
            @pointerleave="handlePointerLeave"
          />
        </div>
        <section class="pe-panel pe-layers-panel">
          <div class="pe-panel-title-row">
            <h2>{{ t('common.pxm_editor_layers') }}</h2>
            <button
              type="button"
              class="pe-primary pe-small"
              :disabled="currentFrame.layers.length >= 4"
              @click="handleAddLayer"
            >
              {{ t('common.pxm_editor_add') }}
            </button>
          </div>
          <div class="pe-layer-list">
            <div
              v-for="(layer, index) in currentFrame.layers"
              :key="layer.id"
              role="button"
              tabindex="0"
              class="pe-layer-item"
              :class="{ active: activeLayer === index }"
              @click="handleSelectLayer(index)"
            >
              <input
                v-model="layer.visible"
                type="checkbox"
                @click.stop
                @change="handleUpdateLayerSettings"
              />
              <span>{{ layer.name }}</span>
              <input
                v-model.number="layer.opacity"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                @click.stop
                @input="handleUpdateLayerSettings"
              />
              <button
                type="button"
                class="pe-danger-outline pe-mini"
                :disabled="currentFrame.layers.length <= 2"
                @click.stop="handleDeleteLayer(index)"
              >
                {{ t('common.pxm_editor_delete_layer') }}
              </button>
            </div>
          </div>
          <div class="pe-canvas-overview">
            <div ref="overviewScrollRef" class="pe-overview-scroll">
              <canvas
                :ref="setOverviewCanvasRef"
                :width="overviewCanvasSize"
                :height="overviewCanvasSize"
                :style="{
                  width: `${overviewCanvasSize}px`,
                  height: `${overviewCanvasSize}px`,
                }"
                @pointerdown="handleJumpViewportFromOverview"
                @pointermove="handleOverviewPointerMove"
                @pointerleave="handleOverviewPointerLeave"
              />
            </div>
            <div class="pe-overview-actions">
              <label class="pe-overview-zoom-control">
                <span>{{ t('common.pxm_editor_zoom') }} {{ overviewZoom.toFixed(2) }}x</span>
                <input
                  type="range"
                  min="1"
                  max="16"
                  step="0.25"
                  :value="overviewZoom"
                  @input="handleSetOverviewZoom($event.target.value)"
                />
              </label>
              <el-button type="button" class="pe-secondary" @click="handleSaveOverviewPng">
                {{ t('common.pxm_editor_overview_save') }}
              </el-button>
              <span v-if="hoverOverviewPoint" class="pe-overview-coordinate"
                >({{ hoverOverviewPoint.x }}, {{ hoverOverviewPoint.y }})</span
              >
              <span v-else class="pe-overview-coordinate">&nbsp;</span>
            </div>
          </div>
        </section>
      </div>

      <section class="pe-panel pe-preview-panel">
        <div class="pe-panel-title-row">
          <h2>{{ t('common.pxm_editor_led_preview') }}</h2>
        </div>
        <button type="button" class="pe-secondary pe-preview-play-btn" @click="handleTogglePreview">
          {{
            previewPlaying
              ? t('common.pxm_editor_stop_play')
              : t('common.pxm_editor_play_all_frames')
          }}
        </button>
        <canvas ref="previewCanvasRef" width="480" height="240" />
      </section>
    </section>
  </div>

  <div v-if="importDialog.open" class="pe-modal-backdrop">
    <section class="pe-modal">
      <div class="pe-panel-title-row">
        <h2>{{ t('common.pxm_editor_import_image_pixelated') }}</h2>
        <button type="button" class="pe-secondary" @click="handleCloseImportDialog">
          {{ t('common.pxm_common_cancel') }}
        </button>
      </div>
      <div class="pe-import-grid">
        <div class="pe-import-crop-area">
          <div class="pe-import-label-row">
            <span>{{ t('common.pxm_editor_import_crop') }}</span>
            <span>{{ t('common.pxm_editor_import_drag') }}</span>
          </div>
          <canvas
            ref="importCropCanvasRef"
            width="512"
            height="256"
            @pointerdown="handleImportPointerDown"
            @pointermove="handleImportPointerMove"
            @pointerup="handleImportPointerUp"
            @pointercancel="handleImportPointerUp"
            @wheel.prevent="handleImportWheel"
          />
          <div class="pe-control-row">
            <label>{{ t('common.pxm_editor_import_zoom') }}</label>
            <input
              v-model.number="importDialog.zoom"
              type="range"
              min="0.5"
              max="4"
              step="0.05"
              @input="renderImportPreview"
            />
            <span class="pe-zoom-value">{{ Number(importDialog.zoom || 1).toFixed(2) }}x</span>
          </div>
        </div>
        <div class="pe-import-controls">
          <div class="pe-import-preview">
            <div class="pe-import-label-row">
              <span>{{ t('common.pxm_editor_import_pixel_preview') }}</span>
              <span>{{ t('common.pxm_editor_pixel_preview') }}</span>
            </div>
            <canvas ref="importCanvasRef" width="256" height="128" />
          </div>
          <div class="pe-control-row">
            <label>{{ t('common.pxm_editor_import_fit') }}</label>
            <select v-model="importDialog.fit" @change="handleResetImportCrop">
              <option value="contain">{{ t('common.pxm_editor_fit_contain') }}</option>
              <option value="cover">{{ t('common.pxm_editor_fit_cover') }}</option>
              <option value="stretch">{{ t('common.pxm_editor_fit_stretch') }}</option>
            </select>
          </div>
          <div class="pe-control-row">
            <label>{{ t('common.pxm_editor_import_dither') }}</label>
            <select v-model="importDialog.dither" @change="renderImportPreview">
              <option value="none">{{ t('common.pxm_editor_import_none') }}</option>
              <option value="ordered">{{ t('common.pxm_editor_import_ordered') }}</option>
              <option value="floyd">{{ t('common.pxm_editor_import_floyd') }}</option>
            </select>
          </div>
          <button type="button" class="pe-primary pe-wide" @click="handleApplyImportToLayer">
            {{ t('common.pxm_editor_import_apply') }}
          </button>
          <p class="pe-import-hint">
            {{ t('common.pxm_editor_import_hint') }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Ref, CanvasHTMLAttributes } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

// i18n
import { useAppI18n } from '@@/composables/useI18n'
const { t, getCurrentLocale } = useAppI18n()
const currentLocale = getCurrentLocale()

// Upload functions
import { uploadPixelJSON, uploadDoodle, uploadGif } from '@/lib/images/uploadFile'

// API
import { createWorkApi, updateWorkApi, getWorkDetailApi } from '@/api/works'
import type { CreatorWorkSaveRequest, CreatorWorkVO } from '@/api/works'
import { listDevicesApi, previewToDeviceApi } from '@/api/device'

// Theme switcher
import ThemeSwitcher from '../common/ThemeSwitcher.vue'

// Core module imports
import {
  WIDTH,
  HEIGHT,
  PIXELS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_VIEWPORT_X,
  DEFAULT_VIEWPORT_Y,
  EMPTY,
  STORAGE_KEY,
  CURRENT_KEY,
  MAX_GIF_EXPORT_FRAMES,
  palette as corePalette,
  applyShape,
  clampViewportX,
  clampViewportY,
  compositeFrame,
  drawPixels,
  emptyPixels,
  id,
  isEmptyPixel,
  loadProjects,
  makeFrame,
  makeLayer,
  makeProject,
  moveFrameViewport,
  normalizeHex,
  pixelKey,
  pointRect,
  refreshProjectVisibleFromCanvas,
  refreshLayerVisibleFromCanvas,
  sanitizeProject,
  syncFrameCanvasFromVisible,
  saveProjects,
  setPixel,
} from '@/modules/pixel-editor/core'
import { downloadBlob, safeName } from '@/modules/pixel-editor/core/download'
import { encodeGif } from '@/modules/pixel-editor/core/gif-encoder'
import {
  decodeGifFrames,
  imageFromFile,
  localPixelsToCanvasPixels,
  renderImageToPixels,
} from '@/modules/pixel-editor/core/image-import'

// Type definitions
interface Tool {
  id: string
  label: string
}

interface OnionConfig {
  enabled: boolean
  colorMode: 'real' | 'tint'
  prevOpacity: number
  nextOpacity: number
}

interface TextToolConfig {
  text: string
  size: number
  widthMode: 'monospaced' | 'proportional'
}

interface ImportDialogState {
  open: boolean
  image: HTMLImageElement | null
  pixels: (string | null)[]
  fit: 'contain' | 'cover' | 'stretch'
  cropX: number
  cropY: number
  zoom: number
  dither: 'none' | 'ordered' | 'floyd'
  preserveColors: boolean
  dragging: boolean
  dragStart: { x: number; y: number } | null
  dragCropStart: { x: number; y: number } | null
}

interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
  mask?: boolean[]
}

interface SelectionClipboard {
  width: number
  height: number
  pixels: (string | null)[]
}

interface Point {
  x: number
  y: number
  index: number
  worldX: number
  worldY: number
}

// Constants
const THEME_KEY = 'pixelart-web-editor.theme'
const FUSION_FONT_ROOT = 'assets/fonts'
const FUSION_FONT_LANGS = ['latin', 'zh_hans', 'zh_hant', 'ja', 'ko']
const FUSION_FONT_CACHE = new Set<string>()
const TEXT_ALPHA_THRESHOLD = 180

// Template refs
const staticFileInputRef = ref<HTMLInputElement | null>(null)
const gifFileInputRef = ref<HTMLInputElement | null>(null)
const editorCanvasRef = ref<HTMLCanvasElement | null>(null)
const overviewScrollRef = ref<HTMLDivElement | null>(null)
const overviewCanvasRef = ref<HTMLCanvasElement | null>(null)
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const importCropCanvasRef = ref<HTMLCanvasElement | null>(null)
const importCanvasRef = ref<HTMLCanvasElement | null>(null)

// Project thumbnail refs storage
const projectThumbCanvases = ref<Record<string, HTMLCanvasElement | null>>({})
const frameThumbCanvases = ref<Record<string, HTMLCanvasElement | null>>({})

// Reactive state
const view = ref<'library' | 'editor'>('library')
const theme = ref<'dark' | 'light'>(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark')

const projects = ref(loadProjects())
const currentId = ref(localStorage.getItem(CURRENT_KEY) || '')
const firstProject = computed(() => {
  return projects.value.find((p) => p.id === currentId.value) || projects.value[0] || makeProject()
})

const project = ref(firstProject.value)

// Palette
const palette = ref(corePalette)

// Route
const route = useRoute()
const router = useRouter()
const editingWorkId = ref<string | null>(null)
const editingWork = ref<CreatorWorkVO | null>(null)
const loadingWork = ref(false)

// Auto-save state
const lastSaveTimestamp = ref<number>(0) // 上次成功保存的时间戳
const autoSaveFirstDone = ref<boolean>(false) // 是否已经完成过首次自动保存
const autoSaveTimer = ref<number | null>(null)
const AUTO_SAVE_INTERVAL = 30 * 1000 // 30 秒
const blankWorkChecked = ref<boolean>(false) // 是否已检查过空白作品

// Tools
const tools = ref<Tool[]>([
  { id: 'pencil', label: t('common.pxm_editor_brush') },
  { id: 'eraser', label: t('common.pxm_editor_eraser') },
  { id: 'fill', label: t('common.pxm_editor_fill') },
  { id: 'eyedropper', label: t('common.pxm_editor_picker') },
  { id: 'shape', label: t('common.pxm_editor_shapes') },
  { id: 'select', label: t('common.pxm_editor_selection') },
])

// Drawing state
const activeTool = ref<string>('pencil')
const currentColor = ref<string>('#ffccaa')
const shapeType = ref<string>('rectangle')
const shapeFill = ref<string>('filled')
const onion = reactive<OnionConfig>({
  enabled: false,
  colorMode: 'real',
  prevOpacity: 0.35,
  nextOpacity: 0.3,
})
const textTool = reactive<TextToolConfig>({
  text: 'PIXEL',
  size: 8,
  widthMode: 'monospaced',
})
const exportScale = ref<number>(1)
const frameDelayInput = ref<string>(
  String(firstProject.value.frames[firstProject.value.currentFrameIndex || 0]?.delay || 120)
)
const status = ref<string>(t('common.pxm_editor_ready'))

// Drawing interaction state
const drawing = ref<boolean>(false)
const dragStart = ref<Point | null>(null)
const dragPoint = ref<Point | null>(null)
const hoverPoint = ref<Point | null>(null)
const interactiveRenderPending = ref<boolean>(false)

// Selection state
const activeSelection = ref<SelectionRect | null>(null)
const selectionTransformBase = ref<{
  angle: number
  rect: SelectionRect
  pixels: (string | null)[]
} | null>(null)
const selectionClipboard = ref<SelectionClipboard | null>(null)
const pendingPaste = ref<SelectionClipboard | null>(null)

// Frame dragging
const draggingFrameIndex = ref<number | null>(null)
const dragOverFrameIndex = ref<number | null>(null)

// Overview
const overviewZoom = ref<number>(1)
const hoverOverviewPoint = ref<Point | null>(null)

// History (undo/redo)
const history = ref<string[]>([])
const future = ref<string[]>([])

// Auto-save
const saveTimer = ref<number | null>(null)

// OSS Save state
const saving = ref<boolean>(false)

// Preview playback
const previewPlaying = ref<boolean>(false)
const previewTimer = ref<number | null>(null)

// Keyboard handler reference
const keydownHandler = ref<((event: KeyboardEvent) => void) | null>(null)

// Import dialog
const importDialog = reactive<ImportDialogState>({
  open: false,
  image: null,
  pixels: emptyPixels(),
  fit: 'contain',
  cropX: 0.5,
  cropY: 0.5,
  zoom: 1,
  dither: 'ordered',
  preserveColors: true,
  dragging: false,
  dragStart: null,
  dragCropStart: null,
})

// Computed properties
const sortedProjects = computed(() => {
  return [...projects.value].sort((a, b) => b.updatedAt - a.updatedAt)
})

const currentFrameIndex = computed<number>({
  get: () => {
    return project.value.currentFrameIndex || 0
  },
  set: (value: number) => {
    project.value.currentFrameIndex = Math.max(0, Math.min(value, project.value.frames.length - 1))
    syncFrameDelayInput()
  },
})

const activeLayer = computed<number>({
  get: () => {
    return project.value.activeLayer || 0
  },
  set: (value: number) => {
    project.value.activeLayer = Math.max(
      0,
      Math.min(value, (currentFrame.value?.layers.length || 1) - 1)
    )
  },
})

const currentFrame = computed(() => {
  return project.value.frames[currentFrameIndex.value]
})

const currentViewportX = computed<number>({
  get: () => {
    return currentFrame.value?.viewportX ?? DEFAULT_VIEWPORT_X
  },
  set: (value: number) => {
    if (currentFrame.value) {
      currentFrame.value.viewportX = clampViewportX(value)
    }
  },
})

const currentViewportY = computed<number>({
  get: () => {
    return currentFrame.value?.viewportY ?? DEFAULT_VIEWPORT_Y
  },
  set: (value: number) => {
    if (currentFrame.value) {
      currentFrame.value.viewportY = clampViewportY(value)
    }
  },
})

const currentLayer = computed(() => {
  return currentFrame.value?.layers[activeLayer.value]
})

const drawingTools = computed(() => {
  return tools.value.filter((tool) => !['shape', 'select'].includes(tool.id))
})

const overviewCanvasSize = computed<number>(() => {
  return CANVAS_WIDTH * overviewZoom.value
})

// Utility functions
async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image from ${url}`))
    image.src = url
  })
}

function fusionFontWidthMode(value: string): 'monospaced' | 'proportional' {
  return value === 'proportional' ? 'proportional' : 'monospaced'
}

function fusionFontSize(value: number): number {
  return [8, 10, 12].includes(value) ? value : 8
}

function fusionFontFamily(size: number, widthMode: string, lang: string): string {
  return `Fusion Pixel ${size}px ${widthMode} ${lang}`
}

function fusionFontFamilies(size: number, widthMode: string): string {
  return FUSION_FONT_LANGS.map((lang) => `"${fusionFontFamily(size, widthMode, lang)}"`).join(', ')
}

function fusionFontUrl(size: number, widthMode: string, lang: string): string {
  const dir = `fusion-pixel-font-${size}px-${widthMode}-ttf.woff2-v2026.05.07`
  const file = `fusion-pixel-${size}px-${widthMode}-${lang}.ttf.woff2`
  return `${FUSION_FONT_ROOT}/${dir}/${file}`
}

async function ensureFusionFontsLoaded(size: number, widthMode: string): Promise<void> {
  if (!('FontFace' in window)) return
  const faces = FUSION_FONT_LANGS.map(async (lang: string) => {
    const family = fusionFontFamily(size, widthMode, lang)
    if (FUSION_FONT_CACHE.has(family)) return null
    const face = new FontFace(
      family,
      `url("${fusionFontUrl(size, widthMode, lang)}") format("woff2")`
    )
    document.fonts.add(face)
    await face.load()
    FUSION_FONT_CACHE.add(family)
    return face
  }).filter(Boolean)
  await Promise.all(faces)
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function resizePixelsNearest(
  pixels: (string | null)[],
  width: number,
  height: number,
  scale: number
): (string | null)[] {
  const safeScale = Math.max(1, Number(scale || 1))
  if (safeScale === 1) return pixels.slice()
  const targetWidth = width * safeScale
  const targetHeight = height * safeScale
  const resized = new Array<string | null>(targetWidth * targetHeight)

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.floor(y / safeScale)
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.floor(x / safeScale)
      resized[y * targetWidth + x] = pixels[sourceY * width + sourceX] || EMPTY
    }
  }

  return resized
}

function resizeFramesForGif(
  frames: { delay: number; pixels: (string | null)[] }[],
  width: number,
  height: number,
  scale: number
): { width: number; height: number; frames: { delay: number; pixels: (string | null)[] }[] } {
  const safeScale = Math.max(1, Number(scale || 1))
  return {
    width: width * safeScale,
    height: height * safeScale,
    frames: frames.map((frame) => ({
      delay: frame.delay,
      pixels: resizePixelsNearest(frame.pixels, width, height, safeScale),
    })),
  }
}

function pixelsToCanvasPixels(
  pixels: (string | null)[],
  width: number,
  height: number
): Record<string, string> {
  const canvasPixels: Record<string, string> = {}
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = pixels[y * width + x]
      if (!isEmptyPixel(color)) canvasPixels[`${x},${y}`] = color
    }
  }
  return canvasPixels
}

function mixWithWhite(hex: string, amount: number): string {
  const value = normalizeHex(hex)
  const raw = value.slice(1)
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  const mix = (channel: number): string =>
    Math.round(channel * (1 - amount) + 255 * amount)
      .toString(16)
      .padStart(2, '0')
  return `#${mix(r)}${mix(g)}${mix(b)}`
}

// Helper drawing functions
function drawOnionPixels(
  ctx: CanvasRenderingContext2D,
  pixels: (string | null)[],
  width: number,
  height: number,
  color: string,
  alpha: number
): void {
  const cellW = ctx.canvas.width / width
  const cellH = ctx.canvas.height / height
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isEmptyPixel(pixels[y * width + x])) continue
      ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.ceil(cellW), Math.ceil(cellH))
    }
  }
  ctx.restore()
}

function drawNonEmptyPixels(
  ctx: CanvasRenderingContext2D,
  pixels: (string | null)[],
  width: number,
  height: number,
  alpha: number = 1
): void {
  const cellW = ctx.canvas.width / width
  const cellH = ctx.canvas.height / height
  ctx.save()
  ctx.globalAlpha = alpha
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = pixels[y * width + x]
      if (isEmptyPixel(color)) continue
      ctx.fillStyle = color
      ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.ceil(cellW), Math.ceil(cellH))
    }
  }
  ctx.restore()
}

function rotateSelectionPixels(
  base: {
    rect: SelectionRect
    pixels: (string | null)[]
  },
  angleDeg: number
): Map<string, string> {
  const srcWidth = base.rect.width
  const srcHeight = base.rect.height
  const halfWidth = (srcWidth - 1) / 2
  const halfHeight = (srcHeight - 1) / 2
  const srcCx = halfWidth
  const srcCy = halfHeight
  const dstCx = base.rect.x + halfWidth
  const dstCy = base.rect.y + halfHeight
  const rotate = (angleDeg * Math.PI) / 180
  const sin = -Math.sin(rotate)
  const cos = Math.cos(rotate)
  const boundX = halfWidth * Math.abs(cos) + halfHeight * Math.abs(sin) + 1
  const boundY = halfWidth * Math.abs(sin) + halfHeight * Math.abs(cos) + 1
  const x1 = Math.max(0, Math.round(dstCx - boundX))
  const x2 = Math.min(WIDTH - 1, Math.round(dstCx + boundX))
  const y1 = Math.max(0, Math.round(dstCy - boundY))
  const y2 = Math.min(HEIGHT - 1, Math.round(dstCy + boundY))
  const placed = new Map<string, string>()

  for (let yi = y1; yi <= y2; yi += 1) {
    const oy = yi - dstCy
    const ox0 = x1 - dstCx
    let sx = srcCx + ox0 * cos - oy * sin
    let sy = srcCy + ox0 * sin + oy * cos
    for (let xi = x1; xi <= x2; xi += 1) {
      const vx = Math.round(sx)
      const vy = Math.round(sy)
      sx += cos
      sy += sin
      if (vx < 0 || vx >= srcWidth || vy < 0 || vy >= srcHeight) continue
      const color = base.pixels[vy * srcWidth + vx]
      if (isEmptyPixel(color)) continue
      placed.set(`${xi},${yi}`, color)
    }
  }

  return placed
}

// Theme functions
function setTheme(newTheme: 'light' | 'dark'): void {
  theme.value = newTheme === 'light' ? 'light' : 'dark'
  applyTheme()
  localStorage.setItem(THEME_KEY, theme.value)
}

function applyTheme(): void {
  document.documentElement.dataset.theme = theme.value
}

// Template ref callbacks
function setProjectThumbRef(itemId: string, el: HTMLCanvasElement | null): void {
  if (el) {
    projectThumbCanvases.value[itemId] = el
    nextTick(() => renderProjectThumb(itemId))
  } else {
    delete projectThumbCanvases.value[itemId]
  }
}

function setFrameThumbRef(frameId: string, el: HTMLCanvasElement | null): void {
  if (el) {
    frameThumbCanvases.value[frameId] = el
    nextTick(() => renderFrameThumb(frameId))
  } else {
    delete frameThumbCanvases.value[frameId]
  }
}

function setOverviewCanvasRef(el: HTMLCanvasElement | null): void {
  overviewCanvasRef.value = el
  if (el) nextTick(() => renderOverview())
}

// Rendering functions
function renderProjectThumb(project: (typeof projects.value)[0]): void {
  const canvas = projectThumbCanvases.value[project.id]
  if (!canvas || !project?.frames?.length) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  drawPixels(ctx, compositeFrame(project.frames[0]), WIDTH, HEIGHT)
}

function renderFrameThumb(frameId: string): void {
  const canvas = frameThumbCanvases.value[frameId]
  const frame = project.value.frames.find((item) => item.id === frameId)
  if (!canvas || !frame) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  drawPixels(ctx, compositeFrame(frame), WIDTH, HEIGHT)
}

function renderFrameThumbs(): void {
  project.value.frames.forEach((frame) => renderFrameThumb(frame.id))
}

function renderProjectThumbs(): void {
  sortedProjects.value.forEach((project) => renderProjectThumb(project))
}

function renderOverview(): void {
  const canvas = overviewCanvasRef.value
  if (!canvas || !currentFrame.value) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const zoom = overviewZoom.value
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#05070b'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawOverviewContent(ctx, zoom)
  drawOverviewGrid(ctx, zoom)
  drawOverviewViewport(ctx, zoom)
}

function drawOverviewContent(ctx: CanvasRenderingContext2D, zoom: number = 1): void {
  if (!currentFrame.value) return
  currentFrame.value.layers.forEach((layer) => {
    if (!layer.visible) return
    ctx.save()
    ctx.globalAlpha = Number(layer.opacity ?? 1)
    Object.entries(layer.canvasPixels || {}).forEach(([key, color]) => {
      if (isEmptyPixel(color)) return
      const [x, y] = key.split(',').map(Number)
      if (!Number.isInteger(x) || !Number.isInteger(y)) return
      ctx.fillStyle = color
      ctx.fillRect(x * zoom, y * zoom, zoom, zoom)
    })
    ctx.restore()
  })
}

function drawOverviewGrid(ctx: CanvasRenderingContext2D, zoom: number = 1): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,.16)'
  ctx.lineWidth = 1
  for (let x = 0; x <= CANVAS_WIDTH; x += 1) {
    const px = Math.round(x * zoom) + 0.5
    ctx.beginPath()
    ctx.moveTo(px, 0)
    ctx.lineTo(px, CANVAS_HEIGHT * zoom)
    ctx.stroke()
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += 1) {
    const py = Math.round(y * zoom) + 0.5
    ctx.beginPath()
    ctx.moveTo(0, py)
    ctx.lineTo(CANVAS_WIDTH * zoom, py)
    ctx.stroke()
  }
  ctx.restore()
}

function drawOverviewViewport(ctx: CanvasRenderingContext2D, zoom: number = 1): void {
  ctx.save()
  ctx.strokeStyle = '#5bd08b'
  ctx.lineWidth = 2
  ctx.setLineDash([Math.max(4, zoom * 3), Math.max(3, zoom * 2)])
  ctx.strokeRect(
    currentViewportX.value * zoom + 0.5,
    currentViewportY.value * zoom + 0.5,
    WIDTH * zoom - 1,
    HEIGHT * zoom - 1
  )
  ctx.restore()
}

function overviewPoint(event: MouseEvent): Point | null {
  const canvas = overviewCanvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH)
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT)
  if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return null
  return { x, y, index: 0, worldX: 0, worldY: 0 }
}

function handleOverviewPointerMove(event: MouseEvent): void {
  hoverOverviewPoint.value = overviewPoint(event)
}

function handleOverviewPointerLeave(): void {
  hoverOverviewPoint.value = null
}

function handleJumpViewportFromOverview(event: MouseEvent): void {
  const canvas = overviewCanvasRef.value
  if (!canvas) return
  event.preventDefault()
  const point = overviewPoint(event)
  if (!point) return
  syncFrameCanvasFromVisible(currentFrame.value, currentViewportX.value, currentViewportY.value)
  currentViewportX.value = point.x
  currentViewportY.value = point.y
  currentFrame.value.layers.forEach((layer) =>
    refreshLayerVisibleFromCanvas(layer, currentViewportX.value, currentViewportY.value)
  )
  clearSelectionState()
  touchProject(
    t('common.pxm_editor_viewport', { x: currentViewportX.value, y: currentViewportY.value })
  )
}

function handleSetOverviewZoom(value: string): void {
  const previousZoom = overviewZoom.value
  const parsed = Number(value)
  const nextZoom = Math.max(1, Math.min(16, Number.isFinite(parsed) ? parsed : previousZoom))
  if (nextZoom === previousZoom) return

  const scroller = overviewScrollRef.value
  const focusX = currentViewportX.value + WIDTH / 2
  const focusY = currentViewportY.value + HEIGHT / 2
  const focusScreenX = scroller ? focusX * previousZoom - scroller.scrollLeft : 0
  const focusScreenY = scroller ? focusY * previousZoom - scroller.scrollTop : 0

  overviewZoom.value = nextZoom
  nextTick(() => {
    renderOverview()
    if (!scroller) return
    scroller.scrollLeft = focusX * nextZoom - focusScreenX
    scroller.scrollTop = focusY * nextZoom - focusScreenY
  })
}

function handleSaveOverviewPng(): void {
  syncFrameCanvasFromVisible(currentFrame.value, currentViewportX.value, currentViewportY.value)
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawOverviewContent(ctx, 1)
  canvas.toBlob((blob) => blob && downloadBlob(blob, 'canvas256x256.png'), 'image/png')
}

// ==================== Auto-save helpers ====================

/** 判断当前作品是否为有效作品（至少有一个像素被绘制，或导入了有效内容） */
function isValidWork(): boolean {
  const frames = project.value?.frames || []
  if (frames.length === 0) return false

  // 检查每一帧的每一层，只要有任何一个非空像素即视为有效
  for (const frame of frames) {
    const layers = frame?.layers || []
    // console.log(layers, 'layersssss')
    for (const layer of layers) {
      if (!layer.visible) continue
      const pixels = layer?.pixels
      // console.log(pixels, 'pixelssss')
      let resarrflag = pixels.some((p) => p != null && p !== '' && p !== (EMPTY as any))
      // console.log(resarrflag, 'resarrflag')
      if (Array.isArray(pixels)) {
        const hasPixel = pixels.some((p) => p != null && p !== '' && p !== (EMPTY as any))
        if (hasPixel) return true
      }
    }
  }
  return false
}

/** 判断自上次保存后是否有内容变化 */
function hasChangesSinceLastSave(): boolean {
  if (lastSaveTimestamp.value === 0) return true // 从未保存过，视为有变化
  return project.value.updatedAt > lastSaveTimestamp.value
}

/** 格式化时间 HH:mm */
function formatAutoSaveTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** 执行静默自动保存，返回是否成功 */
async function doSilentSave(): Promise<boolean> {
  // 跳过空白作品（只在首次检查时判断）
  if (!blankWorkChecked.value) {
    blankWorkChecked.value = true
    if (!isValidWork()) return false
  }

  // 无变化则跳过
  if (!hasChangesSinceLastSave()) return false

  if (saving.value) return false // 手动保存中，跳过

  try {
    // 复用 handleSaveToOSS 的上传逻辑，但不弹 toast
    await saveOSSOnly()

    if (!isValidWork()) {
      console.log('false')
      return false
    }

    lastSaveTimestamp.value = Date.now()

    if (!autoSaveFirstDone.value) {
      autoSaveFirstDone.value = true
      status.value = t('common.pxm_editor_auto_saved')
    } else {
      status.value = `${t('common.pxm_editor_last_saved')} ${formatAutoSaveTime(lastSaveTimestamp.value)}`
    }
    return true
  } catch (err) {
    console.warn('Auto-save failed, will retry:', err)
    status.value = t('common.pxm_editor_auto_save_failed')
    return false
  }
}

/** 仅执行 OSS 上传 + 创建/更新，不弹提示（供自动保存和离开页面调用） */
async function saveOSSOnly(): Promise<boolean> {
  const projectData = {
    id: project.value.id,
    version: project.value.version,
    name: project.value.name,
    width: project.value.width,
    height: project.value.height,
    currentFrameIndex: project.value.currentFrameIndex,
    activeLayer: project.value.activeLayer,
    frames: (project.value.frames || []).map((frame) => ({
      ...frame,
      layers: (frame.layers || []).map((layer) => ({
        ...layer,
        canvasPixels: undefined,
      })),
    })),
    createdAt: project.value.createdAt,
    updatedAt: Date.now(),
  }

  const jsonUploadResult = await uploadPixelJSON(projectData)
  const editableFileUrl = jsonUploadResult.fileUrl

  let coverUrl: string | undefined
  let binFileUrl: string | undefined
  let binFileSize: number | undefined

  // Step 2a
  if (project.value.frames && project.value.frames.length > 0) {
    const firstFrame = project.value.frames[0]
    if (firstFrame.layers && firstFrame.layers.length > 0) {
      const firstLayerPixels = firstFrame.layers[0].pixels
      const doodleUploadResult = await uploadDoodle(firstLayerPixels)
      coverUrl = doodleUploadResult.cover
      binFileUrl = doodleUploadResult.binFileUrl
      binFileSize = doodleUploadResult.binSize
    }
  }

  // Step 2b: 静态图
  if (project.value.frames && project.value.frames.length === 1) {
    const pixels = compositeFrame(currentFrame.value)
    const staticDoodleResult = await uploadDoodle(pixels)
    binFileUrl = staticDoodleResult.binFileUrl
    binFileSize = staticDoodleResult.binSize
    coverUrl = coverUrl || staticDoodleResult.cover
  }

  // Step 2c: 动图
  let gifFileSize: number | undefined
  if (project.value.frames && project.value.frames.length > 1) {
    const gifSourceFrames = project.value.frames.map((frame) => ({
      delay: frame.delay,
      pixels: compositeFrame(frame),
    }))
    const gifBlob = encodeGif({
      width: project.value.width,
      height: project.value.height,
      scale: 1,
      frames: gifSourceFrames,
    })
    const gifUploadResult = await uploadGif(gifBlob)
    coverUrl = gifUploadResult.cover
    gifFileSize = gifUploadResult.fileSize
  }

  const isGif = (project.value.frames?.length || 0) > 1
  const workData: CreatorWorkSaveRequest = {
    title: project.value.name,
    type: isGif ? 'GIF' : 'STATIC',
    gifFileUrl: isGif ? coverUrl : undefined,
    gifFileSize: isGif ? gifFileSize : undefined,
    editableFileUrl: editableFileUrl,
    coverUrl: coverUrl,
    binFileUrl: isGif ? undefined : binFileUrl,
    binFileSize: isGif ? undefined : 1024,
    width: project.value.width,
    height: project.value.height,
    frameCount: project.value.frames.length,
    frameDelay: project.value.frames[0]?.delay || 120,
  }

      // 不能超过50k
    if(workData.type ==='GIF'){
      if(workData?.gifFileSize >50*1024*1024){
        ElMessage.warning(t('common.gifSizeError'))
        return false;
      }
    }

  if (editingWorkId.value) {

    await updateWorkApi(editingWorkId.value, workData)
    // 更新已有作品：同步 result
    if (editingWork.value?.result) {
      editingWork.value.result = {
        ...editingWork.value.result,
        ...workData,
        id: editingWork.value.result.id || editingWorkId.value || undefined,
      }
    }

    return true
  } else {
    // 不能超过50k，暂时不限制
    const createResponse = await createWorkApi(workData)
    const newId =
      typeof createResponse === 'object' && createResponse?.result
        ? String(createResponse.result)
        : String(createResponse)
    if (newId) editingWorkId.value = newId
    // 新建作品：拉取详情后赋值，保证 sendWorkToDevice 能拿到完整数据
    if (newId) {
      const detail = await getWorkDetailApi(newId)
      editingWork.value = detail
    }
    return true
  }
}

// OSS Save & Create/Update Work
async function handleSaveToOSS(): Promise<void> {
  if (saving.value) return

  try {
    if (!isValidWork()) {
      console.log('false')
      return
    }

    saving.value = true
    status.value = t('common.pxm_editor_saving')

    let res =  await saveOSSOnly()
    if(!res){
       status.value = t('common.pxm_editor_save')
      saving.value = false;
      return;
    }

    status.value = t('common.pxm_editor_saved')
    ElMessage.success(t('common.pxm_editor_saved'))
  } catch (error) {
    console.error('Save to OSS failed:', error)
    status.value = t('common.pxm_editor_save_failed')
    ElMessage.error(t('common.pxm_editor_save_failed'))
  } finally {
    saving.value = false
  }

}

async function backHome() {
  // 点击保存的时候，首先拿到之前这个作品有没有
  // await handleSaveToOSS()
  router.push('/works')
}

const sendWorkToDevice = async () => {
  console.log(project.value, 'project.value')
  console.log(projects.value, 'projects.value')

  const work = editingWork.value?.result as any
  console.log(editingWork.value, 'editingWork.value')
  const DEVICE_SESSION_KEY = 'creator.preview.deviceIds'
  const selectedDevicesJSON = sessionStorage.getItem(DEVICE_SESSION_KEY)
  const selectedDevices = JSON.parse(selectedDevicesJSON) as any

  if (!selectedDevices) {
    ElMessage.warning(t('common.pxm_device_preview_before_bind'))
    return
  }

  if (selectedDevices && selectedDevices.length === 0) {
    ElMessage.warning(t('common.pxm_device_preview_before_bind'))
    return
  }
  try {
    console.log('sendWorkToDevice-work', work)
    const fileUrl = work?.binFileUrl || work?.gifFileUrl || work?.editableFileUrl || ''
    if (!fileUrl) {
      ElMessage.warning(t('common.pxm_preview_unavailable'))
      return
    }

    // 增加一下这里的work
    let deviceLength = selectedDevices.length
    const res = await previewToDeviceApi({
      deviceIds: selectedDevices,
      type: work.type as any,
      fileUrl: work.type === 'GIF' ? work?.gifFileUrl : work?.binFileUrl,
      fileSize: work.type === 'GIF' ? work?.gifFileSize : work?.binFileSize,
    })
    const failed = (res.result ?? []).filter((r) => !r.success)
    if (failed.length === 0) {
      ElMessage.success(t('common.pxm_editor_push_selected_success'))
      // ElMessage.success(
      //   `【预览推送】作品《${work.title}》下发至：${selectedDevices.value.map((d) => d.name).join('、')}`
      // )
    } else {
      if (deviceLength == failed.length) {
        // 长度相等
        ElMessage.error(t('common.pxm_editor_push_no_device'))
      } else {
        ElMessage.error(t('common.pxm_device_partial_failed'))
      }

      // ElMessage.warning(`部分设备推送失败：${failed.map((f) => f.message).join('；')}`)
    }
  } catch (e) {
    console.error('preview error:', e)
    ElMessage.error(t('common.pxm_editor_push_failed'))
  }
}

// Project management
async function loadWorkForEdit(workId: string): Promise<void> {
  if (!workId) return

  try {
    loadingWork.value = true
    editingWorkId.value = workId

    // Step 1: 获取作品详情
    const workDetail = await getWorkDetailApi(workId)
    editingWork.value = workDetail

    console.log('Work detail loaded:', workDetail)

    // Step 2: 优先从 editableFileUrl 加载 JSON 数据
    if (workDetail?.result?.editableFileUrl) {
      const projectData = await fetchJsonFromUrl<ProjectData>(workDetail?.result?.editableFileUrl)

      console.log('Project data loaded from URL:', projectData)

      // Step 3: 转换数据为 Project 格式
      const frames = (projectData.frames || []).map((frameData) => ({
        id: frameData.id || id('frame'),
        delay: frameData.delay || 120,
        viewportX: frameData.viewportX || DEFAULT_VIEWPORT_X,
        viewportY: frameData.viewportY || DEFAULT_VIEWPORT_Y,
        layers: (frameData.layers || []).map((layerData) => ({
          id: layerData.id || id('layer'),
          name: layerData.name || t('common.pxm_editor_layer_one'),
          visible: layerData.visible !== false,
          opacity: layerData.opacity ?? 1,
          pixels: Array.isArray(layerData.pixels) ? layerData.pixels : emptyPixels(),
          canvasPixels: {},
        })),
      }))

      // Step 4: 创建新项目
      const newProject = sanitizeProject({
        id: projectData.id || id('project'),
        version: projectData.version || 4,
        name: projectData.name || workDetail.title || t('common.pxm_editor_library_new'),
        width: projectData.width || WIDTH,
        height: projectData.height || HEIGHT,
        currentFrameIndex: projectData.currentFrameIndex || 0,
        activeLayer: projectData.activeLayer || 0,
        frames: frames,
        createdAt: projectData.createdAt || Date.now(),
        updatedAt: Date.now(),
      })

      // Step 5: 切换到编辑模式
      projects.value.push(newProject)
      project.value = newProject
      view.value = 'editor'
      currentId.value = newProject.id
      localStorage.setItem(CURRENT_KEY, newProject.id)

      clearSelectionState()
      syncFrameDelayInput()
      persistNow()

      console.log('Work loaded for editing:', newProject)

      // DOM 更新后渲染编辑器画布
      nextTick(() => {
        renderAll()
      })
    } else if (workDetail?.result?.type === 'STATIC' && workDetail?.result?.coverUrl) {
      // Step 2b: STATIC 类型，从 coverUrl 解析静态图
      console.log('[PixelEditor] STATIC: parsing coverUrl:', workDetail.result.coverUrl)

      try {
        const image = await loadImageFromUrl(workDetail.result.coverUrl)
        console.log('[PixelEditor] STATIC: image loaded:', image.width, 'x', image.height)

        const pixels = renderImageToPixels(image, {
          fit: 'contain',
          cropX: 0.5,
          cropY: 0.5,
          zoom: 1,
          preserveColors: true,
          outputWidth: WIDTH,
          outputHeight: HEIGHT,
          allowUpscale: false,
          dither: 'none',
        })

        // 验证像素数据
        const nonEmptyCount = pixels.filter((p) => p !== null && p !== '').length
        console.log(
          '[PixelEditor] STATIC: pixels extracted:',
          nonEmptyCount,
          '/',
          pixels.length,
          'non-empty'
        )

        if (nonEmptyCount === 0) {
          console.warn('[PixelEditor] STATIC: all pixels are empty! Image may have failed to load.')
        }

        // 打印前10个像素用于调试
        console.log('[PixelEditor] STATIC: first 10 pixels:', pixels.slice(0, 10))

        const newProject = sanitizeProject({
          id: id('project'),
          version: 4,
          name: workDetail.result?.title || t('common.pxm_editor_library_new'),
          width: WIDTH,
          height: HEIGHT,
          currentFrameIndex: 0,
          activeLayer: 0,
          frames: [
            {
              id: id('frame'),
              delay: 120,
              viewportX: DEFAULT_VIEWPORT_X,
              viewportY: DEFAULT_VIEWPORT_Y,
              layers: [
                {
                  id: id('layer'),
                  name: t('common.pxm_editor_layer_one'),
                  visible: true,
                  opacity: 1,
                  pixels,
                  canvasPixels: pixelsToCanvasPixels(pixels, WIDTH, HEIGHT),
                },
                makeLayer(1),
              ],
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        projects.value.push(newProject)
        project.value = newProject
        view.value = 'editor'
        currentId.value = newProject.id
        localStorage.setItem(CURRENT_KEY, newProject.id)

        clearSelectionState()
        syncFrameDelayInput()
        persistNow()

        console.log(
          '[PixelEditor] STATIC: project created with',
          newProject.frames.length,
          'frame(s)'
        )
        console.log(
          '[PixelEditor] STATIC: frame[0].layers[0].pixels length:',
          newProject.frames[0].layers[0].pixels.length
        )
        console.log(
          '[PixelEditor] STATIC: frame[0].layers[0].canvasPixels keys:',
          Object.keys(newProject.frames[0].layers[0].canvasPixels).length
        )

        nextTick(() => {
          renderAll()
        })
      } catch (error) {
        console.error('[PixelEditor] STATIC: failed to parse image:', error)
        throw error
      }
    } else if (
      workDetail?.result?.type === 'GIF' &&
      (workDetail?.result?.gifFileUrl || workDetail?.result?.coverUrl)
    ) {
      // Step 2c: GIF 类型，从 gifFileUrl 或 coverUrl 解析动态图
      const gifUrl = workDetail.result.gifFileUrl || workDetail.result.coverUrl
      console.log('[PixelEditor] No editableFileUrl, parsing GIF from url:', gifUrl)

      // 先下载 GIF 文件
      const response = await fetch(gifUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch GIF: ${response.status} ${response.statusText}`)
      }
      const gifBlob = await response.blob()
      console.log('[PixelEditor] GIF blob size:', gifBlob.size, 'type:', gifBlob.type)
      const gifFile = new File([gifBlob], 'import.gif', { type: 'image/gif' })

      // 解码 GIF 帧
      console.log('[PixelEditor] GIF: decoding frames...')
      const gifFrames = await decodeGifFrames(gifFile)
      console.log('[PixelEditor] GIF: decoded', gifFrames.length, 'frames')

      const frames = gifFrames.map(({ image, delay }) => {
        const frame = makeFrame()
        frame.delay = delay
        const pixels = renderImageToPixels(image, {
          fit: 'contain',
          cropX: 0.5,
          cropY: 0.5,
          zoom: 1,
          preserveColors: true,
          outputWidth: WIDTH,
          outputHeight: HEIGHT,
          allowUpscale: false,
          dither: 'none',
        })

        // 验证像素数据
        const nonEmpty = pixels.filter((p) => p !== null && p !== '').length
        console.log(`[PixelEditor] GIF: frame pixels ${nonEmpty}/${pixels.length} non-empty`)

        frame.layers[0].pixels = pixels
        frame.layers[0].canvasPixels = pixelsToCanvasPixels(pixels, WIDTH, HEIGHT)
        return frame
      })

      console.log('[PixelEditor] All frames processed, total:', frames.length)

      // Validate: check if frames have actual pixel content
      const firstFramePixels = frames[0]?.layers[0]?.pixels || []
      const nonNullCount = firstFramePixels.filter((p) => p !== null && p !== '').length

      if (nonNullCount === 0) {
        console.error('[PixelEditor] GIF parsing resulted in all null pixels!')
        ElMessageBox.confirm(
          t('common.pxm_editor_gif_parse_empty_hint'),
          t('common.pxm_editor_gif_parse_empty_title'),
          {
            confirmButtonText: t('common.pxm_common_confirm'),
            cancelButtonText: t('common.pxm_common_cancel'),
            type: 'warning',
          }
        )
          .then(() => {
            handleNewProject()
          })
          .catch(() => {
            // User cancelled, load empty frames as-is
          })
      } else {
        console.log(
          `[PixelEditor] First frame has ${nonNullCount}/${firstFramePixels.length} non-null pixels`
        )
      }

      const newProject = sanitizeProject({
        id: id('project'),
        version: 4,
        name: workDetail.result?.title || t('common.pxm_editor_library_new'),
        width: WIDTH,
        height: HEIGHT,
        currentFrameIndex: 0,
        activeLayer: 0,
        frames,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      projects.value.push(newProject)
      project.value = newProject
      view.value = 'editor'
      currentId.value = newProject.id
      localStorage.setItem(CURRENT_KEY, newProject.id)

      clearSelectionState()
      syncFrameDelayInput()
      persistNow()

      console.log('GIF parsed and loaded:', newProject)
      nextTick(() => {
        renderAll()
      })
    } else {
      ElMessage.warning(t('common.pxm_editor_no_editable_file'))
      // 如果没有 editableFileUrl 且无法解析图片，创建一个新项目
      handleNewProject()
    }
  } catch (error) {
    console.error('Failed to load work for editing:', error)
    ElMessage.error(t('common.pxm_editor_load_failed'))
    // 失败时回到库视图
    view.value = 'library'
  } finally {
    loadingWork.value = false
  }
}

// 从 URL 加载 JSON 数据
async function fetchJsonFromUrl<T>(url: string): Promise<T> {
  const parsedUrl = new URL(url, window.location.origin)
  const requestUrl = import.meta.env.DEV ? `${parsedUrl.pathname}${parsedUrl.search}` : parsedUrl.href
  const response = await fetch(requestUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Project data interface for loading
interface ProjectData {
  id?: string
  version?: number
  name?: string
  width?: number
  height?: number
  currentFrameIndex?: number
  activeLayer?: number
  frames: Array<{
    id?: string
    delay?: number
    viewportX?: number
    viewportY?: number
    layers: Array<{
      id?: string
      name?: string
      visible?: boolean
      opacity?: number
      pixels: (string | null)[]
      canvasPixels?: Record<string, string>
    }>
  }>
  createdAt?: number
  updatedAt?: number
}


function formatTimestamp(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}


function handleNewProject(): void {
  const stamp = formatTimestamp();

  const newProject = makeProject(`${stamp}`)
  projects.value.push(newProject)
  project.value = newProject
  view.value = 'editor'
  clearSelectionState()
  syncFrameDelayInput()
  persistNow()
  nextTick(renderAll)
}

function handleOpenProject(projectId: string): void {
  const found = projects.value.find((item) => item.id === projectId)
  if (!found) return
  project.value = sanitizeProject(found)
  history.value = []
  future.value = []
  view.value = 'editor'
  clearSelectionState()
  syncFrameDelayInput()
  persistNow()
  nextTick(renderAll)
}

function handleDuplicateProject(projectId: string): void {
  const source = projects.value.find((item) => item.id === projectId)
  if (!source) return
  const copy = sanitizeProject(JSON.parse(JSON.stringify(source)))
  copy.id = id('project')
  copy.name = `${source.name} ${t('common.pxm_editor_copy_suffix')}`
  copy.createdAt = Date.now()
  copy.updatedAt = Date.now()
  projects.value.push(copy)
  persistNow()
  nextTick(renderAll)
}

function handleDeleteProject(projectId: string): void {
  if (!confirm(t('common.pxm_editor_confirm_delete_project'))) return
  projects.value = projects.value.filter((item) => item.id !== projectId)
  if (!projects.value.length) projects.value.push(makeProject())
  if (project.value.id === projectId) project.value = projects.value[0]
  persistNow()
  nextTick(renderAll)
}

function handleExportProjectPng(
  projectId: string,
  projectOverride: typeof project.value | null = null
): void {
  const exportProject = getProjectForExport(projectId, projectOverride)
  if (!exportProject) return
  const scale = exportScale.value || 1
  const canvas = createCanvas(WIDTH * scale, HEIGHT * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = false
  drawPixels(
    ctx,
    compositeFrame(exportProject.frames[exportProject.currentFrameIndex || 0]),
    WIDTH,
    HEIGHT
  )
  canvas.toBlob(
    (blob) => blob && downloadBlob(blob, safeName(exportProject.name, 'png')),
    'image/png'
  )
}

function handleExportProjectGif(
  projectId: string,
  projectOverride: typeof project.value | null = null
): void {
  const exportProject = getProjectForExport(projectId, projectOverride)
  if (!exportProject) return
  if (exportProject.frames.length > MAX_GIF_EXPORT_FRAMES) {
    status.value = t('common.pxm_editor_gif_export_limit', { n: MAX_GIF_EXPORT_FRAMES })
    alert(status.value)
    return
  }
  const sourceFrames = exportProject.frames.map((frame) => ({
    delay: frame.delay,
    pixels: compositeFrame(frame),
  }))
  const resized = resizeFramesForGif(sourceFrames, WIDTH, HEIGHT, exportScale.value || 1)
  const blob = encodeGif({
    width: resized.width,
    height: resized.height,
    scale: 1,
    frames: resized.frames,
  })
  downloadBlob(blob, safeName(exportProject.name, 'gif'))
  status.value = t('common.pxm_editor_gif_exported', {
    count: resized.frames.length,
    width: resized.width,
    height: resized.height,
  })
}

function handleSelectTool(tool: string): void {
  activeTool.value = tool
  if (tool !== 'select') {
    pendingPaste.value = null
    activeSelection.value = null
    selectionTransformBase.value = null
  }
  const toolInfo = tools.value.find((item) => item.id === tool)
  status.value = toolInfo?.label || tool
  renderAll()
}

// Selection management
function clearSelectionState(): void {
  drawing.value = false
  dragStart.value = null
  dragPoint.value = null
  activeSelection.value = null
  selectionTransformBase.value = null
  pendingPaste.value = null
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target) return false
  const tag = (target as HTMLElement).tagName?.toLowerCase()
  return (
    (target as HTMLElement).isContentEditable || ['input', 'textarea', 'select'].includes(tag || '')
  )
}

function handleKeydown(event: KeyboardEvent): void {
  if (view.value !== 'editor' || isTypingTarget(event.target)) return
  const key = event.key.toLowerCase()
  if (key === 'escape') {
    if (
      activeSelection.value ||
      pendingPaste.value ||
      drawing.value ||
      dragStart.value ||
      dragPoint.value
    ) {
      event.preventDefault()
      clearSelectionState()
      status.value = t('common.pxm_editor_cancel_select')
      renderAll()
    }
    return
  }
  const command = event.ctrlKey || event.metaKey
  if (!command) return

  if (key === 'c') {
    event.preventDefault()
    handleCopySelection(false)
  } else if (key === 'x') {
    event.preventDefault()
    handleCopySelection(true)
  } else if (key === 'v') {
    event.preventDefault()
    handleBeginPasteSelection()
  } else if (key === 'z') {
    event.preventDefault()
    if (event.shiftKey) handleRedo()
    else handleUndo()
  } else if (key === 'y') {
    event.preventDefault()
    handleRedo()
  }
}

// History
function snapshot(): void {
  history.value.push(JSON.stringify(project.value))
  if (history.value.length > 80) history.value.shift()
  future.value = []
}

function handleUndo(): void {
  if (!history.value.length) return
  future.value.push(JSON.stringify(project.value))
  replaceProject(sanitizeProject(JSON.parse(history.value.pop() || 'null')))
  status.value = t('common.pxm_editor_undo')
}

function handleRedo(): void {
  if (!future.value.length) return
  history.value.push(JSON.stringify(project.value))
  replaceProject(sanitizeProject(JSON.parse(future.value.pop() || 'null')))
  status.value = t('common.pxm_editor_redo')
}

function replaceProject(newProject: typeof project.value): void {
  const index = projects.value.findIndex((item) => item.id === newProject.id)
  if (index >= 0) projects.value[index] = newProject
  project.value = newProject
  refreshProjectVisibleFromCanvas(project.value)
  clearSelectionState()
  syncFrameDelayInput()
  persistNow()
  nextTick(renderAll)
}

// Project persistence
function touchProject(message: string = t('common.pxm_editor_auto_saved')): void {
  if (currentFrame.value) {
    syncFrameCanvasFromVisible(currentFrame.value, currentViewportX.value, currentViewportY.value)
  }
  project.value.updatedAt = Date.now()
  project.value.activeLayer = activeLayer.value
  status.value = message
  clearTimeout(saveTimer.value)
  saveTimer.value = window.setTimeout(() => {
    persistNow()
  }, 250)
  nextTick(renderAll)
}

// Layer management
function handleSelectLayer(index: number): void {
  activeLayer.value = index
  renderAll()
  nextTick(centerOverviewOnViewport)
}

function centerOverviewOnViewport(): void {
  const scroller = overviewScrollRef.value
  if (!scroller) return
  const zoom = overviewZoom.value
  const centerX = (currentViewportX.value + WIDTH / 2) * zoom
  const centerY = (currentViewportY.value + HEIGHT / 2) * zoom
  const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
  const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  scroller.scrollLeft = Math.max(0, Math.min(maxLeft, centerX - scroller.clientWidth / 2))
  scroller.scrollTop = Math.max(0, Math.min(maxTop, centerY - scroller.clientHeight / 2))
}

function handleUpdateLayerSettings(): void {
  touchProject(t('common.pxm_editor_layer_settings_updated'))
}

function handleRenameProject(): void {
  project.value.name = String(project.value.name || '').slice(0, 48)
  touchProject(t('common.pxm_editor_project_name_updated'))
}

// Frame management
function syncFrameDelayInput(): void {
  frameDelayInput.value = String(currentFrame.value?.delay || 120)
}

function handleCommitFrameDelay(): void {
  if (!currentFrame.value) return
  const raw = String(frameDelayInput.value ?? '').trim()
  const parsed = Number(raw)
  const current = Number(currentFrame.value.delay)
  const fallback = Number.isFinite(current) ? current : 120
  const delay = Math.max(20, Math.min(5000, Number.isFinite(parsed) ? parsed : fallback))
  currentFrame.value.delay = delay
  frameDelayInput.value = String(delay)
  touchProject(t('common.pxm_editor_frame_interval_updated'))
}

function handleAddFrame(): void {
  snapshot()
  project.value.frames.splice(currentFrameIndex.value + 1, 0, makeFrame())
  currentFrameIndex.value += 1
  activeLayer.value = 0
  touchProject(t('common.pxm_editor_frame_added'))
}

function handleDuplicateFrame(): void {
  snapshot()
  const copy = sanitizeProject({
    ...project.value,
    frames: [JSON.parse(JSON.stringify(currentFrame.value))],
  }).frames[0]
  copy.id = id('frame')
  project.value.frames.splice(currentFrameIndex.value + 1, 0, copy)
  currentFrameIndex.value += 1
  touchProject(t('common.pxm_editor_frame_duplicated'))
}

function handleDeleteFrame(): void {
  if (project.value.frames.length <= 1) return
  snapshot()
  project.value.frames.splice(currentFrameIndex.value, 1)
  currentFrameIndex.value = Math.min(currentFrameIndex.value, project.value.frames.length - 1)
  touchProject(t('common.pxm_editor_frame_deleted'))
}

function handleDeleteAllFrames(): void {
  snapshot()
  if (previewPlaying.value) {
    clearTimeout(previewTimer.value)
    previewPlaying.value = false
  }
  project.value.frames = [makeFrame()]
  currentFrameIndex.value = 0
  activeLayer.value = 0
  clearSelectionState()
  touchProject(t('common.pxm_editor_frames_deleted'))
}

function handleSelectFrame(index: number): void {
  currentFrameIndex.value = index
  activeLayer.value = Math.min(activeLayer.value, (currentFrame.value?.layers.length || 1) - 1)
  renderAll()
  nextTick(centerOverviewOnViewport)
}

function handleStartFrameDrag(index: number, event: DragEvent): void {
  draggingFrameIndex.value = index
  dragOverFrameIndex.value = index
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('text/plain', String(index))
}

function handleDragOverFrame(index: number, event: DragEvent): void {
  event.dataTransfer!.dropEffect = 'move'
  dragOverFrameIndex.value = index
}

function handleDropFrame(index: number): void {
  const from = draggingFrameIndex.value
  handleEndFrameDrag()
  if (!Number.isInteger(from) || from === index) return
  reorderFrame(from, index)
}

function handleEndFrameDrag(): void {
  draggingFrameIndex.value = null
  dragOverFrameIndex.value = null
}

function reorderFrame(fromIndex: number, toIndex: number): void {
  if (
    fromIndex < 0 ||
    fromIndex >= project.value.frames.length ||
    toIndex < 0 ||
    toIndex >= project.value.frames.length
  )
    return
  snapshot()
  const currentFrameId = currentFrame.value?.id
  const [frame] = project.value.frames.splice(fromIndex, 1)
  project.value.frames.splice(toIndex, 0, frame)
  currentFrameIndex.value = project.value.frames.findIndex((item) => item.id === currentFrameId)
  touchProject(t('common.pxm_editor_frame_moved', { n: toIndex + 1 }))
}

// Canvas interaction
function canvasPoint(event: PointerEvent): Point | null {
  const canvas = editorCanvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * WIDTH)
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * HEIGHT)
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null
  return {
    x,
    y,
    index: y * WIDTH + x,
    worldX: currentViewportX.value + x,
    worldY: currentViewportY.value + y,
  }
}

function handlePointerDown(event: PointerEvent): void {
  event.preventDefault()
  const point = canvasPoint(event)
  if (!point) return
  hoverPoint.value = point
  if (pendingPaste.value && activeTool.value === 'select') {
    pasteSelectionAt(point)
    return
  }
  if (activeTool.value === 'magic') {
    selectConnectedRegion(point)
    return
  }
  editorCanvasRef.value?.setPointerCapture?.(event.pointerId)
  snapshot()
  drawing.value = true
  dragStart.value = point
  dragPoint.value = point
  if (
    activeTool.value === 'shape' ||
    activeTool.value === 'select' ||
    activeTool.value === 'move'
  ) {
    renderAll()
    return
  }
  applyTool(point)
}

function handlePointerMove(event: PointerEvent): void {
  event.preventDefault()
  const point = canvasPoint(event)
  hoverPoint.value = point
  if (!point) return
  if (!drawing.value) {
    dragPoint.value = point
    if (pendingPaste.value) renderAll()
    return
  }
  if (activeTool.value === 'move') {
    const dx = point.x - dragPoint.value!.x
    const dy = point.y - dragPoint.value!.y
    if (dx || dy) {
      if (moveCanvasPixels(dx, dy)) {
        status.value = t('common.pxm_editor_viewport', {
          x: currentViewportX.value,
          y: currentViewportY.value,
        })
      }
      dragPoint.value = point
    }
    return
  }
  dragPoint.value = point
  if (activeTool.value === 'shape' || activeTool.value === 'select') {
    renderAll()
    return
  }
  applyTool(point)
}

function handlePointerUp(event: PointerEvent): void {
  event?.preventDefault?.()
  if (event?.pointerId !== undefined) {
    try {
      editorCanvasRef.value?.releasePointerCapture?.(event.pointerId)
    } catch {
      // Pointer capture may already be gone after cancellation.
    }
  }
  if (
    drawing.value &&
    activeTool.value === 'shape' &&
    dragStart.value &&
    dragPoint.value &&
    currentLayer.value
  ) {
    applyShape(
      currentLayer.value.pixels,
      dragStart.value,
      dragPoint.value,
      shapeType.value,
      shapeFill.value,
      normalizeHex(currentColor.value)
    )
  } else if (drawing.value && activeTool.value === 'move') {
    touchProject(t('common.pxm_editor_canvas_pixels_moved'))
    drawing.value = false
    dragStart.value = null
    dragPoint.value = null
    return
  } else if (drawing.value && activeTool.value === 'select' && dragStart.value && dragPoint.value) {
    activeSelection.value = pointRect(dragStart.value, dragPoint.value) as SelectionRect
    selectionTransformBase.value = null
    status.value = t('common.pxm_editor_selection_size', {
      w: activeSelection.value.width,
      h: activeSelection.value.height,
    })
    // Remove the last history snapshot since we're creating a selection
    history.value.pop()
    drawing.value = false
    dragStart.value = null
    dragPoint.value = null
    renderAll()
    return
  }
  if (drawing.value) touchProject(t('common.pxm_editor_pixels_edited'))
  drawing.value = false
  dragStart.value = null
  dragPoint.value = null
}

function handlePointerLeave(): void {
  hoverPoint.value = null
}

function moveCanvasPixels(dx: number, dy: number): boolean {
  if (!currentFrame.value) return false
  const moved = moveFrameViewport(currentFrame.value, dx, dy)
  if (moved) renderAll()
  return moved
}

// Drawing tools
function applyTool(point: Point): void {
  if (!currentLayer.value) return
  selectionTransformBase.value = null
  const color = normalizeHex(currentColor.value)
  const pixels = currentLayer.value.pixels

  if (activeTool.value === 'pencil' || activeTool.value === 'eraser') {
    const nextColor = activeTool.value === 'pencil' ? color : EMPTY
    if (pixels[point.index] === nextColor) return
    pixels[point.index] = nextColor
    if (!currentLayer.value.canvasPixels) currentLayer.value.canvasPixels = {}
    const key = pixelKey(point.worldX, point.worldY)
    if (isEmptyPixel(nextColor)) delete currentLayer.value.canvasPixels[key]
    else currentLayer.value.canvasPixels[key] = nextColor
    renderInteractiveEdit()
    return
  }

  if (activeTool.value === 'eyedropper') {
    currentColor.value = pixels[point.index] || '#000000'
    activeTool.value = 'pencil'
    drawing.value = false
  }
  if (activeTool.value === 'fill') {
    floodFill(point.index, color)
    drawing.value = false
  }
  if (activeTool.value !== 'shape') touchProject(t('common.pxm_editor_pixels_edited'))
}

function floodFill(start: number, color: string | null): void {
  if (!currentLayer.value) return
  const pixels = currentLayer.value.pixels
  const target = pixels[start]
  if (target === color) return
  const stack: number[] = [start]
  const seen = new Uint8Array(PIXELS)
  while (stack.length) {
    const index = stack.pop()!
    if (seen[index] || pixels[index] !== target) continue
    seen[index] = 1
    pixels[index] = color
    const x = index % WIDTH
    const y = Math.floor(index / WIDTH)
    if (x > 0) stack.push(index - 1)
    if (x < WIDTH - 1) stack.push(index + 1)
    if (y > 0) stack.push(index - WIDTH)
    if (y < HEIGHT - 1) stack.push(index + WIDTH)
  }
}

// Selection operations
function readSelectionPixels(rect: SelectionRect): (string | null)[] {
  const pixels: (string | null)[] = []
  const mask = rect.mask || null
  if (!currentLayer.value) return pixels
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const localIndex = y * rect.width + x
      if (mask && !mask[localIndex]) {
        pixels.push(EMPTY)
        continue
      }
      const color = currentLayer.value.pixels[(rect.y + y) * WIDTH + rect.x + x]
      pixels.push(isEmptyPixel(color) ? EMPTY : color)
    }
  }
  return pixels
}

function clearSelectionPixels(rect: SelectionRect): void {
  if (!currentLayer.value) return
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      if (rect.mask && !rect.mask[y * rect.width + x]) continue
      setPixel(currentLayer.value.pixels, rect.x + x, rect.y + y, EMPTY)
    }
  }
}

function selectConnectedRegion(point: Point): void {
  if (!currentLayer.value) return
  const pixels = currentLayer.value.pixels
  const target = pixels[point.index] ?? EMPTY
  const seen = new Uint8Array(PIXELS)
  const selected: number[] = []
  const stack: number[] = [point.index]
  let minX = WIDTH
  let minY = HEIGHT
  let maxX = -1
  let maxY = -1

  while (stack.length) {
    const index = stack.pop()!
    if (seen[index] || (pixels[index] ?? EMPTY) !== target) continue
    seen[index] = 1
    selected.push(index)
    const x = index % WIDTH
    const y = Math.floor(index / WIDTH)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    if (x > 0) stack.push(index - 1)
    if (x < WIDTH - 1) stack.push(index + 1)
    if (y > 0) stack.push(index - WIDTH)
    if (y < HEIGHT - 1) stack.push(index + WIDTH)
  }

  if (!selected.length) return
  const rect: SelectionRect = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
  const mask = new Array(rect.width * rect.height).fill(false)
  selected.forEach((index) => {
    const x = index % WIDTH
    const y = Math.floor(index / WIDTH)
    mask[(y - rect.y) * rect.width + (x - rect.x)] = true
  })
  activeSelection.value = { ...rect, mask }
  selectionTransformBase.value = null
  pendingPaste.value = null
  status.value = t('common.pxm_editor_connected_pixels', { n: selected.length })
  renderAll()
}

function handleTransformSelection(mode: string): void {
  if (!activeSelection.value || !currentLayer.value) {
    status.value = t('common.pxm_editor_no_select_hint')
    return
  }
  const rect = activeSelection.value
  const source = readSelectionPixels(rect)
  const rotate = mode === 'rotate-cw' || mode === 'rotate-ccw'

  if (rotate) {
    if (!selectionTransformBase.value) {
      selectionTransformBase.value = {
        angle: 0,
        rect: { ...rect },
        pixels: source.slice(),
      }
    }
    const base = selectionTransformBase.value!
    base.angle += mode === 'rotate-cw' ? 5 : -5
    const placed = rotateSelectionPixels(base, base.angle)
    let minX = WIDTH
    let minY = HEIGHT
    let maxX = -1
    let maxY = -1
    placed.forEach((_, key) => {
      const [x, y] = key.split(',').map(Number)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    })

    if (!placed.size) {
      base.angle -= mode === 'rotate-cw' ? 5 : -5
      status.value = t('common.pxm_editor_no_rotatable')
      return
    }

    snapshot()
    clearSelectionPixels(rect)
    placed.forEach((color, key) => {
      const [x, y] = key.split(',').map(Number)
      setPixel(currentLayer.value!.pixels, x, y, color)
    })
    activeSelection.value = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
  } else {
    selectionTransformBase.value = null
    const targetWidth = rect.width
    const targetHeight = rect.height
    const transformed = new Array<string | null>(targetWidth * targetHeight).fill(EMPTY)
    for (let y = 0; y < rect.height; y += 1) {
      for (let x = 0; x < rect.width; x += 1) {
        let tx = x
        let ty = y
        if (mode === 'flip-h') {
          tx = rect.width - 1 - x
        } else if (mode === 'flip-v') {
          ty = rect.height - 1 - y
        }
        transformed[ty * targetWidth + tx] = source[y * rect.width + x]
      }
    }

    snapshot()
    clearSelectionPixels(rect)
    for (let y = 0; y < targetHeight; y += 1) {
      for (let x = 0; x < targetWidth; x += 1) {
        const color = transformed[y * targetWidth + x]
        setPixel(
          currentLayer.value!.pixels,
          rect.x + x,
          rect.y + y,
          isEmptyPixel(color) ? EMPTY : color
        )
      }
    }
    activeSelection.value = { x: rect.x, y: rect.y, width: targetWidth, height: targetHeight }
  }

  pendingPaste.value = null
  activeTool.value = 'select'
  touchProject(t('common.pxm_editor_transform_done'))
}

function handleCopySelection(cut: boolean): void {
  if (!activeSelection.value) {
    status.value = t('common.pxm_editor_no_select_hint')
    return
  }
  const rect = activeSelection.value
  const pixels = readSelectionPixels(rect)
  selectionClipboard.value = { width: rect.width, height: rect.height, pixels }
  if (cut) {
    snapshot()
    selectionTransformBase.value = null
    clearSelectionPixels(rect)
    preparePasteFromClipboard(rect, t('common.pxm_editor_cut_paste_hint'))
    touchProject(t('common.pxm_editor_cut_paste_hint'))
  } else {
    preparePasteFromClipboard(rect, t('common.pxm_editor_copy_area_hint'))
    renderAll()
  }
}

function handleDeleteSelection(): void {
  if (!activeSelection.value) {
    status.value = t('common.pxm_editor_no_select_hint')
    return
  }
  snapshot()
  clearSelectionPixels(activeSelection.value)
  clearSelectionState()
  touchProject(t('common.pxm_editor_delete_selection'))
}

function handleBeginPasteSelection(): void {
  if (!selectionClipboard.value) {
    status.value = t('common.pxm_editor_copy_paste_hint')
    return
  }
  preparePasteFromClipboard(activeSelection.value, t('common.pxm_editor_copy_area_hint'))
  renderAll()
}

function preparePasteFromClipboard(
  originRect: SelectionRect | null,
  statusMsg: string = t('common.pxm_editor_copy_area_hint')
): void {
  if (!selectionClipboard.value) return
  pendingPaste.value = selectionClipboard.value
  activeSelection.value = null
  activeTool.value = 'select'
  if (originRect)
    dragPoint.value = { x: originRect.x, y: originRect.y, index: 0, worldX: 0, worldY: 0 }
  status.value = statusMsg
}

function pasteSelectionAt(point: Point): void {
  if (!pendingPaste.value || !currentLayer.value) return
  snapshot()
  const clip = pendingPaste.value
  for (let y = 0; y < clip.height; y += 1) {
    for (let x = 0; x < clip.width; x += 1) {
      const tx = point.x + x
      const ty = point.y + y
      if (tx >= WIDTH || ty >= HEIGHT) continue
      const color = clip.pixels[y * clip.width + x]
      if (isEmptyPixel(color)) continue
      setPixel(currentLayer.value.pixels, tx, ty, color)
    }
  }
  activeSelection.value = {
    x: point.x,
    y: point.y,
    width: Math.min(clip.width, WIDTH - point.x),
    height: Math.min(clip.height, HEIGHT - point.y),
  }
  selectionTransformBase.value = null
  pendingPaste.value = null
  touchProject(t('common.pxm_editor_pasted'))
}

// Rendering
function renderInteractiveEdit(): void {
  renderEditor()
  if (interactiveRenderPending.value) return
  interactiveRenderPending.value = true
  const schedule =
    window.requestAnimationFrame || ((callback: FrameRequestCallback) => setTimeout(callback, 16))
  schedule(() => {
    interactiveRenderPending.value = false
    if (view.value !== 'editor') return
    renderPreview(compositeFrame(currentFrame.value))
    renderOverview()
  })
}

function renderAll(): void {
  if (view.value === 'library') {
    nextTick(renderProjectThumbs)
    return
  }
  if (!editorCanvasRef.value) return
  renderEditor()
  renderPreview(compositeFrame(currentFrame.value))
  nextTick(renderFrameThumbs)
  nextTick(renderOverview)
}

function renderEditor(): void {
  const canvas = editorCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#05070b'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Onion skin
  if (onion.enabled && project.value.frames[currentFrameIndex.value - 1]) {
    const prevPixels = compositeFrame(project.value.frames[currentFrameIndex.value - 1])
    if (onion.colorMode === 'tint') {
      drawOnionPixels(ctx, prevPixels, WIDTH, HEIGHT, '#36d6ff', onion.prevOpacity)
    } else {
      drawNonEmptyPixels(ctx, prevPixels, WIDTH, HEIGHT, onion.prevOpacity)
    }
  }
  if (onion.enabled && project.value.frames[currentFrameIndex.value + 1]) {
    const nextPixels = compositeFrame(project.value.frames[currentFrameIndex.value + 1])
    if (onion.colorMode === 'tint') {
      drawOnionPixels(ctx, nextPixels, WIDTH, HEIGHT, '#ff4fb8', onion.nextOpacity)
    } else {
      drawNonEmptyPixels(ctx, nextPixels, WIDTH, HEIGHT, onion.nextOpacity)
    }
  }

  // Main frame
  const editorPixels = compositeFrame(currentFrame.value)
  drawNonEmptyPixels(ctx, editorPixels, WIDTH, HEIGHT)

  // Shape preview
  if (
    activeTool.value === 'shape' &&
    drawing.value &&
    dragStart.value &&
    dragPoint.value &&
    currentLayer.value
  ) {
    const preview = currentLayer.value.pixels.slice()
    applyShape(
      preview,
      dragStart.value,
      dragPoint.value,
      shapeType.value,
      shapeFill.value,
      normalizeHex(currentColor.value)
    )
    drawNonEmptyPixels(ctx, preview, WIDTH, HEIGHT, 0.35)
  }

  // Selection outlines
  const cw = canvas.width / WIDTH
  const ch = canvas.height / HEIGHT
  const drawSelectionOutline = (rect: SelectionRect | null, color: string): void => {
    if (!rect) return
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([7, 5])
    ctx.strokeRect(
      rect.x * cw + 1,
      rect.y * ch + 1,
      Math.max(0, rect.width * cw - 2),
      Math.max(0, rect.height * ch - 2)
    )
    ctx.restore()
  }

  if (activeTool.value === 'select' && drawing.value && dragStart.value && dragPoint.value) {
    drawSelectionOutline(pointRect(dragStart.value, dragPoint.value) as SelectionRect, '#ffffff')
  } else if (activeSelection.value) {
    drawSelectionOutline(activeSelection.value, '#5bd08b')
  }
  if (pendingPaste.value && dragPoint.value) {
    drawSelectionOutline(
      {
        x: dragPoint.value.x,
        y: dragPoint.value.y,
        width: Math.min(pendingPaste.value.width, WIDTH - dragPoint.value.x),
        height: Math.min(pendingPaste.value.height, HEIGHT - dragPoint.value.y),
      },
      '#ffec27'
    )
  }

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,.16)'
  ctx.lineWidth = 1
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (!isEmptyPixel(editorPixels[y * WIDTH + x])) continue
      ctx.strokeRect(
        Math.round(x * cw) + 0.5,
        Math.round(y * ch) + 0.5,
        Math.round(cw),
        Math.round(ch)
      )
    }
  }
}

function renderPreview(pixels: (string | null)[]): void {
  const canvas = previewCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#05070b'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const cw = canvas.width / WIDTH
  const ch = canvas.height / HEIGHT
  const gap = Math.max(1, Math.floor(Math.min(cw, ch) * 0.08))

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const color = pixels[y * WIDTH + x]
      const px = x * cw
      const py = y * ch
      const innerX = px + gap
      const innerY = py + gap
      const innerW = Math.max(1, cw - gap * 2)
      const innerH = Math.max(1, ch - gap * 2)

      ctx.fillStyle = '#101520'
      ctx.fillRect(px, py, cw, ch)

      if (isEmptyPixel(color)) {
        ctx.fillStyle = '#070a10'
        ctx.fillRect(innerX, innerY, innerW, innerH)
        continue
      }

      ctx.fillStyle = color
      ctx.fillRect(innerX, innerY, innerW, innerH)

      const centerX = px + cw / 2
      const centerY = py + ch / 2
      const glowRadius = Math.min(innerW, innerH) * 0.48
      const glowColor = mixWithWhite(color, 0.52)
      const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
      glow.addColorStop(0, glowColor)
      glow.addColorStop(0.74, mixWithWhite(color, 0.28))
      glow.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// Layer operations
function handleAddLayer(): void {
  if (!currentFrame.value || currentFrame.value.layers.length >= 4) return
  snapshot()
  currentFrame.value.layers.push(makeLayer(currentFrame.value.layers.length))
  activeLayer.value = currentFrame.value.layers.length - 1
  touchProject(t('common.pxm_editor_layer_added'))
}

function handleDeleteLayer(index: number): void {
  if (!currentFrame.value || currentFrame.value.layers.length <= 2) return
  snapshot()
  currentFrame.value.layers.splice(index, 1)
  activeLayer.value = Math.min(activeLayer.value, currentFrame.value.layers.length - 1)
  touchProject(t('common.pxm_editor_layer_deleted'))
}

function handleClearLayer(): void {
  if (!currentLayer.value) return
  snapshot()
  currentLayer.value.pixels = emptyPixels()
  currentLayer.value.canvasPixels = {}
  touchProject(t('common.pxm_editor_layer_cleared'))
}

// Text stamp
async function handleStampText(align: number): Promise<void> {
  if (!textTool.text.trim()) return
  const size = fusionFontSize(textTool.size)
  const widthMode = fusionFontWidthMode(textTool.widthMode)
  try {
    await ensureFusionFontsLoaded(size, widthMode)
  } catch (error) {
    console.warn('[pixelart_web_editor] Fusion Pixel font load failed:', error)
  }
  if (!currentFrame.value) return
  syncFrameCanvasFromVisible(currentFrame.value, currentViewportX.value, currentViewportY.value)
  snapshot()
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#fff'
  ctx.font = `${size}px ${fusionFontFamilies(size, widthMode)}, monospace`
  ctx.fontKerning = 'none'
  ctx.fontStretch = 'normal'
  ctx.fontVariantCaps = 'normal'
  ctx.textBaseline = 'top'
  const lines = String(textTool.text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lineHeight = size
  const blockHeight = lines.length * lineHeight
  const startY = currentViewportY.value + Math.floor((HEIGHT - blockHeight) / 2)
  lines.forEach((line, index) => {
    const width = Math.ceil(ctx.measureText(line).width)
    const x =
      align === 0
        ? currentViewportX.value
        : align === 1
          ? currentViewportX.value + Math.floor((WIDTH - width) / 2)
          : currentViewportX.value + WIDTH - width
    ctx.fillText(line, x, startY + index * lineHeight)
  })
  const color = normalizeHex(currentColor.value)
  const data = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data
  const canvasPixels = { ...(currentLayer.value?.canvasPixels || {}) }
  for (let y = 0; y < CANVAS_HEIGHT; y += 1) {
    for (let x = 0; x < CANVAS_WIDTH; x += 1) {
      const dataIndex = (y * CANVAS_WIDTH + x) * 4
      if (data[dataIndex + 3] >= TEXT_ALPHA_THRESHOLD) canvasPixels[`${x},${y}`] = color
    }
  }
  if (currentLayer.value) {
    currentLayer.value.canvasPixels = canvasPixels
    refreshLayerVisibleFromCanvas(
      currentLayer.value,
      currentViewportX.value,
      currentViewportY.value
    )
  }
  touchProject(t('common.pxm_editor_text_stamped'))
}

// Image import
async function handleLoadStaticImage(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  importDialog.image = await imageFromFile(file)
  importDialog.open = true
  handleResetImportCrop(false)
  await nextTick()
  renderImportPreview()
}

function handleResetImportCrop(render: boolean = true): void {
  importDialog.cropX = 0.5
  importDialog.cropY = 0.5
  importDialog.zoom = 1
  importDialog.dragging = false
  importDialog.dragStart = null
  importDialog.dragCropStart = null
  if (render) renderImportPreview()
}

function handleImportPointerDown(event: PointerEvent): void {
  if (!importDialog.image) return
  event.preventDefault()
  importDialog.dragging = true
  importDialog.dragStart = { x: event.clientX, y: event.clientY }
  importDialog.dragCropStart = { x: importDialog.cropX, y: importDialog.cropY }
  importCropCanvasRef.value?.setPointerCapture?.(event.pointerId)
}

function handleImportPointerMove(event: PointerEvent): void {
  if (!importDialog.dragging || !importDialog.dragStart || !importDialog.dragCropStart) return
  event.preventDefault()
  const canvas = importCropCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const dx = ((event.clientX - importDialog.dragStart.x) / rect.width) * WIDTH
  const dy = ((event.clientY - importDialog.dragStart.y) / rect.height) * HEIGHT
  const geom = importImageGeometry()
  const clamp = (value: number) => Math.max(0, Math.min(1, value))

  if (importDialog.fit === 'stretch') {
    const zoom = Math.max(1, Number(importDialog.zoom || 1))
    importDialog.cropX = clamp(importDialog.dragCropStart.x - dx / WIDTH / zoom)
    importDialog.cropY = clamp(importDialog.dragCropStart.y - dy / HEIGHT / zoom)
  } else {
    const xRange = WIDTH - geom.dw
    const yRange = HEIGHT - geom.dh
    if (Math.abs(xRange) > 0.001)
      importDialog.cropX = clamp(importDialog.dragCropStart.x + dx / xRange)
    if (Math.abs(yRange) > 0.001)
      importDialog.cropY = clamp(importDialog.dragCropStart.y + dy / yRange)
  }
  renderImportPreview()
}

function handleImportPointerUp(event: PointerEvent): void {
  importDialog.dragging = false
  importDialog.dragStart = null
  importDialog.dragCropStart = null
  if (event?.pointerId !== undefined) {
    try {
      importCropCanvasRef.value?.releasePointerCapture?.(event.pointerId)
    } catch {
      // Pointer capture may already be gone after cancellation.
    }
  }
}

function handleImportWheel(event: WheelEvent): void {
  if (!importDialog.image) return
  const nextZoom = Number(importDialog.zoom || 1) + (event.deltaY < 0 ? 0.1 : -0.1)
  importDialog.zoom = Math.max(0.5, Math.min(4, Number(nextZoom.toFixed(2))))
  renderImportPreview()
}

function importImageGeometry(): {
  iw: number
  ih: number
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
  dw: number
  dh: number
} {
  const image = importDialog.image
  const iw = image?.width || image?.videoWidth || WIDTH
  const ih = image?.height || image?.videoHeight || HEIGHT
  const zoom = Number(importDialog.zoom || 1)
  if (importDialog.fit === 'stretch') {
    return { iw, ih, sx: 0, sy: 0, sw: iw, sh: ih, dx: 0, dy: 0, dw: WIDTH, dh: HEIGHT }
  }
  const scale =
    (importDialog.fit === 'cover'
      ? Math.max(WIDTH / iw, HEIGHT / ih)
      : Math.min(WIDTH / iw, HEIGHT / ih)) * zoom
  const dw = Math.max(1, iw * scale)
  const dh = Math.max(1, ih * scale)
  const dx = (WIDTH - dw) * importDialog.cropX
  const dy = (HEIGHT - dh) * importDialog.cropY
  return { iw, ih, sx: 0, sy: 0, sw: iw, sh: ih, dx, dy, dw, dh }
}

function drawImportCropper(): void {
  const canvas = importCropCanvasRef.value
  const image = importDialog.image
  if (!canvas || !image) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const scaleX = canvas.width / WIDTH
  const scaleY = canvas.height / HEIGHT
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#05070b'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const geom = importImageGeometry()
  ctx.save()
  ctx.imageSmoothingEnabled = true
  if (importDialog.fit === 'stretch') {
    const zoom = Math.max(1, Number(importDialog.zoom || 1))
    const sw = geom.iw / zoom
    const sh = geom.ih / zoom
    const sx = (geom.iw - sw) * importDialog.cropX
    const sy = (geom.ih - sh) * importDialog.cropY
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  } else {
    ctx.drawImage(image, geom.dx * scaleX, geom.dy * scaleY, geom.dw * scaleX, geom.dh * scaleY)
  }
  ctx.restore()

  ctx.strokeStyle = 'rgba(255,255,255,.2)'
  ctx.lineWidth = 1
  for (let x = 0; x <= WIDTH; x += 1) {
    ctx.beginPath()
    ctx.moveTo(Math.round(x * scaleX) + 0.5, 0)
    ctx.lineTo(Math.round(x * scaleX) + 0.5, canvas.height)
    ctx.stroke()
  }
  for (let y = 0; y <= HEIGHT; y += 1) {
    ctx.beginPath()
    ctx.moveTo(0, Math.round(y * scaleY) + 0.5)
    ctx.lineTo(canvas.width, Math.round(y * scaleY) + 0.5)
    ctx.stroke()
  }
  ctx.strokeStyle = '#5bd08b'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3)
}

function renderImportPreview(): void {
  if (!importDialog.image) return
  drawImportCropper()
  importDialog.pixels = renderImageToPixels(importDialog.image, importDialog)
  const ctx = importCanvasRef.value?.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#05070b'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    drawPixels(ctx, importDialog.pixels, WIDTH, HEIGHT)
  }
}

function handleCloseImportDialog(): void {
  importDialog.open = false
  importDialog.image = null
  importDialog.dragging = false
}

function handleApplyImportToLayer(): void {
  if (!currentLayer.value) return
  snapshot()
  const pixels = renderImageToPixels(importDialog.image, {
    ...importDialog,
    outputWidth: CANVAS_WIDTH,
    outputHeight: CANVAS_HEIGHT,
    allowUpscale: false,
    preserveColors: true,
  })
  currentViewportX.value = DEFAULT_VIEWPORT_X
  currentViewportY.value = DEFAULT_VIEWPORT_Y
  currentLayer.value.canvasPixels = pixelsToCanvasPixels(pixels, CANVAS_WIDTH, CANVAS_HEIGHT)
  refreshLayerVisibleFromCanvas(currentLayer.value, currentViewportX.value, currentViewportY.value)
  handleCloseImportDialog()
  touchProject(t('common.pxm_editor_import_image_pixelated'))
}

async function handleLoadGifImage(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  try {
    const gifFrames = await decodeGifFrames(file)
    snapshot()
    const frames = gifFrames.map(({ image, delay }) => {
      const frame = makeFrame()
      frame.delay = delay
      const pixels = renderImageToPixels(image, {
        fit: 'contain',
        cropX: 0.5,
        cropY: 0.5,
        zoom: 1,
        preserveColors: true,
        outputWidth: WIDTH,
        outputHeight: HEIGHT,
        allowUpscale: false,
        dither: 'none',
      })
      frame.layers[0].pixels = pixels
      frame.layers[0].canvasPixels = pixelsToCanvasPixels(pixels, WIDTH, HEIGHT)
      return frame
    })
    project.value.frames.splice(currentFrameIndex.value + 1, 0, ...frames)
    currentFrameIndex.value += 1
    touchProject(t('common.pxm_editor_gif_imported', { count: frames.length }))
  } catch (error) {
    status.value = (error as Error).message
  }
}

function handleExportPng(): void {
  handleExportProjectPng(project.value.id, project.value)
}

function handleExportGif(): void {
  handleExportProjectGif(project.value.id, project.value)
}

// Preview
function handleTogglePreview(): void {
  if (previewPlaying.value) {
    clearTimeout(previewTimer.value)
    previewPlaying.value = false
    renderPreview(compositeFrame(currentFrame.value))
    return
  }
  previewPlaying.value = true
  let index = 0
  let played = 0
  const tick = () => {
    if (!previewPlaying.value) return
    renderPreview(compositeFrame(project.value.frames[index]))
    const delay = project.value.frames[index].delay
    played += 1
    if (played >= project.value.frames.length) {
      previewPlaying.value = false
      return
    }
    index += 1
    previewTimer.value = window.setTimeout(tick, delay)
  }
  tick()
}

// Persistence
function persistNow(): void {
  if (currentFrame.value) {
    syncFrameCanvasFromVisible(currentFrame.value, currentViewportX.value, currentViewportY.value)
  }
  const index = projects.value.findIndex((item) => item.id === project.value.id)
  if (index >= 0) projects.value[index] = project.value
  else projects.value.push(project.value)
  saveProjects(projects.value)
  localStorage.setItem(CURRENT_KEY, project.value.id)
}

function getProjectForExport(
  projectId: string,
  projectOverride: typeof project.value | null = null
): typeof project.value | null {
  if (projectOverride) return projectOverride
  if (project.value.id === projectId) {
    persistNow()
    return project.value
  }
  return projects.value.find((item) => item.id === projectId) || null
}

// File input click handlers
function handleStaticFileInputClick(): void {
  staticFileInputRef.value?.click()
}

function handleGifFileInputClick(): void {
  gifFileInputRef.value?.click()
}

// Format time
function formatTime(ts: number): string {
  return new Date(ts || Date.now()).toLocaleString(currentLocale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Lifecycle hooks
onMounted(() => {
  applyTheme()
  syncFrameDelayInput()
  keydownHandler.value = handleKeydown
  window.addEventListener('keydown', keydownHandler.value)
  persistNow()
  nextTick(renderAll)

  // 检查是否有编辑作品的路由参数
  const workId = route.query.workId as string
  if (workId) {
    console.log('Loading work for editing:', workId)
    loadWorkForEdit(workId).then(() => {
      nextTick(renderAll)
    })
  } else {
    // 没有编辑参数，进入库视图
    // view.value = 'library'
    //   alert('初始化直接进入')
    handleNewProject()
  }

  // 启动自动保存：每 30 秒轮询一次
  autoSaveTimer.value = window.setInterval(() => {
    doSilentSave().catch((err) => {
      console.warn('Auto-save tick error:', err)
    })
  }, AUTO_SAVE_INTERVAL)
})

onBeforeUnmount(() => {
  // 离开页面前尝试一次静默保存
  doSilentSave().catch(() => {})
  if (keydownHandler.value) {
    window.removeEventListener('keydown', keydownHandler.value)
  }
  // 清理定时器
  if (autoSaveTimer.value) {
    window.clearInterval(autoSaveTimer.value)
    autoSaveTimer.value = null
  }
})

// Expose methods for parent components
defineExpose({
  project,
  view,
})
</script>

<!-- <script lang="ts" src="./PixelEditor.ts"></script> -->

<style lang="css" src="./styles.css" />
