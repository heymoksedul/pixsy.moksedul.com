/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConversionFormat = 'png' | 'jpeg' | 'webp';

export interface FileAnalysis {
  hasAlpha: boolean;
  width: number;
  height: number;
  isLargeSize: boolean;
  recommendation: ConversionFormat;
  reason: string;
}

export interface ConvertibleFile {
  id: string;
  file: File;
  name: string;
  size: number;
  originalFormat: string; // e.g. 'png', 'jpeg', etc.
  outputFormat: ConversionFormat;
  quality: number; // 0.1 to 1.0 (for JPEG and WEBP spec)
  previewUrl: string;
  status: 'pending' | 'converting' | 'success' | 'failed';
  error?: string;
  convertedBlob: Blob | null;
  convertedUrl: string | null;
  convertedSize: number | null;
  progress: number; // 0 to 100;
  analysis?: FileAnalysis;
}

export interface GlobalSettings {
  outputFormat: ConversionFormat;
  quality: number;
}
