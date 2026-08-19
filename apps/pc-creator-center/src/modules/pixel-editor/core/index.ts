/**
 * Pixel Editor Core Module
 * 核心像素编辑器逻辑
 */

// ==================== Constants ====================

export const WIDTH = 32;
export const HEIGHT = 16;
export const PIXELS = WIDTH * HEIGHT;
export const CANVAS_WIDTH = 256;
export const CANVAS_HEIGHT = 256;
export const DEFAULT_VIEWPORT_X = Math.floor((CANVAS_WIDTH - WIDTH) / 2);
export const DEFAULT_VIEWPORT_Y = Math.floor((CANVAS_HEIGHT - HEIGHT) / 2);
export const EMPTY: null = null;
export const STORAGE_KEY = 'pixelart_web_editor_projects';
export const CURRENT_KEY = 'pixelart_web_editor_current_project';
export const MAX_GIF_EXPORT_FRAMES = 50;

export const palette = [
  '#000000', '#ffffff', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c',
  '#7e2553', '#ab5236', '#ff77a8', '#ffccaa', '#c2c3c7', '#5f574f', '#008751', '#1d2b53',
  '#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600', '#2f4b7c', '#00b8a9', '#f6416c',
];

// ==================== Type Definitions ====================

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  pixels: (string | null)[];
  canvasPixels: Record<string, string>;
}

export interface Frame {
  id: string;
  delay: number;
  viewportX: number;
  viewportY: number;
  layers: Layer[];
}

export interface Project {
  id: string;
  version: number;
  name: string;
  width: number;
  height: number;
  currentFrameIndex: number;
  activeLayer: number;
  frames: Frame[];
  createdAt: number;
  updatedAt: number;
}

// ==================== Utility Functions ====================

export function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyPixels(fill: string | null = EMPTY): (string | null)[] {
  return Array.from({ length: PIXELS }, () => fill);
}

export function makeLayer(index: number = 0): Layer {
  return {
    id: id('layer'),
    name: `图层 ${index + 1}`,
    visible: true,
    opacity: 1,
    pixels: emptyPixels(),
    canvasPixels: {},
  };
}

export function makeFrame(): Frame {
  return {
    id: id('frame'),
    delay: 120,
    viewportX: DEFAULT_VIEWPORT_X,
    viewportY: DEFAULT_VIEWPORT_Y,
    layers: [makeLayer(0), makeLayer(1)],
  };
}

export function makeProject(name: string = 'Untitled Pixel Art'): Project {
  const now = Date.now();
  return {
    id: id('project'),
    version: 4,
    name,
    width: WIDTH,
    height: HEIGHT,
    currentFrameIndex: 0,
    activeLayer: 0,
    frames: [makeFrame()],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeHex(value: string | null | undefined): string | null {
  const raw = String(value || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  return EMPTY;
}

export function hexToRgb(hex: string): [number, number, number] {
  const raw = (normalizeHex(hex) || '#000000').slice(1);
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function isEmptyPixel(value: string | null | undefined): boolean {
  return value === EMPTY || value === undefined || value === null;
}

export function pixelKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parsePixelKey(key: string): { x: number; y: number } | null {
  const [x, y] = String(key).split(',').map(Number);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

export function clampViewportX(value: number): number {
  return Math.max(0, Math.min(CANVAS_WIDTH - WIDTH, Number(value)));
}

export function clampViewportY(value: number): number {
  return Math.max(0, Math.min(CANVAS_HEIGHT - HEIGHT, Number(value)));
}

export function normalizeCanvasPixels(value: Record<string, string> | undefined): Record<string, string> {
  const canvasPixels: Record<string, string> = {};
  Object.entries(value || {}).forEach(([key, rawColor]) => {
    const point = parsePixelKey(key);
    const color = normalizeHex(rawColor);
    if (!point || isEmptyPixel(color)) return;
    if (point.x < 0 || point.x >= CANVAS_WIDTH || point.y < 0 || point.y >= CANVAS_HEIGHT) return;
    canvasPixels[pixelKey(point.x, point.y)] = color;
  });
  return canvasPixels;
}

// ==================== Layer & Frame Sync ====================

export function syncLayerCanvasFromVisible(
  layer: Layer,
  viewportX: number = DEFAULT_VIEWPORT_X,
  viewportY: number = DEFAULT_VIEWPORT_Y
): void {
  if (!layer) return;
  const vx = clampViewportX(viewportX);
  const vy = clampViewportY(viewportY);
  const canvasPixels = normalizeCanvasPixels(layer.canvasPixels);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      delete canvasPixels[pixelKey(vx + x, vy + y)];
    }
  }

  (layer.pixels || []).forEach((rawColor, index) => {
    const color = normalizeHex(rawColor);
    if (isEmptyPixel(color)) return;
    const x = index % WIDTH;
    const y = Math.floor(index / WIDTH);
    canvasPixels[pixelKey(vx + x, vy + y)] = color;
  });

  layer.canvasPixels = canvasPixels;
}

export function refreshLayerVisibleFromCanvas(
  layer: Layer,
  viewportX: number = DEFAULT_VIEWPORT_X,
  viewportY: number = DEFAULT_VIEWPORT_Y
): void {
  if (!layer) return;
  const vx = clampViewportX(viewportX);
  const vy = clampViewportY(viewportY);
  const canvasPixels = normalizeCanvasPixels(layer.canvasPixels);
  const pixels = emptyPixels();

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      pixels[y * WIDTH + x] = canvasPixels[pixelKey(vx + x, vy + y)] || EMPTY;
    }
  }

  layer.pixels = pixels;
  layer.canvasPixels = canvasPixels;
}

export function syncFrameCanvasFromVisible(
  frame: Frame,
  viewportX: number = DEFAULT_VIEWPORT_X,
  viewportY: number = DEFAULT_VIEWPORT_Y
): void {
  frame?.layers?.forEach((layer) => syncLayerCanvasFromVisible(layer, viewportX, viewportY));
}

export function refreshFrameVisibleFromCanvas(
  frame: Frame,
  viewportX: number = DEFAULT_VIEWPORT_X,
  viewportY: number = DEFAULT_VIEWPORT_Y
): void {
  frame?.layers?.forEach((layer) => refreshLayerVisibleFromCanvas(layer, viewportX, viewportY));
}

export function refreshProjectVisibleFromCanvas(project: Project): void {
  project?.frames?.forEach((frame) => refreshFrameVisibleFromCanvas(frame, frame.viewportX, frame.viewportY));
}

export function moveFrameViewport(frame: Frame, dx: number, dy: number): boolean {
  if (!frame || (!dx && !dy)) return false;
  const currentX = clampViewportX(frame.viewportX ?? DEFAULT_VIEWPORT_X);
  const currentY = clampViewportY(frame.viewportY ?? DEFAULT_VIEWPORT_Y);
  const nextX = clampViewportX(currentX - dx);
  const nextY = clampViewportY(currentY - dy);
  if (nextX === currentX && nextY === currentY) return false;
  syncFrameCanvasFromVisible(frame, currentX, currentY);
  frame.viewportX = nextX;
  frame.viewportY = nextY;
  refreshFrameVisibleFromCanvas(frame, nextX, nextY);
  return true;
}

// ==================== Drawing & Blending ====================

function blend(bottom: string | null, top: string | null, opacity: number = 1): string | null {
  const alpha = Math.max(0, Math.min(1, Number(opacity ?? 1)));
  if (!top || top === EMPTY || alpha <= 0) return bottom || EMPTY;
  if (!bottom || bottom === EMPTY) return top;
  if (alpha >= 1) return top;
  const a = hexToRgb(bottom);
  const b = hexToRgb(top);
  return rgbToHex(a[0] * (1 - alpha) + b[0] * alpha, a[1] * (1 - alpha) + b[1] * alpha, a[2] * (1 - alpha) + b[2] * alpha);
}

export function compositeFrame(frame: Frame): (string | null)[] {
  const pixels = emptyPixels();
  frame.layers.forEach((layer) => {
    if (!layer.visible) return;
    layer.pixels.forEach((color, index) => {
      pixels[index] = blend(pixels[index], color, Number(layer.opacity ?? 1));
    });
  });
  return pixels;
}

export function setPixel(pixels: (string | null)[], x: number, y: number, color: string | null): void {
  if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) pixels[y * WIDTH + x] = color;
}

export function pointRect(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number; width: number; height: number } {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x, b.x);
  const y2 = Math.max(a.y, b.y);
  return { x: x1, y: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 };
}

export function applyShape(
  pixels: (string | null)[],
  a: { x: number; y: number },
  b: { x: number; y: number },
  type: string,
  fillMode: string,
  color: string | null
): void {
  const end = fitShapeEnd(a, b, type);
  if (type === 'line') {
    drawLine(pixels, a, end, color);
    return;
  }
  const rect = pointRect(a, end);
  const filled = fillMode === 'filled';

  if (type === 'triangle') {
    const top = { x: Math.round(rect.x + (rect.width - 1) / 2), y: rect.y };
    const left = { x: rect.x, y: rect.y + rect.height - 1 };
    const right = { x: rect.x + rect.width - 1, y: rect.y + rect.height - 1 };
    if (!filled) {
      drawLine(pixels, top, left, color);
      drawLine(pixels, left, right, color);
      drawLine(pixels, right, top, color);
      return;
    }
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
      const progress = rect.height <= 1 ? 1 : (y - rect.y) / (rect.height - 1);
      const halfWidth = ((rect.width - 1) / 2) * progress;
      for (let x = Math.round(top.x - halfWidth); x <= Math.round(top.x + halfWidth); x += 1) {
        setPixel(pixels, x, y, color);
      }
    }
    return;
  }

  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const edge = x === rect.x || y === rect.y || x === rect.x + rect.width - 1 || y === rect.y + rect.height - 1;
      if ((type === 'rectangle' || type === 'square') && (filled || edge)) setPixel(pixels, x, y, color);
      if (type === 'ellipse' || type === 'circle') {
        const cx = rect.x + (rect.width - 1) / 2;
        const cy = rect.y + (rect.height - 1) / 2;
        const rx = Math.max(0.5, rect.width / 2);
        const ry = Math.max(0.5, rect.height / 2);
        const v = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2);
        if (filled ? v <= 1 : v <= 1 && v >= 0.62) setPixel(pixels, x, y, color);
      }
    }
  }
}

function fitShapeEnd(
  start: { x: number; y: number },
  end: { x: number; y: number },
  type: string
): { x: number; y: number } {
  if (type !== 'square' && type !== 'circle') return end;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: Math.max(0, Math.min(WIDTH - 1, start.x + Math.sign(dx || 1) * size)),
    y: Math.max(0, Math.min(HEIGHT - 1, start.y + Math.sign(dy || 1) * size)),
  };
}

function drawLine(
  pixels: (string | null)[],
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string | null
): void {
  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(pixels, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

// ==================== Canvas Drawing ====================

export function drawPixels(
  ctx: CanvasRenderingContext2D,
  pixels: (string | null)[],
  width: number,
  height: number,
  alpha: number = 1
): void {
  const cw = ctx.canvas.width / width;
  const ch = ctx.canvas.height / height;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = pixels[y * width + x];
      if (!color || color === EMPTY) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw), Math.ceil(ch));
    }
  }
  ctx.restore();
}

// ==================== Flood Fill ====================

export function floodFill(pixels: (string | null)[], start: number, color: string | null): void {
  const target = pixels[start];
  if (target === color) return;
  const stack = [start];
  const seen = new Uint8Array(PIXELS);
  while (stack.length) {
    const index = stack.pop()!;
    if (seen[index] || pixels[index] !== target) continue;
    seen[index] = 1;
    pixels[index] = color;
    const x = index % WIDTH;
    const y = Math.floor(index / WIDTH);
    if (x > 0) stack.push(index - 1);
    if (x < WIDTH - 1) stack.push(index + 1);
    if (y > 0) stack.push(index - WIDTH);
    if (y < HEIGHT - 1) stack.push(index + WIDTH);
  }
}

// ==================== Data Persistence ====================

export function sanitizeProject(raw: any): Project {
  const fallback = makeProject();
  if (!raw || raw.width !== WIDTH || raw.height !== HEIGHT || !Array.isArray(raw.frames)) return fallback;

  const { viewportX: _projectViewportX, viewportY: _projectViewportY, ...rawProject } = raw;
  const migrateBlackEmpty = Number(raw.version || 0) < 3;

  const normalizePixel = (value: any): string | null => {
    const color = normalizeHex(value);
    return migrateBlackEmpty && color === '#000000' ? EMPTY : color;
  };

  const frames = raw.frames.map((frame: any) => {
    const frameViewportX = clampViewportX(frame.viewportX ?? DEFAULT_VIEWPORT_X);
    const frameViewportY = clampViewportY(frame.viewportY ?? DEFAULT_VIEWPORT_Y);

    const layers = Array.isArray(frame.layers)
      ? frame.layers.slice(0, 4).map((layer: any, index: number) => {
          const normalized: Layer = {
            id: layer.id || id('layer'),
            name: String(layer.name || `图层 ${index + 1}`).slice(0, 24),
            visible: layer.visible !== false,
            opacity: Math.max(0.1, Math.min(1, Number(layer.opacity ?? 1))),
            pixels: Array.isArray(layer.pixels) ? layer.pixels.slice(0, PIXELS).map(normalizePixel) : emptyPixels(),
            canvasPixels: normalizeCanvasPixels(layer.canvasPixels),
          };
          syncLayerCanvasFromVisible(normalized, frameViewportX, frameViewportY);
          refreshLayerVisibleFromCanvas(normalized, frameViewportX, frameViewportY);
          return normalized;
        })
      : [];

    while (layers.length < 2) layers.push(makeLayer(layers.length));

    return {
      id: frame.id || id('frame'),
      delay: Math.max(20, Math.min(5000, Number(frame.delay || 120))),
      viewportX: frameViewportX,
      viewportY: frameViewportY,
      layers,
    };
  }).filter(Boolean);

  if (!frames.length) frames.push(makeFrame());

  return {
    ...fallback,
    ...rawProject,
    version: 4,
    name: String(raw.name || fallback.name).slice(0, 48),
    currentFrameIndex: Math.max(0, Math.min(Number(raw.currentFrameIndex || 0), frames.length - 1)),
    activeLayer: Math.max(0, Math.min(Number(raw.activeLayer || 0), frames[0].layers.length - 1)),
    frames,
  };
}

export function loadProjects(): Project[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(sanitizeProject) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.map(serializeProjectForSave)));
}

function serializeProjectForSave(project: Project): any {
  return {
    ...project,
    frames: (project.frames || []).map((frame) => ({
      ...frame,
      layers: (frame.layers || []).map((layer) => ({
        ...layer,
        canvasPixels: undefined,
      })),
    })),
  };
}
