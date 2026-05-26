/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image, ShieldAlert, Monitor, Sparkles } from 'lucide-react';

interface UploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export default function Uploader({ onFilesSelected }: UploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // Handle drop events
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files) as File[];
      const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles);
      }
    }
  };

  // Handle file input selection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files) as File[];
      const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles);
      }
    }
  };

  // Support paste events globally inside this container
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files) {
        const pastedFiles = Array.from(e.clipboardData.files) as File[];
        const imageFiles = pastedFiles.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          onFilesSelected(imageFiles);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onFilesSelected]);

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="uploader-container" className="w-full max-w-4xl mx-auto">
      {/* Main Drag & Drop Box resembling the ConvertFree layout */}
      <div
        id="drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        className={`group relative flex flex-col items-center justify-center rounded-3xl border border-dashed p-6 sm:p-10 md:p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive 
            ? "border-[#7653F8] bg-[#7653F8]/5 scale-[1.005] shadow-xl shadow-[#7653F8]/5" 
            : "border-gray-200/70 bg-white hover:border-[#7653F8]/45 hover:bg-neutral-50/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-input"
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleInputChange}
        />

        {/* Outer subtle glow on drag */}
        <div className={`absolute inset-0 rounded-3xl transition-opacity duration-300 pointer-events-none ${
          isDragActive ? "opacity-100 border border-[#7653F8]/10" : "opacity-0"
        }`} />

        {/* Core Upload Central Card resembling the ConvertFree screenshot */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-white border border-gray-100 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.02)] max-w-sm w-full transition-all duration-300 group-hover:scale-[1.02] hover:shadow-[0_16px_32px_rgba(118,83,248,0.06)]">
          {/* Circular Purple Icon Box */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center bg-[#7653F8]/5 rounded-2xl text-[#7653F8] border border-[#7653F8]/10 shadow-sm">
            <UploadCloud className="h-6 w-6 text-[#7653F8]" />
          </div>

          <h3 className="text-xl font-bold text-neutral-800 tracking-tight">
            Upload Files
          </h3>

          <p className="mt-1.5 text-xs text-neutral-500 max-w-xs font-sans font-medium leading-relaxed">
            Drag & drop your files here, or <span className="text-[#7653F8] font-bold group-hover:underline decoration-[#7653F8]/80 cursor-pointer">browse</span>
          </p>
        </div>

        {/* Quick Clipboard Paste Note */}
        <div className="mt-6 flex items-center justify-center gap-1.5 rounded-lg bg-gray-50/60 border border-gray-100 px-3 py-1.5 text-[11px] font-mono text-neutral-400">
          <span className="font-bold text-neutral-600 bg-neutral-200/40 rounded px-1.5 py-0.5 text-[10px]">Ctrl + V</span>
          <span>to paste from keyboard clipboard</span>
        </div>

        {/* Formats hint */}
        <div className="mt-8 flex flex-wrap justify-center gap-1.5 max-w-md">
          {['PNG', 'JPEG', 'WEBP', 'HEIC', 'SVG', 'GIF'].map((ext) => (
            <span 
              key={ext}
              className="rounded-md border border-gray-100 bg-neutral-50/50 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide text-neutral-500"
            >
              .{ext}
            </span>
          ))}
        </div>
      </div>

      {/* Security Statement */}
      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-neutral-100 bg-neutral-50/30 p-4 max-w-2xl mx-auto">
        <ShieldAlert className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-neutral-500 font-sans">
          <strong className="text-neutral-800">No telemetry or logs:</strong> Images are converted dynamically inside your browser using canvas rendering layers. Not a single byte of your visual data touches our servers. Pure local-first sandbox environment.
        </p>
      </div>
    </div>
  );
}
