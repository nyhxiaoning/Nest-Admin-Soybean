/**
 * File Download Utilities
 * 文件下载工具
 */

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeName(name: string, ext: string): string {
  return `${String(name || 'pixel-art').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 64)}.${ext}`;
}
