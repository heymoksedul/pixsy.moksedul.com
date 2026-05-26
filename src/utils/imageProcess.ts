/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { ConversionFormat } from '../types';

/**
 * Formats bytes to standard readable dimensions (e.g., KB, MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Local canvas-powered image format converter
 */
export function convertImageInBrowser(
  file: File,
  targetFormat: ConversionFormat,
  quality: number
): Promise<{ blob: Blob; url: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to acquire canvas 2D rendering layer'));
            return;
          }

          // Matte channel fill for opaque targets like JPEG
          if (targetFormat === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0);

          let mimeType = 'image/png';
          if (targetFormat === 'jpeg') mimeType = 'image/jpeg';
          if (targetFormat === 'webp') mimeType = 'image/webp';

          // Canvas to target BLOB format
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const objectUrl = URL.createObjectURL(blob);
                resolve({
                  blob,
                  url: objectUrl,
                  size: blob.size,
                });
              } else {
                reject(new Error('Canvas conversion pipeline returned empty buffer'));
              }
            },
            mimeType,
            targetFormat === 'png' ? undefined : quality
          );
        } catch (err: any) {
          reject(new Error(`Rendering failure: ${err?.message || 'Unknown error'}`));
        }
      };

      img.onerror = () => {
        reject(new Error('Incompatible or corrupt image asset loaded'));
      };

      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error('Failed to load local file data stream'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Local file reader system encountered an error'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Triggers a native window download block
 */
export function triggerFileDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Bundles valid converted blobs into a single user zip bundle locally
 */
export async function downloadAllAsZip(
  files: Array<{ name: string; outputFormat: string; convertedBlob: Blob | null }>
): Promise<Blob> {
  const zip = new JSZip();

  files.forEach((item) => {
    if (item.convertedBlob) {
      // Clean output file name definition
      const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      const targetFileName = `${baseName}.${item.outputFormat}`;
      zip.file(targetFileName, item.convertedBlob);
    }
  });

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Real-time asynchronous image analyzer to detect resolution, size boundaries,
 * and active alpha/transparency channels to suggest optimal format types.
 */
export function analyzeImageProperties(file: File): Promise<{
  hasAlpha: boolean;
  width: number;
  height: number;
  isLargeSize: boolean;
  recommendation: ConversionFormat;
  reason: string;
}> {
  return new Promise((resolve) => {
    const fallback = {
      hasAlpha: false,
      width: 0,
      height: 0,
      isLargeSize: file.size > 1024 * 1024,
      recommendation: 'webp' as const,
      reason: 'WebP format suggested for modern lossy compression and high performance.'
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const width = img.naturalWidth;
          const height = img.naturalHeight;
          const isLargeSize = file.size > 1024 * 1024; // > 1MB

          // Create an offscreen canvas. Scale down for fast rendering on high-res files
          const canvas = document.createElement('canvas');
          const maxDim = 120; // Enough resolution to capture transparency or gradient profiles
          let w = width;
          let h = height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(fallback);
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          let hasAlpha = false;
          // Look for any semi-transparent or transparent pixels (alpha < 254)
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 254) {
              hasAlpha = true;
              break;
            }
          }

          let recommendation: ConversionFormat = 'webp';
          let reason = '';

          const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

          if (hasAlpha) {
            if (isLargeSize) {
              recommendation = 'webp';
              reason = 'Transparency detected in a larger canvas size; WebP preserves transparency with superior asset compression.';
            } else {
              recommendation = 'png';
              reason = 'Transparency detected; PNG ensures lossless presentation of clear alpha silhouettes and outlines.';
            }
          } else {
            if (isLargeSize) {
              recommendation = 'webp';
              reason = 'High resolution photo with solid pixels; WebP is highly recommended for space-saving web assets.';
            } else if (fileExt === 'png' || fileExt === 'svg' || fileExt === 'gif') {
              recommendation = 'png';
              reason = 'Solid color layout or vector diagram; PNG preserves fine text contrast and boundary lines without blur.';
            } else {
              recommendation = 'jpeg';
              reason = 'High-compatibility opaque photographic image; JPEG is ideal for older devices and general sharing.';
            }
          }

          resolve({
            hasAlpha,
            width,
            height,
            isLargeSize,
            recommendation,
            reason
          });
        } catch (err) {
          resolve(fallback);
        }
      };
      
      img.onerror = () => {
        resolve(fallback);
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        resolve(fallback);
      }
    };

    reader.onerror = () => {
      resolve(fallback);
    };

    reader.readAsDataURL(file);
  });
}
