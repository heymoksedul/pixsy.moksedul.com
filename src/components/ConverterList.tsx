/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Download, 
  RefreshCw, 
  Plus, 
  FolderArchive, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  ListRestart, 
  Image as ImageIcon,
  ArrowRight,
  TrendingDown,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ZoomIn,
  Sparkles,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConvertibleFile, ConversionFormat } from '../types';
import { formatBytes } from '../utils/imageProcess';

interface ConverterListProps {
  files: ConvertibleFile[];
  onRemoveFile: (id: string) => void;
  onUpdateFileSettings: (id: string, format: ConversionFormat, quality: number) => void;
  onConvertFile: (id: string) => void;
  onConvertAll: () => void;
  onAddMore: () => void;
  onClearAll: () => void;
  onDownloadZip: () => void;
  onDownloadSingle: (id: string) => void;
  isConverting: boolean;
  onEditFile?: (file: ConvertibleFile) => void;
}

export default function ConverterList({
  files,
  onRemoveFile,
  onUpdateFileSettings,
  onConvertFile,
  onConvertAll,
  onAddMore,
  onClearAll,
  onDownloadZip,
  onDownloadSingle,
  isConverting,
  onEditFile,
}: ConverterListProps) {
  const [globalFormat, setGlobalFormat] = useState<ConversionFormat | 'custom'>('webp');
  const [globalQuality, setGlobalQuality] = useState<number>(0.85);
  const [showConfigId, setShowConfigId] = useState<string | null>(null);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'converted'>('original');
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

  // Keyboard navigation for preview
  useEffect(() => {
    if (previewIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewIndex(null);
      } else if (e.key === 'ArrowRight') {
        setPreviewIndex((prev) => (prev !== null && prev < files.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : files.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, files.length]);

  // Adjust view state when loaded file changes
  useEffect(() => {
    if (previewIndex !== null && files[previewIndex]) {
      const f = files[previewIndex];
      setViewMode(f.status === 'success' ? 'converted' : 'original');
      setImgDimensions(null);
    }
  }, [previewIndex, files]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // Apply a global format setting to all currently loaded files
  const applyGlobalFormat = (format: ConversionFormat) => {
    setGlobalFormat(format);
    files.forEach(f => {
      onUpdateFileSettings(f.id, format, f.quality);
    });
  };

  // Apply global quality settings to all currently loaded files
  const applyGlobalQuality = (quality: number) => {
    setGlobalQuality(quality);
    files.forEach(f => {
      onUpdateFileSettings(f.id, f.outputFormat, quality);
    });
  };

  // Counts
  const totalFiles = files.length;
  const processedFiles = files.filter(f => f.status === 'success').length;
  const pendingFiles = files.filter(f => f.status === 'pending').length;
  const failedFiles = files.filter(f => f.status === 'failed').length;

  // Compute total byte savings safely
  const totalSavedBytes = files.reduce((acc, f) => {
    if (f.status === 'success' && f.convertedSize) {
      const diff = f.size - f.convertedSize;
      return diff > 0 ? acc + diff : acc;
    }
    return acc;
  }, 0);

  return (
    <div id="converter-list-workspace" className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Dynamic Global Settings Bar & Controls */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm shadow-[#7653F8]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-[#7653F8]" />
              Batch Configuration
            </h4>
            <p className="text-sm font-sans font-semibold text-neutral-800 mt-1">
              Select conversion format type and quality presets
            </p>
          </div>

          {/* Toggle Switches */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-medium text-gray-400 mr-1.5">Apply to All:</span>
            {(['webp', 'png', 'jpeg'] as ConversionFormat[]).map((fmt) => (
              <button
                key={fmt}
                id={`btn-toggle-global-${fmt}`}
                onClick={() => applyGlobalFormat(fmt)}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs uppercase font-bold transition-all duration-205 cursor-pointer ${
                  globalFormat === fmt
                    ? 'bg-[#7653F8] text-white shadow-sm shadow-[#7653F8]/15'
                    : 'bg-gray-50 border border-gray-100 text-gray-500 hover:border-[#7653F8]/30 hover:text-black hover:bg-white'
                }`}
              >
                {fmt}
              </button>
            ))}
            <button
              id="btn-toggle-global-custom"
              onClick={() => setGlobalFormat('custom')}
              className={`px-3.5 py-1.5 rounded-lg font-mono text-xs uppercase font-bold transition-all duration-205 cursor-pointer ${
                globalFormat === 'custom'
                  ? 'bg-[#7653F8] text-white shadow-sm shadow-[#7653F8]/15'
                  : 'bg-gray-50 border border-gray-100 text-gray-500 hover:border-[#7653F8]/30 hover:text-black hover:bg-white'
              }`}
            >
              Hybrid
            </button>
          </div>
        </div>

        {/* Global Quality slider for WEBP and JPEG */}
        {globalFormat !== 'custom' && globalFormat !== 'png' && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
            <div className="flex items-center justify-between sm:justify-start gap-2.5 shrink-0">
              <span className="font-medium text-gray-500">Global Compression Quality:</span>
              <span className="px-1.5 py-0.5 font-mono bg-gray-100 rounded font-bold text-[#7653F8]">
                {Math.round(globalQuality * 100)}%
              </span>
            </div>
            <input
              type="range"
              id="slider-global-quality"
              min="0.1"
              max="1.0"
              step="0.05"
              value={globalQuality}
              onChange={(e) => applyGlobalQuality(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#7653F8] transition-all duration-150"
            />
            <span className="shrink-0 text-[10px] text-gray-400 font-mono hidden sm:inline">
              {globalQuality >= 0.85 ? 'Lossless Preset' : globalQuality >= 0.6 ? 'Balanced Preset' : 'Small Size Preset'}
            </span>
          </div>
        )}
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Files', value: totalFiles, color: 'text-neutral-900 border-gray-100 bg-white' },
          { label: 'Converted', value: `${processedFiles}/${totalFiles}`, color: 'text-neutral-800 border-gray-100 bg-white' },
          { label: 'Pending / Errors', value: pendingFiles > 0 ? `${pendingFiles} pending` : (failedFiles > 0 ? `${failedFiles} failed` : 'All done'), color: failedFiles > 0 ? 'text-rose-600 border-rose-100/60 bg-rose-50/20' : 'text-neutral-500 border-gray-100 bg-white' },
          { label: 'Total Saved', value: totalSavedBytes > 0 ? formatBytes(totalSavedBytes) : '0 Bytes', color: 'text-[#7653F8] border-[#7653F8]/10 bg-[#7653F8]/5' }
        ].map((stat, i) => (
          <div key={i} className={`flex flex-col justify-between border rounded-xl p-3.5 text-left ${stat.color}`}>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-85">{stat.label}</span>
            <span className="text-lg font-bold tracking-tight mt-1">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Queue Listing */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm shadow-[#7653F8]/5">
        <div className="border-b border-gray-100 bg-gray-50/40 p-4 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">
            Files in Queue ({totalFiles})
          </h3>
          <div className="flex items-center gap-2">
            <button
              id="btn-add-more-top"
              onClick={onAddMore}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-700 hover:text-[#7653F8] border border-gray-150 hover:border-[#7653F8]/30 rounded-lg transition-all focus:outline-none cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Add more
            </button>
            <button
              id="btn-clear-all-top"
              onClick={onClearAll}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-400 hover:text-rose-600 rounded-lg transition-all focus:outline-none cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* List scroll context - Dynamic Max Height and Scroll */}
        <div className="divide-y divide-neutral-100/80 max-h-[320px] overflow-y-auto">
          {files.map((item) => {
            const hasSavings = item.status === 'success' && item.convertedSize && item.size;
            const savingsPercent = hasSavings 
              ? Math.max(-99, Math.round(((item.convertedSize! - item.size) / item.size) * 100))
              : 0;

            return (
              <div 
                key={item.id} 
                id={`file-row-${item.id}`}
                className="group flex flex-col sm:flex-row sm:items-start justify-between p-5 gap-4 transition-colors hover:bg-neutral-50/30"
              >
                {/* Left Thumbnail & Info */}
                <div className="flex gap-4 items-start min-w-0 flex-1">
                  {/* Thumb Wrapper */}
                  <button
                    type="button"
                    id={`btn-preview-thumb-${item.id}`}
                    onClick={() => {
                      const idx = files.findIndex(f => f.id === item.id);
                      if (idx !== -1) setPreviewIndex(idx);
                    }}
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center group/thumb cursor-zoom-in focus:outline-none focus:ring-1.5 focus:ring-[#7653F8]/40 mt-0.5"
                    title="Click to preview and inspect details"
                  >
                    {item.previewUrl ? (
                      <>
                        <img 
                          src={item.previewUrl} 
                          alt="Preview" 
                          className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-110" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-all duration-200 flex items-center justify-center">
                          <Eye className="h-4.5 w-4.5 text-white" />
                        </div>
                      </>
                    ) : (
                      <ImageIcon className="h-5 w-5 text-neutral-300" />
                    )}
                    <span className="absolute bottom-1 right-1 px-1 py-0.25 text-[8px] font-mono uppercase bg-neutral-950/80 text-white rounded text-center">
                      {item.originalFormat}
                    </span>
                  </button>

                  {/* Metadata */}
                  <div className="min-w-0 flex-1">
                    <h5 className="text-sm font-semibold text-neutral-900 truncate tracking-tight pr-4" title={item.file.name}>
                      {item.file.name}
                    </h5>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-neutral-400 font-mono">
                      <span>{formatBytes(item.size)}</span>
                      {hasSavings && (
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="h-3 w-3 text-neutral-400" />
                          <span className="text-neutral-700 font-semibold">{formatBytes(item.convertedSize!)}</span>
                          {savingsPercent < 0 && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-1 rounded font-bold text-[10px]">
                              <TrendingDown className="h-2.5 w-2.5" />
                              {savingsPercent}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Automatic Target Format Suggestion of pixsy */}
                    {item.analysis && (
                      <div className="mt-2.5 flex items-start gap-2 text-[11px] bg-[#7653F8]/5 border border-[#7653F8]/10 rounded-xl p-2.5 max-w-xl shadow-[0_4px_12px_rgba(118,83,248,0.02)] transition-all animate-fade-in">
                        <Sparkles className="h-3.5 w-3.5 text-[#7653F8] mt-0.5 shrink-0 animate-pulse" />
                        <div className="text-left text-neutral-600 leading-relaxed font-sans font-medium">
                          <span className="font-bold text-[#7653F8] mr-1">Suggested target: {item.analysis.recommendation.toUpperCase()}</span>
                          <span className="text-neutral-500">— {item.analysis.reason}</span>
                          {item.outputFormat !== item.analysis.recommendation && (
                            <button
                              id={`btn-apply-suggestion-${item.id}`}
                              type="button"
                              onClick={() => onUpdateFileSettings(item.id, item.analysis!.recommendation, item.quality)}
                              className="text-[#7653F8] font-bold hover:text-[#5e3ec4] underline underline-offset-2 ml-2.5 cursor-pointer block sm:inline-block mt-1 sm:mt-0 transition-colors"
                            >
                              Apply Suggestion
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center Tuning Details */}
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 sm:justify-end">
                  
                  {/* Local row controls */}
                  <div className="flex items-center gap-2">
                    {/* Select Formats */}
                    <div className="relative">
                      <select
                        id={`select-format-${item.id}`}
                        value={item.outputFormat}
                        disabled={item.status === 'converting'}
                        onChange={(e) => onUpdateFileSettings(item.id, e.target.value as ConversionFormat, item.quality)}
                        className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-150 text-neutral-700 font-mono text-xs font-bold uppercase px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7653F8] rounded-lg pr-7 text-left cursor-pointer transition-all"
                      >
                        <option value="webp">WebP</option>
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-400">
                        <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>

                    {/* Quality Gear triggers modal popup details */}
                    {item.outputFormat !== 'png' && (
                      <div className="flex items-center gap-1 bg-gray-50 border border-gray-150 rounded-lg px-2 py-1.5 text-xs">
                        <span className="text-[10px] font-mono text-gray-400">Q:</span>
                        <input
                          type="number"
                          id={`input-quality-${item.id}`}
                          min="10"
                          max="100"
                          step="5"
                          disabled={item.status === 'converting'}
                          value={Math.round(item.quality * 100)}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(10, parseInt(e.target.value) || 85));
                            onUpdateFileSettings(item.id, item.outputFormat, val / 100);
                          }}
                          className="w-8 font-mono font-bold text-gray-800 bg-transparent text-center focus:outline-none"
                        />
                        <span className="font-mono text-[9px] text-gray-400">%</span>
                      </div>
                    )}
                  </div>

                  {/* Status Indicator Badges */}
                  <div className="shrink-0">
                    {item.status === 'pending' && (
                      <button
                        id={`btn-convert-${item.id}`}
                        onClick={() => onConvertFile(item.id)}
                        className="flex items-center gap-1.5 rounded-full bg-[#7653F8]/5 px-3 py-1.5 select-none border border-[#7653F8]/10 text-[#7653F8] hover:border-[#7653F8]/30 hover:bg-[#7653F8]/10 cursor-pointer text-xs font-sans font-semibold transition-all"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-[#7653F8]" />
                        Convert
                      </button>
                    )}
                    {item.status === 'converting' && (
                      <span className="flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-150 px-3 py-1 select-none text-xs font-sans text-gray-500 font-medium">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#7653F8]" />
                        Processing
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100/80 px-3 py-1 select-none text-xs font-sans text-emerald-700 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Ready
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span 
                        className="flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-100 px-3 py-1 select-none text-xs font-sans text-rose-700 font-medium"
                        title={item.error}
                      >
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                        Failed
                      </span>
                    )}
                  </div>

                  {/* Right Download / Remove CTAs */}
                  <div className="flex items-center gap-1 border-l border-neutral-100 pl-3">
                    {onEditFile && (
                      <button
                        id={`btn-edit-${item.id}`}
                        onClick={() => onEditFile(item)}
                        className="h-8 w-8 flex items-center justify-center text-neutral-400 hover:text-[#7653F8] hover:bg-[#7653F8]/10 rounded-lg transition-colors focus:outline-none"
                        title="Edit Image in Workspace"
                      >
                        <Sliders className="h-4.5 w-4.5" />
                      </button>
                    )}
                    {item.status === 'success' ? (
                      <button
                        id={`btn-download-${item.id}`}
                        onClick={() => onDownloadSingle(item.id)}
                        className="h-8 w-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none"
                        title="Download Converted Image"
                      >
                        <Download className="h-4.5 w-4.5" />
                      </button>
                    ) : (
                      <div className="h-8 w-8" /> // Grid Alignment Spacer
                    )}
                    <button
                      id={`btn-remove-${item.id}`}
                      disabled={item.status === 'converting'}
                      onClick={() => onRemoveFile(item.id)}
                      className="h-8 w-8 flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 focus:outline-none"
                      title="Remove From Queue"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Bottom Footer Commands Control Center */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-add-more-footer"
            onClick={onAddMore}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all border border-gray-150 focus:outline-none cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Images
          </button>
          <button
            id="btn-clear-all-footer"
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-50 text-gray-400 hover:text-rose-600 transition-all border border-gray-150 focus:outline-none cursor-pointer"
          >
            <ListRestart className="h-4 w-4 text-gray-400 group-hover:text-rose-600" />
            Clear Queue
          </button>
        </div>

        {/* Global batch converter action */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {processedFiles > 0 && (
            <button
              id="btn-download-zip"
              onClick={onDownloadZip}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm shadow-emerald-700/10 focus:outline-none cursor-pointer"
            >
              <FolderArchive className="h-4 w-4" />
              Download ZIP Archive ({processedFiles})
            </button>
          )}

          {pendingFiles > 0 && (
            <button
              id="btn-convert-all"
              onClick={onConvertAll}
              disabled={isConverting}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-[#7653F8] hover:bg-[#6039ea] text-white transition-all disabled:opacity-60 shadow-md shadow-[#7653F8]/15 focus:outline-none cursor-pointer"
            >
              {isConverting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin animate-duration-1000" />
                  Processing Images...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Convert Remaining ({pendingFiles})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      <AnimatePresence>
        {previewIndex !== null && files[previewIndex] && (() => {
          const activeFile = files[previewIndex];
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col justify-between bg-neutral-950/98 backdrop-blur-md text-white select-none p-4 md:p-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between w-full border-b border-neutral-800 pb-4 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <span className="px-2.5 py-0.5 rounded bg-[#7653F8]/20 border border-[#7653F8]/30 text-[#A488FF] text-[10px] uppercase font-bold tracking-wider font-mono shrink-0">
                    Image {previewIndex + 1} of {files.length}
                  </span>
                  <h3 className="text-sm font-semibold truncate text-neutral-100 max-w-xs sm:max-w-md md:max-w-xl" title={activeFile.file.name}>
                    {activeFile.file.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer focus:outline-none border border-neutral-800"
                  title="Close Preview (ESC)"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Navigation & Image Core Display */}
              <div className="relative flex-grow flex items-center justify-center p-2.5 md:p-6 my-2">
                {/* Navigation - Left Arrow */}
                <button
                  type="button"
                  onClick={() => setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : files.length - 1))}
                  className="absolute left-1 md:left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800/40 backdrop-blur-sm transition-all cursor-pointer focus:outline-none"
                  title="Previous (Left Arrow)"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                {/* Main Visualizer Canvas */}
                <div className="relative max-w-4xl max-h-[55vh] md:max-h-[60vh] w-full h-full flex items-center justify-center">
                  {viewMode === 'converted' && activeFile.convertedUrl ? (
                    <img
                      src={activeFile.convertedUrl}
                      alt={`Converted view`}
                      onLoad={handleImgLoad}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <img
                      src={activeFile.previewUrl}
                      alt="Original view"
                      onLoad={handleImgLoad}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Float Status Ribbon */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-sm border border-neutral-800 text-[10px] font-bold text-neutral-300 font-mono tracking-wide uppercase">
                    Viewing: {viewMode === 'converted' ? `Compressed (${activeFile.outputFormat})` : 'Original Image'}
                  </div>
                </div>

                {/* Navigation - Right Arrow */}
                <button
                  type="button"
                  onClick={() => setPreviewIndex((prev) => (prev !== null && prev < files.length - 1 ? prev + 1 : 0))}
                  className="absolute right-1 md:right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800/40 backdrop-blur-sm transition-all cursor-pointer focus:outline-none"
                  title="Next (Right Arrow)"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Bottom Config Panel */}
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 md:p-5 shrink-0 space-y-4 max-w-5xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Mode Toggles */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-neutral-400">Inspecting Filter:</span>
                    <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setViewMode('original')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all duration-155 cursor-pointer ${
                          viewMode === 'original'
                            ? 'bg-neutral-800 text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        disabled={activeFile.status !== 'success'}
                        onClick={() => setViewMode('converted')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all duration-155 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          viewMode === 'converted'
                            ? 'bg-[#7653F8] text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                        title={activeFile.status !== 'success' ? 'Run conversion to compare output density' : 'Inspect converted image quality'}
                      >
                        Converted {activeFile.status === 'success' ? `(${activeFile.outputFormat})` : ''}
                      </button>
                    </div>
                  </div>

                  {/* Actions inside Lightbox */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {activeFile.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => onConvertFile(activeFile.id)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#7653F8] hover:bg-[#6039ea] text-white text-xs font-bold rounded-xl transition-all cursor-pointer focus:outline-none shadow-lg shadow-[#7653F8]/20"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Convert Image
                      </button>
                    )}
                    {activeFile.status === 'success' && (
                      <button
                        type="button"
                        onClick={() => onDownloadSingle(activeFile.id)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer focus:outline-none shadow-lg shadow-emerald-700/20"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Converted
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Recommendation explanation inside lightbox */}
                {activeFile.analysis && (
                  <div className="mt-3 flex items-start gap-2.5 text-xs bg-[#7653F8]/5 border border-[#7653F8]/15 rounded-xl p-3 shadow-inner shadow-black/20">
                    <Sparkles className="h-4 w-4 text-[#A488FF] mt-0.5 shrink-0 animate-pulse" />
                    <div className="text-left text-neutral-300 font-sans font-medium flex-1 leading-relaxed">
                      <div className="flex items-center gap-1.5 font-bold text-[#A488FF]">
                        pixsy suggestion: {activeFile.analysis.recommendation.toUpperCase()}
                      </div>
                      <div className="text-neutral-400 text-[11px] mt-0.5">{activeFile.analysis.reason}</div>
                    </div>
                    {activeFile.outputFormat !== activeFile.analysis.recommendation && (
                      <button
                        type="button"
                        id={`btn-apply-suggestion-lightbox-${activeFile.id}`}
                        onClick={() => onUpdateFileSettings(activeFile.id, activeFile.analysis!.recommendation, activeFile.quality)}
                        className="bg-[#7653F8] hover:bg-[#623ce3] text-white font-bold px-2.5 py-1.5 rounded-lg text-[10px] shrink-0 inline-flex items-center gap-1 transition-all focus:outline-none border border-neutral-700/50 cursor-pointer shadow-md"
                      >
                        Apply Suggestion
                      </button>
                    )}
                  </div>
                )}

                {/* Stats Dashboard Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 border-t border-neutral-900 pt-4 text-xs font-mono text-neutral-400">
                  <div className="flex flex-col gap-1 p-2 bg-neutral-900/40 rounded-xl border border-neutral-900">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Format Preset</span>
                    <span className="text-neutral-200 font-semibold uppercase">{activeFile.originalFormat} ➔ {activeFile.outputFormat}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 bg-neutral-900/40 rounded-xl border border-neutral-900">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Resolution</span>
                    <span className="text-neutral-200 font-semibold truncate">
                      {imgDimensions ? `${imgDimensions.width} × ${imgDimensions.height} px` : 'Calculating...'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 bg-neutral-900/40 rounded-xl border border-neutral-900">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Original Size</span>
                    <span className="text-neutral-200 font-semibold">{formatBytes(activeFile.size)}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2 bg-neutral-900/40 rounded-xl border border-[#7653F8]/15">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Compressed Size</span>
                    {activeFile.status === 'success' && activeFile.convertedSize ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold truncate">
                        <span>{formatBytes(activeFile.convertedSize)}</span>
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-1 rounded text-emerald-400">
                          -{Math.max(0, Math.round(((activeFile.size - activeFile.convertedSize) / activeFile.size) * 100))}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-neutral-500 select-none">No optimization details</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
