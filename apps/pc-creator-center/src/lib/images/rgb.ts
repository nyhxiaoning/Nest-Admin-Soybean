
enum UploadFileEnum {
  IMAGE = 7, //图片
  GIF = 8, //GIF
  BIN = 9, //二进制文件
  OTHER = 10, //其他文件
  BASE64IMG = 11, //BASE64图片
}

export const convertImageToRGB565 = (imageFile: any, type: UploadFileEnum) => {
  const targetWidth = 32,
    targetHeight = 16; //TODO 硬编码
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const pixels = imageData.data;
      const byteArray = new Uint8Array(targetWidth * targetHeight * 2);
      for (let i = 0, j = 0; i < pixels.length; i += 4, j += 2) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        const rgb565Value = (((r / 255) * 31) << 11) | (((g / 255) * 63) << 5) | ((b / 255) * 31);

        byteArray[j] = (rgb565Value >>> 8) & 0xff;
        byteArray[j + 1] = rgb565Value & 0xff;
      }
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });
      resolve(blob);
    };

    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = type === UploadFileEnum.BASE64IMG ? imageFile : URL.createObjectURL(imageFile);
  });
};
export const colorsToJsonBlob = (colors: Array<string | null>): Blob => {
  return new Blob([JSON.stringify(colors)], { type: 'application/json' });
};
export const colorsToBlob = (colors: Array<string | null>) => {
  if (!colors || colors.length === 0) {
    throw new Error('Colors array is empty or undefined.');
  }
  const newArray = Array.from({ length: 512 }, (_, index) => colors[index]);
  const colorsRGB565 = newArray.map((color) => {
    if (color) {
      return convertToRGB565(color);
    }
    return 0; // null / 空值 → 黑色 (0,0,0)
  });

  const byteArray = new Uint8Array(colorsRGB565.length * 2);
  colorsRGB565.forEach((rgb565, index) => {
    // Little-endian byte order (low byte first)
    byteArray[index * 2] = (rgb565 >>> 8) & 0xff; // Low byte
    byteArray[index * 2 + 1] = rgb565 & 0xff; // High byte
  });

  return new Blob([byteArray], { type: 'application/octet-stream' });
};

const convertToRGB565 = (hexColor: string): number => {
  // Ensure the color is in the correct format (#RRGGBB)
  let color = hexColor.replace(/^#/, '');
  if (color.length === 3) {
    color = color
      .split('')
      .map((hex) => hex + hex)
      .join('');
  }

  // Validate that the string length is now 6 (ensures valid hex color)
  if (color.length !== 6) {
    throw new Error(`Invalid hex color: ${hexColor}`);
  }

  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Standard conversion: right shift to discard lower bits
  const r5 = r >> 3; // 8-bit to 5-bit
  const g6 = g >> 2; // 8-bit to 6-bit
  const b5 = b >> 3; // 8-bit to 5-bit
  return (((r / 255) * 31) << 11) | (((g / 255) * 63) << 5) | ((b / 255) * 31);
  // return (r5 << 11) | (g6 << 5) | b5;
};

export const convertRgb565BlobToPng = (blob, targetWidth, targetHeight) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const arrayBuffer = event.target.result;
      const byteArray = new Uint8Array(arrayBuffer as ArrayBuffer);
      const pixels = new Uint8Array(targetWidth * targetHeight * 4); // RGBA 格式

      for (let i = 0, j = 0; i < byteArray.length; i += 2, j += 4) {
        const highByte = byteArray[i];
        const lowByte = byteArray[i + 1];
        const rgb565Value = (highByte << 8) | lowByte;
        const r = ((rgb565Value >> 11) & 0x1f) * (255 / 31);
        const g = ((rgb565Value >> 5) & 0x3f) * (255 / 63);
        const b = (rgb565Value & 0x1f) * (255 / 31);
        pixels[j] = r;
        pixels[j + 1] = g;
        pixels[j + 2] = b;
        pixels[j + 3] = 255;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }
      const imageData = new ImageData(new Uint8ClampedArray(pixels), targetWidth, targetHeight);
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((imageBlob) => {
        if (imageBlob) {
          resolve(imageBlob);
        } else {
          reject(new Error('Failed to create Blob'));
        }
      }, 'image/png');
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(blob);
  });
};

const HEX_COLOR_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const createRgbaData = (
  colors: ReadonlyArray<string | null | undefined>,
  width: number,
  height: number
): Uint8ClampedArray<ArrayBuffer> => {
  if (
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0
  ) {
    throw new Error('Image width and height must be positive integers.');
  }

  // Typed arrays initialize to RGBA(0, 0, 0, 0), so skipped pixels stay transparent.
  const rgbaData = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));

  for (let index = 0; index < width * height; index += 1) {
    const color = colors[index]?.trim();
    if (!color || !HEX_COLOR_PATTERN.test(color)) {
      continue;
    }

    const rawHex = color.replace(/^#/, '');
    const hex =
      rawHex.length === 3
        ? rawHex
            .split('')
            .map((digit) => digit + digit)
            .join('')
        : rawHex;
    const position = index * 4;

    rgbaData[position] = Number.parseInt(hex.slice(0, 2), 16);
    rgbaData[position + 1] = Number.parseInt(hex.slice(2, 4), 16);
    rgbaData[position + 2] = Number.parseInt(hex.slice(4, 6), 16);
    rgbaData[position + 3] = 255;
  }

  return rgbaData;
};

export const convertHexArrayToPng = (
  colors: ReadonlyArray<string | null | undefined>,
  width: number,
  height: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const rgbaData = createRgbaData(colors, width, height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }

      const imageData = new ImageData(rgbaData, width, height);
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error('Failed to create PNG Blob'));
        }
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
};

export function colorToRGB565(color: string) {
  let r, g, b;

  if (color.startsWith('#')) {
    // 将十六进制颜色转换为 RGB
    r = parseInt(color.slice(1, 3), 16);
    g = parseInt(color.slice(3, 5), 16);
    b = parseInt(color.slice(5, 7), 16);
  } else if (color.startsWith('rgb')) {
    [r, g, b] = color.match(/\d+/g)!.map(Number);
  } else {
    throw new Error('Unsupported Color Format');
  }
  const r5 = (r >> 3) & 0x1f;
  const g6 = (g >> 2) & 0x3f;
  const b5 = (b >> 3) & 0x1f;

  const rgb565 = (r5 << 11) | (g6 << 5) | b5;
  return rgb565.toString(16).padStart(4, '0');
}

export function rgbToHex(string: string) {
  const result = string.match(/\d+/g);
  if (!result || result.length !== 3) {
    throw new Error('Invalid RGB Format');
  }
  const [r, g, b] = result.map(Number);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export const compressImageTo64x16 = (base64, mimeType = 'image/png') => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, 32, 16);
      const compressedBase64 = canvas.toDataURL(mimeType);
      resolve(compressedBase64);
    };
    img.onerror = (err) => reject(err);
    img.src = base64;
  });
};
