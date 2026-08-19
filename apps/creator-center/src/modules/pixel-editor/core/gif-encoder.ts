/**
 * Minimal GIF89a encoder for PixelArt Web Editor.
 * - Browser-only, no external dependency.
 * - Uses a global 256-color palette built from the animation.
 * - Encodes standard animated GIF with Netscape looping extension.
 */

const BLACK = '#000000';
const TRANSPARENT_INDEX = 0;

function hexToRgb(hex: string): [number, number, number] {
  const normalized = String(hex || BLACK).trim().toLowerCase();
  const value = normalized[0] === '#' ? normalized.slice(1) : normalized;
  if (!/^[0-9a-f]{6}$/.test(value)) return [0, 0, 0];
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function pushWord(bytes: number[], value: number): void {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
}

function pushAscii(bytes: number[], text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }
}

function buildPalette(frames: GifFrame[], maxColors: number): Palette {
  const counts = new Map<string, number>();

  frames.forEach((frame) => {
    frame.pixels.forEach((color) => {
      if (!color) return;
      const key = String(color).toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  const colors = [
    BLACK,
    ...Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxColors - 1)
      .map(([color]) => color),
  ];

  while (colors.length < maxColors) colors.push(BLACK);

  const rgb = colors.map(hexToRgb);
  const exact = new Map(colors.map((color, index) => [color, index]));
  const nearestCache = new Map<string, number>();

  function getIndex(color: string | null): number {
    if (!color) return TRANSPARENT_INDEX;
    const key = String(color).toLowerCase();
    if (exact.has(key)) return exact.get(key)!;
    if (nearestCache.has(key)) return nearestCache.get(key)!;

    const target = hexToRgb(key);
    let bestIndex = 1;
    let bestDistance = Infinity;
    for (let i = 1; i < rgb.length; i += 1) {
      const dr = target[0] - rgb[i][0];
      const dg = target[1] - rgb[i][1];
      const db = target[2] - rgb[i][2];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
        if (distance === 0) break;
      }
    }
    nearestCache.set(key, bestIndex);
    return bestIndex;
  }

  return { colors, rgb, getIndex };
}

function scaleFrameToIndices(
  frame: GifFrame,
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
  palette: Palette
): Uint8Array {
  const targetWidth = sourceWidth * scale;
  const targetHeight = sourceHeight * scale;
  const indices = new Uint8Array(targetWidth * targetHeight);
  let out = 0;

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let repeatY = 0; repeatY < scale; repeatY += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const sourceIndex = y * sourceWidth + x;
        const paletteIndex = palette.getIndex(frame.pixels[sourceIndex]);
        for (let repeatX = 0; repeatX < scale; repeatX += 1) {
          indices[out] = paletteIndex;
          out += 1;
        }
      }
    }
  }

  return indices;
}

function lzwEncode(indices: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;

  const data: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  function writeCode(code: number): void {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      data.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }

  // Emit raw palette indices with frequent clear codes.
  writeCode(clearCode);
  let codesSinceClear = 0;
  for (let i = 0; i < indices.length; i += 1) {
    if (codesSinceClear >= 240) {
      writeCode(clearCode);
      codesSinceClear = 0;
    }
    writeCode(indices[i]);
    codesSinceClear += 1;
  }

  writeCode(endCode);

  if (bitCount > 0) data.push(bitBuffer & 0xff);
  return data;
}

function pushSubBlocks(bytes: number[], data: number[]): void {
  for (let i = 0; i < data.length; i += 255) {
    const block = data.slice(i, i + 255);
    bytes.push(block.length);
    for (let j = 0; j < block.length; j += 1) bytes.push(block[j]);
  }
  bytes.push(0x00);
}

// Types

interface GifFrame {
  delay: number;
  pixels: (string | null)[];
}

interface Palette {
  colors: string[];
  rgb: [number, number, number][];
  getIndex: (color: string | null) => number;
}

export interface EncodeGifOptions {
  width: number;
  height: number;
  scale?: number;
  frames: GifFrame[];
}

export function encodeGif(options: EncodeGifOptions): Blob {
  const sourceWidth = options.width;
  const sourceHeight = options.height;
  const scale = Math.max(1, Number(options.scale || 1));
  const frames = options.frames || [];
  if (!frames.length) throw new Error('No frames to encode.');

  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  if (width > 65535 || height > 65535) {
    throw new Error('GIF dimensions are too large.');
  }

  const palette = buildPalette(frames, 256);
  const bytes: number[] = [];

  pushAscii(bytes, 'GIF89a');
  pushWord(bytes, width);
  pushWord(bytes, height);
  bytes.push(0xf7); // Global color table, 8-bit color resolution, 256 entries.
  bytes.push(0x00); // Background color index.
  bytes.push(0x00); // Pixel aspect ratio.

  palette.rgb.forEach(([r, g, b]) => bytes.push(r, g, b));

  // Netscape loop extension: loop forever.
  bytes.push(0x21, 0xff, 0x0b);
  pushAscii(bytes, 'NETSCAPE2.0');
  bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

  frames.forEach((frame) => {
    const delayCs = Math.max(2, Math.round(Number(frame.delay || 120) / 10));
    const indices = scaleFrameToIndices(frame, sourceWidth, sourceHeight, scale, palette);
    const lzwData = lzwEncode(indices, 8);

    // Graphics Control Extension.
    bytes.push(0x21, 0xf9, 0x04);
    bytes.push(0x09); // Restore to transparent background after each frame.
    pushWord(bytes, delayCs);
    bytes.push(TRANSPARENT_INDEX);
    bytes.push(0x00);

    // Image Descriptor.
    bytes.push(0x2c);
    pushWord(bytes, 0);
    pushWord(bytes, 0);
    pushWord(bytes, width);
    pushWord(bytes, height);
    bytes.push(0x00); // Use global color table.

    bytes.push(0x08); // LZW minimum code size.
    pushSubBlocks(bytes, lzwData);
  });

  bytes.push(0x3b); // Trailer.
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}
