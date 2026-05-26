/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  HelpCircle, 
  X, 
  ArrowRight, 
  Monitor, 
  FileCheck, 
  Check, 
  Zap, 
  Sparkles, 
  Lock,
  Shield,
  Layers,
  Facebook,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react';
import { ConvertibleFile, ConversionFormat } from './types';
import Header from './components/Header';
import Uploader from './components/Uploader';
import ConverterList from './components/ConverterList';
import ImageEditor from './components/ImageEditor';
import { 
  convertImageInBrowser, 
  triggerFileDownload, 
  downloadAllAsZip,
  formatBytes,
  analyzeImageProperties
} from './utils/imageProcess';

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'editor'>('converter');
  const [selectedFileToEdit, setSelectedFileToEdit] = useState<ConvertibleFile | null>(null);
  const [files, setFiles] = useState<ConvertibleFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Ingest selected files
  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const formattedFiles: ConvertibleFile[] = newFiles.map((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const previewUrl = URL.createObjectURL(file);
      
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        originalFormat: extension,
        outputFormat: 'webp', // temporary fallback default
        quality: 0.85, // default quality preset
        previewUrl,
        status: 'pending',
        convertedBlob: null,
        convertedUrl: null,
        convertedSize: null,
        progress: 0
      };
    });

    setFiles((prev) => [...prev, ...formattedFiles]);

    // Async analysis of transparency, resolution, and format suggestion
    formattedFiles.forEach((fileItem) => {
      analyzeImageProperties(fileItem.file).then((result) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  outputFormat: result.recommendation,
                  analysis: result
                }
              : f
          )
        );
      });
    });
  }, []);

  // Set file configurations
  const handleUpdateFileSettings = useCallback((id: string, format: ConversionFormat, quality: number) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        
        // If they change configuration, toggle status back to pending if it was done or failed
        const resetsStatus = f.status === 'success' || f.status === 'failed';
        
        // Revoke old converted URL if settings change
        if (resetsStatus && f.convertedUrl) {
          URL.revokeObjectURL(f.convertedUrl);
        }

        return {
          ...f,
          outputFormat: format,
          quality,
          status: resetsStatus ? 'pending' : f.status,
          convertedBlob: resetsStatus ? null : f.convertedBlob,
          convertedUrl: resetsStatus ? null : f.convertedUrl,
          convertedSize: resetsStatus ? null : f.convertedSize,
        };
      })
    );
  }, []);

  // Delete a single row from memory
  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
        if (target.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // Clear all files
  const handleClearAll = useCallback(() => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl);
    });
    setFiles([]);
  }, [files]);

  // Convert an individual file
  const handleConvertFile = useCallback(async (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'converting' } : f))
    );

    const fileItem = files.find((f) => f.id === id);
    if (!fileItem) return;

    try {
      const result = await convertImageInBrowser(
        fileItem.file,
        fileItem.outputFormat,
        fileItem.quality
      );

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'success',
                convertedBlob: result.blob,
                convertedUrl: result.url,
                convertedSize: result.size,
              }
            : f
        )
      );
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'failed',
                error: err?.message || 'Incompatible conversion mapping',
              }
            : f
        )
      );
    }
  }, [files]);

  // Mass batch queue convert trigger
  const handleConvertAll = useCallback(async () => {
    setIsConverting(true);
    const pending = files.filter((f) => f.status === 'pending');

    await Promise.all(
      pending.map(async (fileItem) => {
        // Mark as converting
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'converting' } : f))
        );

        try {
          const result = await convertImageInBrowser(
            fileItem.file,
            fileItem.outputFormat,
            fileItem.quality
          );

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? {
                    ...f,
                    status: 'success',
                    convertedBlob: result.blob,
                    convertedUrl: result.url,
                    convertedSize: result.size,
                  }
                : f
            )
          );
        } catch (err: any) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? {
                    ...f,
                    status: 'failed',
                    error: err?.message || 'Processing crash',
                  }
                : f
            )
          );
        }
      })
    );
    setIsConverting(false);
  }, [files]);

  // Trigger download of single file
  const handleDownloadSingle = useCallback((id: string) => {
    const item = files.find((f) => f.id === id);
    if (item && item.convertedUrl && item.status === 'success') {
      const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      const downloadName = `${baseName}.${item.outputFormat}`;
      triggerFileDownload(item.convertedUrl, downloadName);
    }
  }, [files]);

  // Multi ZIP generator
  const handleDownloadZip = useCallback(async () => {
    const validFiles = files.filter((f) => f.status === 'success' && f.convertedBlob !== null);
    if (validFiles.length === 0) return;

    try {
      const zipBlob = await downloadAllAsZip(validFiles);
      const zipUrl = URL.createObjectURL(zipBlob);
      triggerFileDownload(zipUrl, `converted_images_${Date.now()}.zip`);
      
      // Expire URL in a bit
      setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
    } catch (error) {
      console.error('ZIP generation failed', error);
    }
  }, [files]);

  // "Add More" file trigger click
  const triggerAddMoreFiles = () => {
    hiddenInputRef.current?.click();
  };

  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files) as File[];
      const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        handleFilesSelected(imageFiles);
      }
    }
  };

  return (
    <div id="app-root-layout" className="min-h-screen bg-[#F8F9FA] flex flex-col antialiased">
      
      {/* Header bar link */}
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onShowPrivacyModal={() => setShowPrivacyModal(true)} 
        onShowHowItWorksModal={() => setShowHowItWorksModal(true)}
        onReset={handleClearAll}
      />

      {/* Hidden input node for adding more queue items */}
      <input
        ref={hiddenInputRef}
        type="file"
        id="hidden-file-append"
        className="hidden"
        multiple
        accept="image/*"
        onChange={handleHiddenInputChange}
      />

      {/* Main Core Area: Responsive center content */}
      <main className="flex-grow flex flex-col px-6 sm:px-10 py-10 max-w-7xl mx-auto w-full">
        
        {activeTab === 'editor' ? (
          <motion.div
            key="editor-workspace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full flex-grow flex flex-col"
          >
            <ImageEditor 
              files={files}
              onAddFiles={handleFilesSelected}
              onSelectFileToEdit={selectedFileToEdit}
            />
          </motion.div>
        ) : (
          <>
            {/* Intro Hero Section (Dynamic) */}
            <AnimatePresence mode="wait">
              {files.length === 0 ? (
                <motion.div
                  key="hero-welcome"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="text-center max-w-3xl mx-auto mb-10 mt-6"
                >
                  {/* Purple Pill Badge */}
                  <div className="flex justify-center mb-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7653F8]/5 border border-[#7653F8]/10 text-[11px] text-[#7653F8] font-bold tracking-tight">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7653F8] animate-pulse" />
                      Professional File Converter →
                    </span>
                  </div>

                  <h1 className="text-4xl sm:text-[54px] font-black tracking-tight text-neutral-900 leading-none">
                    Convert Files{" "}
                    <span className="block mt-2 bg-gradient-to-r from-[#7653F8] via-[#8F72FF] to-[#7653F8] bg-clip-text text-transparent drop-shadow-sm">
                      Instantly & Securely
                    </span>
                  </h1>

                  <p className="mt-4 text-neutral-500 text-sm max-w-xl mx-auto leading-relaxed">
                    The fastest way to convert images and documents on the web. <strong className="text-neutral-900">No uploads needed</strong> — powered by WebAssembly for 100% privacy and blazing speed.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="hero-status"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mb-8"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-5 gap-3.5">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                        Active Tasks Queue
                      </h2>
                      <p className="text-xs text-neutral-400 mt-1 font-sans">
                        Configure target outputs individually or use global format presets.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1 overflow-hidden">
                        {files.slice(0, 4).map((f) => (
                          <img
                            key={f.id}
                            className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-neutral-50 object-cover"
                            src={f.previewUrl}
                            alt="Queue thumbnail"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                        {files.length > 4 && (
                          <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-neutral-250 text-[10px] font-semibold text-neutral-700 font-mono ring-2 ring-neutral-50">
                            +{files.length - 4}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500 font-medium font-sans">Images loaded</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Panel / Dashboard (Dynamic toggles) */}
            <div className="flex-grow flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {files.length === 0 ? (
                  <motion.div
                    key="uploader-module"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="w-full space-y-12"
                  >
                    <Uploader onFilesSelected={handleFilesSelected} />

                    {/* Trusted Creative Professionals Logos Row resembling ConvertFree screenshot with autoplay loop */}
                    <div className="w-full text-center py-4 select-none overflow-hidden relative">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">
                        TRUSTED BY CREATIVE PROFESSIONALS AT
                      </p>
                      
                      {/* Gradient overlays to fade edges */}
                      <div className="absolute left-0 bottom-0 top-10 w-16 bg-gradient-to-r from-[#F8F9FA] to-transparent z-10 pointer-events-none" />
                      <div className="absolute right-0 bottom-0 top-10 w-16 bg-gradient-to-l from-[#F8F9FA] to-transparent z-10 pointer-events-none" />

                      <div className="flex w-full overflow-hidden">
                        <div className="animate-marquee flex items-center gap-12 whitespace-nowrap text-gray-400 font-black tracking-wider text-xs font-mono py-2">
                          {/* First instance */}
                          <span className="opacity-45 hover:opacity-100 transition-opacity">ACME <span className="text-[8px] font-bold tracking-normal bg-neutral-200/40 border border-neutral-300/20 px-1 py-0.5 rounded text-neutral-500">CORP</span></span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity tracking-widest text-neutral-800">◇ VERTEX</span>
                          <span className="italic opacity-45 hover:opacity-100 transition-opacity font-serif font-black tracking-tighter">layers.</span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity text-neutral-900 tracking-widest font-black">◆ SISYPHUS</span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity text-neutral-700 font-bold">C ircool</span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity">ACME <span className="text-[8px] font-bold tracking-normal bg-neutral-200/40 border border-neutral-300/20 px-1 py-0.5 rounded text-neutral-500">CORP</span></span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity tracking-widest text-[#7653F8]">◇ PIXSY PRO</span>

                          {/* Doubled instance for seamless looping */}
                          <span className="opacity-45 hover:opacity-100 transition-opacity">ACME <span className="text-[8px] font-bold tracking-normal bg-neutral-200/40 border border-neutral-300/20 px-1 py-0.5 rounded text-neutral-500">CORP</span></span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity tracking-widest text-neutral-800">◇ VERTEX</span>
                          <span className="italic opacity-45 hover:opacity-100 transition-opacity font-serif font-black tracking-tighter">layers.</span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity text-neutral-900 tracking-widest font-black">◆ SISYPHUS</span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity text-neutral-700 font-bold">C ircool</span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity">ACME <span className="text-[8px] font-bold tracking-normal bg-neutral-200/40 border border-neutral-300/20 px-1 py-0.5 rounded text-neutral-500">CORP</span></span>
                          <span className="opacity-45 hover:opacity-100 transition-opacity tracking-widest text-[#7653F8]">◇ PIXSY PRO</span>
                        </div>
                      </div>
                    </div>

                    {/* Features block comparing pixsy with alternatives */}
                    <div className="text-center pt-10 border-t border-gray-100/60 max-w-3xl mx-auto space-y-10">
                      <div className="max-w-xl mx-auto space-y-2">
                        <h2 className="text-3xl sm:text-[36px] font-black tracking-tight text-neutral-900 leading-tight">
                          Why pixsy is <span className="bg-[#7653F8]/5 text-[#7653F8] px-3 py-1 rounded-xl border border-[#7653F8]/10 font-bold">Better</span>
                        </h2>
                        <p className="text-[13px] text-neutral-500 leading-relaxed">
                          Most converters upload your files to a server. We don't. Everything happens locally on your device using advanced WebAssembly and Canvas APIs for <strong className="text-[#7653F8] font-bold">maximum security</strong>.
                        </p>
                      </div>

                      {/* 3-Column Premium Cards exactly like the mock (Shield, Bolt, Layer stack) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {/* Card 1: 100% Privacy Focused */}
                        <div className="bg-white border border-gray-100/80 rounded-2xl p-6.5 shadow-[0_8px_24px_rgba(0,0,0,0.01)] transition-all hover:translate-y-[-3px] duration-300 hover:shadow-[0_12px_32px_rgba(118,83,248,0.04)]">
                          <div className="w-10 h-10 rounded-xl bg-[#7653F8]/5 flex items-center justify-center text-[#7653F8] mb-4 border border-[#7653F8]/10">
                            <Shield className="h-5 w-5" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-950">100% Privacy Focused</h4>
                          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                            Your files never leave your device. Perfect for sensitive documents like IDs, contracts, or personal photos.
                          </p>
                        </div>

                        {/* Card 2: Blazing Fast Speed */}
                        <div className="bg-white border border-gray-100/80 rounded-2xl p-6.5 shadow-[0_8px_24px_rgba(0,0,0,0.01)] transition-all hover:translate-y-[-3px] duration-300 hover:shadow-[0_12px_32px_rgba(118,83,248,0.04)]">
                          <div className="w-10 h-10 rounded-xl bg-[#7653F8]/5 flex items-center justify-center text-[#7653F8] mb-4 border border-[#7653F8]/10">
                            <Zap className="h-5 w-5" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-950">Blazing Fast Speed</h4>
                          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                            No upload time, no download time. Conversion happens as fast as your computer can process it.
                          </p>
                        </div>

                        {/* Card 3: Unlimited Batching */}
                        <div className="bg-white border border-gray-100/80 rounded-2xl p-6.5 shadow-[0_8px_24px_rgba(0,0,0,0.01)] transition-all hover:translate-y-[-3px] duration-300 hover:shadow-[0_12px_32px_rgba(118,83,248,0.04)]">
                          <div className="w-10 h-10 rounded-xl bg-[#65cda5]/5 flex items-center justify-center text-[#2cb882] mb-4 border border-[#65cda5]/15">
                            <Layers className="h-5 w-5" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-950">Unlimited Batching</h4>
                          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                            Convert 100 files at once? No problem. We don't throttle your usage or ask for a credit card.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="workspace-module"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                  >
                    <ConverterList
                      files={files}
                      onRemoveFile={handleRemoveFile}
                      onUpdateFileSettings={handleUpdateFileSettings}
                      onConvertFile={handleConvertFile}
                      onConvertAll={handleConvertAll}
                      onAddMore={triggerAddMoreFiles}
                      onClearAll={handleClearAll}
                      onDownloadZip={handleDownloadZip}
                      onDownloadSingle={handleDownloadSingle}
                      isConverting={isConverting}
                      onEditFile={(file) => {
                        setSelectedFileToEdit(file);
                        setActiveTab('editor');
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

      </main>

      {/* Bottom Privacy Status Footer resembling the ConvertFree screenshot */}
      <footer className="border-t border-gray-100 bg-white py-12 px-6 shrink-0 text-center select-none">
        <div id="footer-inner" className="max-w-7xl mx-auto flex flex-col items-center justify-center space-y-5">
          {/* Logo brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7653F8] to-[#997FFF] flex items-center justify-center shadow-sm shadow-[#7653F8]/20">
              <Zap className="h-4 w-4 text-white fill-white" />
            </div>
            <span className="font-sans text-[15px] font-black tracking-tight text-neutral-900">
              pixsy
            </span>
          </div>

          <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
            Professional file conversion directly in your browser. Secure, fast, and free forever.
          </p>

          {/* Social icons */}
          <div className="flex items-center justify-center gap-5 pt-1 text-neutral-450">
            <a href="https://github.com/hellomoksedul" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors" title="@hellomoksedul GitHub">
              <Github className="h-4.5 w-4.5" />
            </a>
            <a href="https://x.com/hellomoksedul" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors" title="Twitter / X">
              <Twitter className="h-4.5 w-4.5" />
            </a>
            <a href="https://facebook.com/hellomoksedul" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors" title="Facebook">
              <Facebook className="h-4.5 w-4.5" />
            </a>
            <a href="https://linkedin.com/in/hellomoksedul" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors" title="LinkedIn">
              <Linkedin className="h-4.5 w-4.5" />
            </a>
          </div>

          {/* Copyright details */}
          <div className="text-[10px] text-neutral-400 font-sans pt-2">
            © 2026 pixsy. Built by <a href="https://github.com/hellomoksedul" target="_blank" rel="noopener noreferrer" className="hover:underline text-neutral-500 font-bold">@hellomoksedul</a>
          </div>
        </div>
      </footer>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Privacy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacyModal(false)}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
            />

            {/* Content card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 text-left shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-neutral-900 tracking-tight">Data Privacy Protocol</h3>
                </div>
                <button
                  id="btn-close-privacy"
                  onClick={() => setShowPrivacyModal(false)}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs leading-relaxed text-neutral-600 font-sans">
                <p>
                  Our image conversion system is built primarily on the principle of <strong className="text-neutral-950">Local Zero-Knowledge Architecture</strong>. No networks are queried during your format conversions.
                </p>
                <div className="space-y-2 bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-800">Browser Bound:</strong> Your graphic files never leave your system. Everything is evaluated inside the HTML5 canvas runtime context of this browser.</span>
                  </div>
                  <div className="flex gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-800">No Tracking:</strong> No user logs, telemetry cookies, or background server analytics scripts are embedded.</span>
                  </div>
                  <div className="flex gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-800">Self-Garbage-Collected:</strong> Native Object URIs are immediately disposed of upon manual queue clearing or page reload to safeguard cache blocks.</span>
                  </div>
                </div>
                <p className="text-neutral-400 italic">
                  Since all processing happens locally, conversions are faster and perfectly secure—even if you disconnect your device from the internet.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  id="btn-confirm-privacy"
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-[#7653F8] hover:bg-[#6039ea] text-white transition-all focus:outline-none cursor-pointer"
                >
                  Close Secure Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. How It Works Modal */}
      <AnimatePresence>
        {showHowItWorksModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHowItWorksModal(false)}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
            />

            {/* Content card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 text-left shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#7653F8]" />
                  <h3 className="text-base font-bold text-neutral-900 tracking-tight">Local Core Pipeline</h3>
                </div>
                <button
                  id="btn-close-how-it-works"
                  onClick={() => setShowHowItWorksModal(false)}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs leading-relaxed text-neutral-600 font-sans">
                <p>
                  Our image engine leverages standard GPU-backed APIs of modern browsers to format and compress your images on-the-fly:
                </p>

                <div className="space-y-3">
                  {[
                    { step: "01", title: "Ingest", text: "Files dropped are converted to temporary in-memory blob targets. This enables instant sandboxed thumbnails." },
                    { step: "02", title: "Raster", text: "The system spawns a virtual canvas module corresponding to the exact natural layout coordinates of your graphic." },
                    { step: "03", title: "Composite", text: "If mapping to non-translucent wrappers like JPEG, a pure white matte background base is overlayed beneath the pixel arrays." },
                    { step: "04", title: "Compile", text: "The browser's canvas encoder converts raw bitmap structures into the targeted MIME formats (.webp, .png, or .jpeg) according to quality scale dials." }
                  ].map((s, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="font-mono text-[10px] font-bold text-[#7653F8] bg-[#7653F8]/5 h-5 w-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                        {s.step}
                      </span>
                      <div>
                        <h4 className="font-bold text-neutral-800">{s.title}</h4>
                        <p className="text-neutral-500 mt-0.5">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  id="btn-confirm-how"
                  onClick={() => setShowHowItWorksModal(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-[#7653F8] hover:bg-[#6039ea] text-white transition-all focus:outline-none cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
