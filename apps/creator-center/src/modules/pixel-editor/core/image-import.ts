/**
 * Image Import Module
 * 图片导入和GIF解码
 */

import { WIDTH, HEIGHT, EMPTY, hexToRgb, normalizeHex, palette, rgbToHex } from './index';
import { parseGIF, decompressFrames } from 'gifuct-js';
import type { ParsedFrameWithoutPatch } from 'gifuct-js';

function nearestPaletteColorFn(r: number, g: number, b: number): string {
  let best = palette[0];
  let bestDist = Infinity;
  palette.forEach((color) => {
    const [pr, pg, pb] = hexToRgb(color);
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = color;
    }
  });
  return best;
}

export interface ImageImportOptions {
  fit: 'contain' | 'cover' | 'stretch';
  zoom: number;
  dither: 'none' | 'ordered' | 'floyd';
  preserveColors: boolean;
  cropX: number;
  cropY: number;
  outputWidth?: number;
  outputHeight?: number;
  allowUpscale?: boolean;
}

function quantizeImageData(data: Uint8ClampedArray, mode: string, width: number = WIDTH, height: number = HEIGHT): (string | null)[] {
  const out: (string | null)[] = [];
  const buffer: [number, number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    buffer.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
  }

  const bayer = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      let [r, g, b, a] = buffer[index];
      if (a < 10) {
        out[index] = EMPTY;
        continue;
      }

      if (mode === 'ordered') {
        const t = (bayer[y % 4][x % 4] - 7.5) * 8;
        r += t;
        g += t;
        b += t;
      }

      const next = nearestPaletteColorFn(r, g, b);
      out[index] = normalizeHex(next);

      if (mode === 'floyd') {
        const [nr, ng, nb] = hexToRgb(next);
        const er = r - nr;
        const eg = g - ng;
        const eb = b - nb;

        [
          [1, 0, 7 / 16],
          [-1, 1, 3 / 16],
          [0, 1, 5 / 16],
          [1, 1, 1 / 16],
        ].forEach(([dx, dy, f]) => {
          const tx = x + dx;
          const ty = y + dy;
          if (tx < 0 || tx >= width || ty < 0 || ty >= height) return;
          const target = buffer[ty * width + tx];
          target[0] += er * f;
          target[1] += eg * f;
          target[2] += eb * f;
        });
      }
    }
  }
  return out.map(normalizeHex);
}

function preserveImageDataColors(data: Uint8ClampedArray): (string | null)[] {
  const out: (string | null)[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 10) {
      out.push(EMPTY);
    } else {
      out.push(rgbToHex(data[i], data[i + 1], data[i + 2]));
    }
  }
  return out;
}

export async function imageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  // 兼容性：decode() 失败时回退到 onload
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('图片加载失败，请确认文件格式正确'));
  });
  image.src = url;
  await Promise.race([image.decode().then(() => undefined).catch(() => undefined), loaded]);
  URL.revokeObjectURL(url);
  if (!image.width || !image.height) {
    throw new Error('图片尺寸无效');
  }
  return image;
}


/**
 * 加载gif图片
 * @param _e 
 * @returns 
 */
async function loadGifImage(_e: Event) {
  // const input = gifFileInput.value
  // const file = input?.files?.[0]
  // if (!file) return
  // if (input) input.value = ''
  // try {
  //   const gifFrames = await decodeGifFrames(file)
  //   editor.snapshot()
  //   const frames = gifFrames.map(({ image, delay }: any) => {
  //     const frame = createFrame()
  //     frame.delay = delay
  //     const pixels = renderImageToPixels(image, { fit: 'contain', cropX: 0.5, cropY: 0.5, zoom: 1, preserveColors: true, outputWidth: CANVAS_WIDTH, outputHeight: CANVAS_HEIGHT, allowUpscale: false, dither: 'none' })
  //     frame.layers[0].canvasPixels = pixelsToCanvasPixels(pixels, CANVAS_WIDTH, CANVAS_HEIGHT)
  //     return frame
  //   })
  //   editor.activeProject.frames.splice(editor.currentFrameIndex + 1, 0, ...frames)
  //   editor.currentFrameIndex += 1
  //   editor.touchProject(`已导入 GIF ${frames.length} 帧`)
  // } catch (err: any) { ui.setStatus(err.message) }
}

/**
 * 导入内容渲染到当前的图层
 * @param image 
 * @param options 
 * @returns 
 */
export function renderImageToPixels(image: HTMLImageElement | HTMLCanvasElement, options: ImageImportOptions): (string | null)[] {
  const width = Math.max(1, Number(options.outputWidth || WIDTH));
  const height = Math.max(1, Number(options.outputHeight || HEIGHT));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;

  // Get input dimensions - handle both Image and Canvas elements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iw = (image as any).width || (image as HTMLVideoElement).videoWidth || WIDTH;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ih = (image as any).height || (image as HTMLVideoElement).videoHeight || HEIGHT;

  // Validate input image has actual dimensions
  if (iw === 0 || ih === 0) {
    console.warn('[renderImageToPixels] Image has zero dimensions, returning empty pixels');
    return Array(width * height).fill(null);
  }

  let sw = iw;
  let sh = ih;
  let sx = 0;
  let sy = 0;
  let dx = 0;
  let dy = 0;
  let dw = width;
  let dh = height;
  let zoom = Number(options.zoom || 1);

  if (options.fit === 'stretch') {
    zoom = Math.max(1, zoom);
    sw = iw / zoom;
    sh = ih / zoom;
    sx = (iw - sw) * options.cropX;
    sy = (ih - sh) * options.cropY;
  } else {
    const fitScale =
      options.fit === 'cover'
        ? Math.max(width / iw, height / ih)
        : Math.min(width / iw, height / ih);
    const baseScale = options.allowUpscale === false ? Math.min(1, fitScale) : fitScale;
    const scale = baseScale * zoom;
    dw = Math.max(1, Math.round(iw * scale));
    dh = Math.max(1, Math.round(ih * scale));
    dx = Math.round((width - dw) * options.cropX);
    dy = Math.round((height - dh) * options.cropY);
  }

  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  const data = ctx.getImageData(0, 0, width, height).data;

  if (options.preserveColors) {
    return preserveImageDataColors(data);
  }
  return quantizeImageData(data, options.dither, width, height);
}

export function pixelsToCanvasPixels(pixels: (string | null)[], width: number, height: number): Record<string, string> {
  const canvasPixels: Record<string, string> = {};
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = pixels[y * width + x] as string | null;
      if (!isEmptyPixel(color)) canvasPixels[`${x},${y}`] = color as string;
    }
  }
  return canvasPixels;
}

/**
 * Convert local-layer pixels to canvas pixel coordinates, offset by viewport.
 * Stores each non-empty pixel at (viewportX + x, viewportY + y) in canvas space.
 * This ensures consistency with refreshLayerVisibleFromCanvas which reads back
 * using the same viewport offset.
 */
export function localPixelsToCanvasPixels(
  pixels: (string | null)[],
  viewportX: number,
  viewportY: number
): Record<string, string> {
  const W = WIDTH;
  const H = HEIGHT;
  const canvasPixels: Record<string, string> = {};
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const color = pixels[y * W + x] as string | null;
      if (!isEmptyPixel(color)) {
        canvasPixels[`${viewportX + x},${viewportY + y}`] = color as string;
      }
    }
  }
  return canvasPixels;
}

function isEmptyPixel(value: string | null | undefined): boolean {
  return value === EMPTY || value === undefined || value === null;
}

// ==================== GIF Decoding ====================

/**
 * Build RGBA image data from color index canvas
 */
function buildRgbaFromIndices(
  canvasPixels: Uint8Array,
  colorTable: [number, number, number][],
  width: number,
  height: number
): ImageData {
  const imageData = new ImageData(width, height);
  const data = imageData.data;
  for (let j = 0; j < canvasPixels.length; j++) {
    const colorIdx = canvasPixels[j];
    const color = colorTable[colorIdx] || [0, 0, 0];
    const pos = j * 4;
    data[pos] = color[0];
    data[pos + 1] = color[1];
    data[pos + 2] = color[2];
    data[pos + 3] = 255;
  }
  return imageData;
}

/**
 * Decode GIF frames using gifuct-js library
 * Properly handles frame disposal methods (restore to background, restore to previous, etc.)
 */
export async function decodeGifFrames(file: File): Promise<GifFrame[]> {
  const arrayBuffer = await file.arrayBuffer();
  return decodeGifFramesFromBuffer(arrayBuffer);
}

/**
 * Decode GIF frames from an ArrayBuffer
 * Uses gifuct-js to parse and decompress GIF frames
 */
export function decodeGifFramesFromBuffer(buffer: ArrayBuffer): GifFrame[] {
  console.log('[GIF] Parsing with gifuct-js...');

  // Parse GIF structure
  const gif = parseGIF(buffer);
  console.log('[GIF] Parsed:', gif.header.signature, gif.header.version, 'Size:', gif.lsd.width, 'x', gif.lsd.height);

  // Use decompressFrames with buildImagePatches=false to get indexed pixel data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsedFrames: ParsedFrameWithoutPatch[] = decompressFrames(gif, false) as any;

  console.log('[GIF] Decompressed', parsedFrames.length, 'frames');

  if (parsedFrames.length === 0) {
    console.error('[GIF] No frames returned from decompressFrames!');
    throw new Error('No valid GIF frames found');
  }

  // Show raw frame info for debugging
  for (let i = 0; i < parsedFrames.length; i++) {
    const f = parsedFrames[i];
    console.log(`[GIF] Frame ${i}: dims=${f.dims.width}x${f.dims.height}@(${f.dims.left},${f.dims.top}), delay=${f.delay}ms, disposal=${f.disposalType}, transparent=${f.transparentIndex}, pixels=${f.pixels.length}, colors=${f.colorTable.length}`);
  }

  // Reconstruct frame canvases with proper disposal method handling
  const frames: GifFrame[] = [];
  const virtualCanvas = new Uint8Array(gif.lsd.width * gif.lsd.height);
  let savedCanvas: Uint8Array | null = null;

  for (let i = 0; i < parsedFrames.length; i++) {
    const pf = parsedFrames[i];
    const { dims, delay, pixels: framePixels, colorTable, transparentIndex } = pf;

    // Apply disposal method from PREVIOUS frame
    if (i > 0) {
      const prevDisposal = parsedFrames[i - 1].disposalType;
      if (prevDisposal === 2) {
        // Restore to background: clear to background color
        const bgIdx = gif.lsd.backgroundColorIndex;
        for (let y = 0; y < dims.height; y++) {
          for (let x = 0; x < dims.width; x++) {
            const dx = dims.left + x;
            const dy = dims.top + y;
            if (dx < gif.lsd.width && dy < gif.lsd.height) {
              virtualCanvas[dy * gif.lsd.width + dx] = bgIdx;
            }
          }
        }
        console.log(`[GIF] Frame ${i}: prev disposal=2 (restore to bg)`);
      } else if (prevDisposal === 3) {
        // Restore to previous
        if (savedCanvas) {
          virtualCanvas.set(savedCanvas);
          console.log(`[GIF] Frame ${i}: prev disposal=3 (restore to prev)`);
        }
      }
      // disposal=0 or 1: pixels accumulate naturally
    }

    // Save state before drawing (needed for disposal=3 of THIS frame)
    savedCanvas = new Uint8Array(virtualCanvas);

    // Draw current frame pixels onto virtual canvas
    for (let y = 0; y < dims.height; y++) {
      for (let x = 0; x < dims.width; x++) {
        const dx = dims.left + x;
        const dy = dims.top + y;
        if (dx < gif.lsd.width && dy < gif.lsd.height) {
          const srcIdx = y * dims.width + x;
          const pIdx = framePixels[srcIdx];
          if (pIdx !== transparentIndex) {
            virtualCanvas[dy * gif.lsd.width + dx] = pIdx;
          }
        }
      }
    }

    // Build RGBA canvas
    const rgbaCanvas = document.createElement('canvas');
    rgbaCanvas.width = gif.lsd.width;
    rgbaCanvas.height = gif.lsd.height;
    const ctx = rgbaCanvas.getContext('2d')!;
    const imageData = buildRgbaFromIndices(virtualCanvas, colorTable, gif.lsd.width, gif.lsd.height);
    ctx.putImageData(imageData, 0, 0);

    // Validate
    const sampleSz = Math.min(10, rgbaCanvas.width, rgbaCanvas.height);
    const sampleData = ctx.getImageData(0, 0, sampleSz, sampleSz).data;
    let opaqueCount = 0;
    for (let j = 0; j < sampleData.length; j += 4) {
      if (sampleData[j + 3] > 0) opaqueCount++;
    }

    const uniqueColors = new Set(virtualCanvas).size;
    console.log(`[GIF] Frame ${i}: ${opaqueCount} opaque in ${sampleSz}x${sampleSz}, ${uniqueColors} colors`);

    if (opaqueCount === 0) {
      console.warn(`[GIF] Frame ${i}: WARNING - completely empty!`);
    }

    frames.push({
      image: rgbaCanvas,
      delay: Math.max(20, delay),
    });
  }

  console.log(`[GIF] Total: ${frames.length} frames`);
  return frames;
}

interface GifFrame {
  image: HTMLCanvasElement;
  delay: number;
}
