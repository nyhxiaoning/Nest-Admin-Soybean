import { defineComponent, ref, computed, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Ref, CanvasHTMLAttributes } from 'vue'

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


export default function setup() {

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

  // Tools
  const tools = ref<Tool[]>([
    { id: 'pencil', label: '画笔' },
    { id: 'eraser', label: '橡皮' },
    { id: 'fill', label: '填充' },
    { id: 'eyedropper', label: '吸色' },
    { id: 'shape', label: '绘制形状' },
    { id: 'select', label: '选择区域' },
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
  const status = ref<string>('准备就绪')

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
    const host = document.querySelector('.pe-theme-host') as HTMLElement | null
    if (host) host.dataset.theme = theme.value
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
    touchProject(`视窗 ${currentViewportX.value}, ${currentViewportY.value}`)
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

  // Project management
  function handleNewProject(): void {
    const stamp = new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    const newProject = makeProject(`PixelMug ${stamp}`)
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
    copy.name = `${source.name} 副本`
    copy.createdAt = Date.now()
    copy.updatedAt = Date.now()
    projects.value.push(copy)
    persistNow()
    nextTick(renderAll)
  }

  function handleDeleteProject(projectId: string): void {
    if (!confirm('确定删除这个作品吗？')) return
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
      status.value = `GIF 最多导出 ${MAX_GIF_EXPORT_FRAMES} 帧，请先减少帧数`
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
    status.value = `GIF 已导出：${resized.frames.length} 帧，${resized.width} x ${resized.height}`
  }

  function handleSelectTool(tool: string): void {
    activeTool.value = tool
    if (tool !== 'select') {
      pendingPaste.value = null
      activeSelection.value = null
      selectionTransformBase.value = null
    }
    const toolInfo = tools.value.find((item) => item.id === tool)
    status.value = toolInfo?.label || (tool === 'move' ? '移动' : tool === 'magic' ? '魔法棒' : tool)
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
        status.value = '已取消选择'
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
    status.value = '已撤销'
  }

  function handleRedo(): void {
    if (!future.value.length) return
    history.value.push(JSON.stringify(project.value))
    replaceProject(sanitizeProject(JSON.parse(future.value.pop() || 'null')))
    status.value = '已重做'
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
  function touchProject(message: string = '已自动保存'): void {
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
    touchProject('图层设置已更新')
  }

  function handleRenameProject(): void {
    project.value.name = String(project.value.name || '').slice(0, 48)
    touchProject('作品名称已更新')
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
    touchProject('帧间隔已更新')
  }

  function handleAddFrame(): void {
    snapshot()
    project.value.frames.splice(currentFrameIndex.value + 1, 0, makeFrame())
    currentFrameIndex.value += 1
    activeLayer.value = 0
    touchProject('已新增帧')
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
    touchProject('已复制帧')
  }

  function handleDeleteFrame(): void {
    if (project.value.frames.length <= 1) return
    snapshot()
    project.value.frames.splice(currentFrameIndex.value, 1)
    currentFrameIndex.value = Math.min(currentFrameIndex.value, project.value.frames.length - 1)
    touchProject('已删除帧')
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
    touchProject('已删除全部帧，保留 1 帧空白帧')
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
    touchProject(`已移动到第 ${toIndex + 1} 帧`)
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
          status.value = `视窗 ${currentViewportX.value}, ${currentViewportY.value}`
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
      touchProject('已移动画布像素')
      drawing.value = false
      dragStart.value = null
      dragPoint.value = null
      return
    } else if (drawing.value && activeTool.value === 'select' && dragStart.value && dragPoint.value) {
      activeSelection.value = pointRect(dragStart.value, dragPoint.value) as SelectionRect
      selectionTransformBase.value = null
      status.value = `已选择 ${activeSelection.value.width} x ${activeSelection.value.height} 区域`
      // Remove the last history snapshot since we're creating a selection
      history.value.pop()
      drawing.value = false
      dragStart.value = null
      dragPoint.value = null
      renderAll()
      return
    }
    if (drawing.value) touchProject('已编辑像素')
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
    if (activeTool.value !== 'shape') touchProject('已编辑像素')
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
    status.value = `已选择连通区域 ${selected.length} 像素`
    renderAll()
  }

  function handleTransformSelection(mode: string): void {
    if (!activeSelection.value || !currentLayer.value) {
      status.value = '请先使用选择区域工具框选区域'
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
        status.value = '选区内没有可旋转的像素'
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
    touchProject('已变换选区')
  }

  function handleCopySelection(cut: boolean): void {
    if (!activeSelection.value) {
      status.value = '请先使用选择区域工具框选区域'
      return
    }
    const rect = activeSelection.value
    const pixels = readSelectionPixels(rect)
    selectionClipboard.value = { width: rect.width, height: rect.height, pixels }
    if (cut) {
      snapshot()
      selectionTransformBase.value = null
      clearSelectionPixels(rect)
      preparePasteFromClipboard(rect, '已剪切区域，移动鼠标并单击放置')
      touchProject('已剪切区域，移动鼠标并单击放置')
    } else {
      preparePasteFromClipboard(rect, '已复制区域，移动鼠标并单击放置')
      renderAll()
    }
  }

  function handleDeleteSelection(): void {
    if (!activeSelection.value) {
      status.value = '请先使用选择区域工具框选区域'
      return
    }
    snapshot()
    clearSelectionPixels(activeSelection.value)
    clearSelectionState()
    touchProject('已删除选区像素')
  }

  function handleBeginPasteSelection(): void {
    if (!selectionClipboard.value) {
      status.value = '请先复制或剪切一个区域'
      return
    }
    preparePasteFromClipboard(activeSelection.value, '移动鼠标并单击放置区域')
    renderAll()
  }

  function preparePasteFromClipboard(
    originRect: SelectionRect | null,
    statusMsg: string = '移动鼠标并单击放置区域'
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
    touchProject('已粘贴区域')
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
    touchProject('已新增图层')
  }

  function handleDeleteLayer(index: number): void {
    if (!currentFrame.value || currentFrame.value.layers.length <= 2) return
    snapshot()
    currentFrame.value.layers.splice(index, 1)
    activeLayer.value = Math.min(activeLayer.value, currentFrame.value.layers.length - 1)
    touchProject('已删除图层')
  }

  function handleClearLayer(): void {
    if (!currentLayer.value) return
    snapshot()
    currentLayer.value.pixels = emptyPixels()
    currentLayer.value.canvasPixels = {}
    touchProject('已清空当前图层')
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
    touchProject('已生成像素文字')
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
    touchProject('图片已像素化导入')
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
          outputWidth: CANVAS_WIDTH,
          outputHeight: CANVAS_HEIGHT,
          allowUpscale: false,
        })
        frame.layers[0].pixels = pixels
        frame.layers[0].canvasPixels = pixelsToCanvasPixels(pixels, CANVAS_WIDTH, CANVAS_HEIGHT)
        refreshLayerVisibleFromCanvas(frame.layers[0], DEFAULT_VIEWPORT_X, DEFAULT_VIEWPORT_Y)
        return frame
      })
      project.value.frames.splice(currentFrameIndex.value + 1, 0, ...frames)
      currentFrameIndex.value += 1
      touchProject(`已导入 GIF ${frames.length} 帧`)
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
    return new Date(ts || Date.now()).toLocaleString('zh-CN', {
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
  })

  onBeforeUnmount(() => {
    if (keydownHandler.value) {
      window.removeEventListener('keydown', keydownHandler.value)
    }
  })

  // Expose methods for parent components
  defineExpose({
    project,
    view,
  })
}