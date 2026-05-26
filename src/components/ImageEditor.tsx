import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Sliders, 
  Download, 
  Plus, 
  RefreshCw, 
  Sparkles, 
  Image as ImageIcon, 
  UploadCloud, 
  Check, 
  SlidersHorizontal,
  Maximize2,
  Trash2,
  Undo,
  Crop as CropIcon,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Info,
  Archive,
  Star,
  Compass,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConvertibleFile } from '../types';
import { formatBytes } from '../utils/imageProcess';

interface ImageEditorProps {
  files: ConvertibleFile[];
  onAddFiles: (files: File[]) => void;
  onSelectFileToEdit?: ConvertibleFile | null;
}

interface ImageState {
  brightness: number;  // 100% default
  contrast: number;    // 100% default
  saturation: number;  // 100% default
  sepia: number;       // 0% default
  grayscale: number;   // 0% default
  blur: number;        // 0px default
  hueRotate: number;   // 0deg default
  rotate: number;      // 0, 90, 180, 270 degrees
  flipH: boolean;
  flipV: boolean;
  width: number;
  height: number;
  aspectRatioLock: boolean;
}

const DEFAULT_IMAGE_STATE: ImageState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  grayscale: 0,
  blur: 0,
  hueRotate: 0,
  rotate: 0,
  flipH: false,
  flipV: false,
  width: 0,
  height: 0,
  aspectRatioLock: true,
};

const PRESETS = [
  { name: 'Original', state: DEFAULT_IMAGE_STATE },
  { name: 'Noir / Mono', state: { ...DEFAULT_IMAGE_STATE, grayscale: 100, contrast: 130 } },
  { name: 'Warm Retro', state: { ...DEFAULT_IMAGE_STATE, sepia: 45, brightness: 105, saturation: 110, contrast: 95 } },
  { name: 'Cool Nordic', state: { ...DEFAULT_IMAGE_STATE, saturation: 80, hueRotate: 15, contrast: 105 } },
  { name: 'Dreamy Blur', state: { ...DEFAULT_IMAGE_STATE, blur: 3, saturation: 115, brightness: 105 } },
  { name: 'Contrast Pro', state: { ...DEFAULT_IMAGE_STATE, contrast: 145, saturation: 125, brightness: 95 } },
  { name: 'Golden Glow', state: { ...DEFAULT_IMAGE_STATE, sepia: 25, brightness: 110, saturation: 130, hueRotate: -10 } },
];

type ToolTab = 'adjust' | 'crop' | 'filter';

export default function ImageEditor({ files, onAddFiles, onSelectFileToEdit }: ImageEditorProps) {
  const [activeFile, setActiveFile] = useState<ConvertibleFile | null>(null);
  const [imgState, setImgState] = useState<ImageState>(DEFAULT_IMAGE_STATE);
  const [activeTab, setActiveTab] = useState<ToolTab>('adjust');
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('Original');

  // Zoom inside layout center viewport
  const [zoomLevel, setZoomLevel] = useState<number>(100); // percentage

  // Image Cropper Coordinates & Drag overlays logic
  const [isCropperEnabled, setIsCropperEnabled] = useState<boolean>(false);
  // Crop coordinates expressed as percentage of the actual image boundaries (0-100)
  const [cropRect, setCropRect] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [cropAspect, setCropAspect] = useState<string>('free'); // 'free', '1:1', '4:3', '16:9', '16:10'

  // Drag interaction status 
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null); // 'nw', 'ne', 'se', 'sw', 'move'
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const dragStartRect = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // For canvas download
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState<number>(95);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isQueueExporting, setIsQueueExporting] = useState<boolean>(false);

  // Split-screen contrast slider
  const [isHoldingCompare, setIsHoldingCompare] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync with prop if it changes
  useEffect(() => {
    if (onSelectFileToEdit) {
      setActiveFile(onSelectFileToEdit);
    } else if (files.length > 0 && !activeFile) {
      setActiveFile(files[0]);
    }
  }, [onSelectFileToEdit, files]);

  // Load active image element properties
  useEffect(() => {
    if (activeFile) {
      setOriginalUrl(activeFile.previewUrl || '');
      
      const img = new Image();
      img.onload = () => {
        setNaturalWidth(img.naturalWidth);
        setNaturalHeight(img.naturalHeight);
        
        setImgState({
          ...DEFAULT_IMAGE_STATE,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        setActivePreset('Original');
        setZoomLevel(100);
        // Reset cropper defaults
        setIsCropperEnabled(false);
        setCropRect({ x: 15, y: 15, width: 70, height: 70 });
        setCropAspect('free');
      };
      img.src = activeFile.previewUrl || '';
    } else {
      setOriginalUrl('');
      setNaturalWidth(0);
      setNaturalHeight(0);
    }
  }, [activeFile]);

  // Handle local parameter updates
  const updateSetting = (key: keyof ImageState, value: any) => {
    setImgState((prev) => {
      const next = { ...prev, [key]: value };
      
      // Calculate aspect locked scale
      if (prev.aspectRatioLock && naturalWidth && naturalHeight) {
        const aspect = naturalWidth / naturalHeight;
        if (key === 'width' && typeof value === 'number') {
          next.height = Math.round(value / aspect);
        } else if (key === 'height' && typeof value === 'number') {
          next.width = Math.round(value * aspect);
        }
      }
      return next;
    });
    setActivePreset('Custom');
  };

  // Adjust to fixed constraints preset
  const selectPreset = (presetName: string, state: ImageState) => {
    setActivePreset(presetName);
    setImgState({
      ...state,
      width: imgState.width || naturalWidth,
      height: imgState.height || naturalHeight,
    });
  };

  // Drag-and-drop events
  const [dragActive, setDragActive] = useState<boolean>(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
      if (droppedFiles.length > 0) {
        onAddFiles(droppedFiles);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = (Array.from(e.target.files) as File[]).filter(f => f.type.startsWith('image/'));
      if (selectedFiles.length > 0) {
        onAddFiles(selectedFiles);
      }
    }
  };

  // Get active image's filter rules as a concatenated single CSS property value
  const getFilterCSS = () => {
    return `brightness(${imgState.brightness}%) contrast(${imgState.contrast}%) saturate(${imgState.saturation}%) sepia(${imgState.sepia}%) grayscale(${imgState.grayscale}%) blur(${imgState.blur}px) hue-rotate(${imgState.hueRotate}deg)`;
  };

  // Rotational & aspect flip matrices transformations
  const getTransformCSS = (): React.CSSProperties => {
    let transform = `rotate(${imgState.rotate}deg)`;
    if (imgState.flipH) transform += ' scaleX(-1)';
    if (imgState.flipV) transform += ' scaleY(-1)';
    return { transform };
  };

  // Interactive mouse events mapping out interactive custom Cropper overlay actions
  const handleCropperMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    
    // Save state offsets to track incremental mouse coordinate changes during drag
    dragStartOffset.current = { x: e.clientX, y: e.clientY };
    dragStartRect.current = { ...cropRect };
  };

  const handleCropperMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragHandle || !imgRef.current) return;

    const deltaX = e.clientX - dragStartOffset.current.x;
    const deltaY = e.clientY - dragStartOffset.current.y;

    // Get live dimensions of image preview element on DOM layout
    const imageWidth = imgRef.current.clientWidth;
    const imageHeight = imgRef.current.clientHeight;

    // Convert pixels to local percentage ratios based on screen dimension offsets
    const percentDeltaX = (deltaX / imageWidth) * 100;
    const percentDeltaY = (deltaY / imageHeight) * 100;

    let nextRect = { ...dragStartRect.current };

    if (dragHandle === 'move') {
      nextRect.x = Math.max(0, Math.min(100 - nextRect.width, dragStartRect.current.x + percentDeltaX));
      nextRect.y = Math.max(0, Math.min(100 - nextRect.height, dragStartRect.current.y + percentDeltaY));
    } else {
      // Resize modes
      if (dragHandle.includes('e')) {
        nextRect.width = Math.max(10, Math.min(100 - dragStartRect.current.x, dragStartRect.current.width + percentDeltaX));
      }
      if (dragHandle.includes('w')) {
        const potentialWidth = dragStartRect.current.width - percentDeltaX;
        if (potentialWidth >= 10) {
          nextRect.x = Math.max(0, dragStartRect.current.x + percentDeltaX);
          nextRect.width = dragStartRect.current.width + (dragStartRect.current.x - nextRect.x);
        }
      }
      if (dragHandle.includes('s')) {
        nextRect.height = Math.max(10, Math.min(100 - dragStartRect.current.y, dragStartRect.current.height + percentDeltaY));
      }
      if (dragHandle.includes('n')) {
        const potentialHeight = dragStartRect.current.height - percentDeltaY;
        if (potentialHeight >= 10) {
          nextRect.y = Math.max(0, dragStartRect.current.y + percentDeltaY);
          nextRect.height = dragStartRect.current.height + (dragStartRect.current.y - nextRect.y);
        }
      }

      // Force locking constraints aspect ratio logic inside drag operations if requested
      if (cropAspect !== 'free') {
        let aspectMultiplier = 1;
        if (cropAspect === '1:1') aspectMultiplier = 1;
        else if (cropAspect === '4:3') aspectMultiplier = 4 / 3;
        else if (cropAspect === '16:9') aspectMultiplier = 16 / 9;
        else if (cropAspect === '16:10') aspectMultiplier = 16 / 10;
        
        // Scale vertical dimension based on calculated ratio
        const containerAspect = (imageWidth / imageHeight);
        nextRect.height = (nextRect.width * containerAspect) / aspectMultiplier;

        // Correct bounds check
        if (nextRect.y + nextRect.height > 100) {
          nextRect.height = 100 - nextRect.y;
          nextRect.width = (nextRect.height * aspectMultiplier) / containerAspect;
        }
      }
    }

    // Safety fallback bounds check
    nextRect.x = Math.max(0, Math.min(100, nextRect.x));
    nextRect.y = Math.max(0, Math.min(100, nextRect.y));
    nextRect.width = Math.max(5, Math.min(100 - nextRect.x, nextRect.width));
    nextRect.height = Math.max(5, Math.min(100 - nextRect.y, nextRect.height));

    setCropRect(nextRect);
  };

  const handleCropperMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleCropperMouseMove);
      window.addEventListener('mouseup', handleCropperMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleCropperMouseMove);
      window.removeEventListener('mouseup', handleCropperMouseUp);
    };
  }, [isDragging, dragHandle, cropRect, cropAspect]);

  // Adjust aspect ratios presets
  const handleSelectCropAspect = (aspect: string) => {
    setCropAspect(aspect);
    if (aspect === 'free') return;

    let aspectMultiplier = 1;
    if (aspect === '1:1') aspectMultiplier = 1;
    else if (aspect === '4:3') aspectMultiplier = 4 / 3;
    else if (aspect === '16:9') aspectMultiplier = 16 / 9;
    else if (aspect === '16:10') aspectMultiplier = 16 / 10;

    if (imgRef.current) {
      const containerWidthRatio = imgRef.current.clientWidth;
      const containerHeightRatio = imgRef.current.clientHeight;
      const screenImageAspect = containerWidthRatio / containerHeightRatio;

      let newWidth = 70;
      let newHeight = (newWidth * screenImageAspect) / aspectMultiplier;

      // Adjust overflow calculations
      if (newHeight > 70) {
        newHeight = 70;
        newWidth = (newHeight * aspectMultiplier) / screenImageAspect;
      }

      setCropRect({
        x: (100 - newWidth) / 2,
        y: (100 - newHeight) / 2,
        width: newWidth,
        height: newHeight
      });
    }
  };

  // HTML5 Canvas generation handler supporting edits and crop calculations at high resolution
  const renderEditedCanvas = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          
          // Image coordinates pre-rotation
          const originalBaseWidth = imgState.width || naturalWidth;
          const originalBaseHeight = imgState.height || naturalHeight;

          // Compute Cropped coordinates if enabled
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = originalBaseWidth;
          let sourceHeight = originalBaseHeight;

          if (isCropperEnabled) {
            sourceX = (cropRect.x / 100) * originalBaseWidth;
            sourceY = (cropRect.y / 100) * originalBaseHeight;
            sourceWidth = (cropRect.width / 100) * originalBaseWidth;
            sourceHeight = (cropRect.height / 100) * originalBaseHeight;
          }

          // Build canvas around selected bounds
          const isRotated90 = (imgState.rotate / 90) % 2 !== 0;
          canvas.width = isRotated90 ? sourceHeight : sourceWidth;
          canvas.height = isRotated90 ? sourceWidth : sourceHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Unable to instantiate canvas 2D context."));
            return;
          }

          // Render pristine filters values
          ctx.filter = `brightness(${imgState.brightness}%) contrast(${imgState.contrast}%) saturate(${imgState.saturation}%) sepia(${imgState.sepia}%) grayscale(${imgState.grayscale}%) blur(${imgState.blur}px) hue-rotate(${imgState.hueRotate}deg)`;

          // Scale and rotate centered pivot calculations
          ctx.translate(canvas.width / 2, canvas.height / 2);
          
          if (imgState.rotate) {
            ctx.rotate((imgState.rotate * Math.PI) / 180);
          }

          const scaleX = imgState.flipH ? -1 : 1;
          const scaleY = imgState.flipV ? -1 : 1;
          ctx.scale(scaleX, scaleY);

          // Render matching crop boundaries
          // Map center-pivot translation back down to source subset bounds
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            -sourceWidth / 2,
            -sourceHeight / 2,
            sourceWidth,
            sourceHeight
          );

          // Export results
          const exportMimetype = `image/${exportFormat}`;
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas export produced target empty blob."));
            }
          }, exportMimetype, exportQuality / 100);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => reject(new Error("Failed to load active base rendering layer."));
      img.src = originalUrl;
    });
  };

  // Immediate asset download trigger
  const handleImmediateDownload = async () => {
    if (!activeFile) return;
    setIsExporting(true);
    try {
      const blob = await renderEditedCanvas();
      const tempUrl = URL.createObjectURL(blob);
      const originalStem = activeFile.file.name.replace(/\.[^/.]+$/, "");
      const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
      const finalFileName = `${originalStem}_pixsy_studio.${ext}`;
      
      const link = document.createElement('a');
      link.href = tempUrl;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(tempUrl);
    } catch (err) {
      console.error("Studio Export failure: ", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Append back to converter queue action
  const handleExportToConverter = async () => {
    if (!activeFile) return;
    setIsQueueExporting(true);
    try {
      const blob = await renderEditedCanvas();
      const originalStem = activeFile.file.name.replace(/\.[^/.]+$/, "");
      const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
      
      const newFile = new File([blob], `${originalStem}_edited.${ext}`, {
        type: `image/${exportFormat}`
      });
      onAddFiles([newFile]);
    } catch (err) {
      console.error("Converter Queue Appending failure: ", err);
    } finally {
      setIsQueueExporting(false);
    }
  };

  // Reset active crop coordinates
  const handleApplyCropperState = () => {
    setIsCropperEnabled(!isCropperEnabled);
  };

  return (
    <div className="w-full flex flex-col gap-6 select-none font-sans max-w-7xl mx-auto py-2">
      
      {/* Studio Header Row: Tab Switchers and Quick Tool Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-150/40 pb-5">
        <div className="flex flex-col gap-1 text-left">
          <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#7653F8]" />
            pixsy Creative Studio
          </h1>
          <p className="text-xs text-gray-400 font-sans font-medium">
            Dynamic pixel coordinate layers & filters workspace. Completely private offline processing.
          </p>
        </div>

        {/* Global Toolbar tools navigation tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-2xl border border-gray-150/60 max-w-max">
          <button
            onClick={() => setActiveTab('adjust')}
            type="button"
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl cursor-pointer transition-all focus:outline-none ${
              activeTab === 'adjust' 
                ? 'bg-white text-[#7653F8] shadow-xs font-bold' 
                : 'text-gray-505 text-gray-520 hover:text-black hover:bg-neutral-50/50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Adjust Filters
          </button>
          <button
            onClick={() => {
              setActiveTab('crop');
              setIsCropperEnabled(true);
            }}
            type="button"
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl cursor-pointer transition-all focus:outline-none ${
              activeTab === 'crop' 
                ? 'bg-white text-[#7653F8] shadow-xs font-bold' 
                : 'text-gray-505 hover:text-black hover:bg-neutral-50/50'
            }`}
          >
            <CropIcon className="h-3.5 w-3.5 animate-pulse" />
            Interactive Crop
          </button>
          <button
            onClick={() => setActiveTab('filter')}
            type="button"
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl cursor-pointer transition-all focus:outline-none ${
              activeTab === 'filter' 
                ? 'bg-white text-[#7653F8] shadow-xs font-bold' 
                : 'text-gray-505 hover:text-black hover:bg-neutral-50/50'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Retro Presets
          </button>
        </div>
      </div>

      {/* THREE-COLUMN WORKSPACE DESK */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= COLUMN 1: LEFT SIDEBAR ADJUSTMENT TOOLS (SPAN 3) ================= */}
        <div className="lg:col-span-3 lg:h-[620px] lg:overflow-y-auto pr-1 flex flex-col gap-5 bg-white border border-gray-100 p-5 rounded-3xl shadow-sm">
          
          <AnimatePresence mode="wait">
            {activeTab === 'adjust' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4 text-left"
              >
                <div className="border-b border-gray-100 pb-2 mb-3">
                  <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-wider">Adjustment Properties</h3>
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                    <span>Brightness</span>
                    <span className="text-[#7653F8] font-mono">{imgState.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={imgState.brightness}
                    onChange={(e) => updateSetting('brightness', parseInt(e.target.value))}
                    className="w-full accent-[#7653F8] cursor-pointer h-1.5 bg-neutral-100 rounded-lg appearance-none"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                    <span>Contrast</span>
                    <span className="text-[#7653F8] font-mono">{imgState.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={imgState.contrast}
                    onChange={(e) => updateSetting('contrast', parseInt(e.target.value))}
                    className="w-full accent-[#7653F8] cursor-pointer h-1.5 bg-neutral-100 rounded-lg appearance-none"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                    <span>Saturation</span>
                    <span className="text-[#7653F8] font-mono">{imgState.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={imgState.saturation}
                    onChange={(e) => updateSetting('saturation', parseInt(e.target.value))}
                    className="w-full accent-[#7653F8] cursor-pointer h-1.5 bg-neutral-100 rounded-lg appearance-none"
                  />
                </div>

                {/* Gaussian Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                    <span>Gaussian Blur</span>
                    <span className="text-[#7653F8] font-mono">{imgState.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={imgState.blur}
                    onChange={(e) => updateSetting('blur', parseInt(e.target.value))}
                    className="w-full accent-[#7653F8] cursor-pointer h-1.5 bg-neutral-100 rounded-lg appearance-none"
                  />
                </div>

                {/* Sepia */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                    <span>Sepia Channel</span>
                    <span className="text-[#7653F8] font-mono">{imgState.sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={imgState.sepia}
                    onChange={(e) => updateSetting('sepia', parseInt(e.target.value))}
                    className="w-full accent-[#7653F8] cursor-pointer h-1.5 bg-neutral-100 rounded-lg appearance-none"
                  />
                </div>

                {/* Hue Rotation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                    <span>Hue Rotation</span>
                    <span className="text-[#7653F8] font-mono">{imgState.hueRotate}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={imgState.hueRotate}
                    onChange={(e) => updateSetting('hueRotate', parseInt(e.target.value))}
                    className="w-full accent-[#7653F8] cursor-pointer h-1.5 bg-neutral-100 rounded-lg appearance-none"
                  />
                </div>

                {/* Quick Transform Controls */}
                <div className="pt-3 border-t border-gray-100 mt-5">
                  <span className="block text-[11px] font-semibold text-neutral-600 mb-2.5">Transform Matrices</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => updateSetting('rotate', (imgState.rotate - 90 + 360) % 360)}
                      className="p-2 border border-gray-150 text-gray-600 hover:border-[#7653F8] hover:bg-neutral-50 rounded-xl flex items-center justify-center cursor-pointer focus:outline-none transition-all"
                      title="Rotate counter-clockwise 90-degrees"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => updateSetting('rotate', (imgState.rotate + 90) % 360)}
                      className="p-2 border border-gray-150 text-gray-600 hover:border-[#7653F8] hover:bg-neutral-50 rounded-xl flex items-center justify-center cursor-pointer focus:outline-none transition-all"
                      title="Rotate clockwise 90-degrees"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => updateSetting('flipH', !imgState.flipH)}
                      className={`p-2 border rounded-xl flex items-center justify-center cursor-pointer focus:outline-none transition-all ${
                        imgState.flipH ? 'border-[#7653F8] bg-[#7653F8]/5 text-[#7653F8]' : 'border-gray-150 hover:bg-neutral-50 text-gray-600'
                      }`}
                      title="Mirror crop horizontally"
                    >
                      <FlipHorizontal className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => updateSetting('flipV', !imgState.flipV)}
                      className={`p-2 border rounded-xl flex items-center justify-center cursor-pointer focus:outline-none transition-all ${
                        imgState.flipV ? 'border-[#7653F8] bg-[#7653F8]/5 text-[#7653F8]' : 'border-gray-150 hover:bg-neutral-50 text-gray-600'
                      }`}
                      title="Mirror crop vertically"
                    >
                      <FlipVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'crop' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4 text-left"
              >
                <div className="border-b border-gray-100 pb-2 mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-wider">Crop Presets</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCropperEnabled}
                      onChange={handleApplyCropperState}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#7653F8]" />
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="block text-[11px] font-semibold text-neutral-600">Preset Proportions</span>
                  {[
                    { label: 'Free Formulation', value: 'free' },
                    { label: 'Standard Square (1:1)', value: '1:1' },
                    { label: 'Social Banner (16:9)', value: '16:9' },
                    { label: 'Presentation Model (4:3)', value: '4:3' },
                    { label: 'Standard Document (16:10)', value: '16:10' },
                  ].map((item) => (
                    <button
                      id={`preset-aspect-btn-${item.value}`}
                      key={item.value}
                      onClick={() => handleSelectCropAspect(item.value)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold cursor-pointer border flex items-center justify-between transition-all outline-none ${
                        cropAspect === item.value 
                          ? 'border-[#7653F8] bg-[#7653F8]/5 text-[#7653F8] font-bold' 
                          : 'border-neutral-100 hover:border-gray-200 text-neutral-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      {cropAspect === item.value && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-105 mt-6 space-y-2">
                  <span className="block text-[11px] font-semibold text-neutral-600">Coordinate Offsets (%)</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 text-neutral-500 font-mono">
                    <div>X-Offset: {Math.round(cropRect.x)}%</div>
                    <div>Y-Offset: {Math.round(cropRect.y)}%</div>
                    <div>Width: {Math.round(cropRect.width)}%</div>
                    <div>Height: {Math.round(cropRect.height)}%</div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'filter' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3 text-left"
              >
                <div className="border-b border-gray-100 pb-2 mb-3">
                  <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-wider">Aesthetic Matrix Filters</h3>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {PRESETS.map((p) => {
                    const isActivePreset = activePreset === p.name;
                    return (
                      <button
                        id={`retro-preset-${p.name.replace(/\s+/g, '-').toLowerCase()}`}
                        key={p.name}
                        onClick={() => selectPreset(p.name, p.state)}
                        className={`w-full p-2.5 text-left rounded-xl transition-all cursor-pointer border flex items-center justify-between select-none focus:outline-none ${
                          isActivePreset 
                            ? 'border-[#7653F8] bg-[#7653F8]/5 text-[#7653F8] font-bold shadow-xs' 
                            : 'border-neutral-100 hover:border-gray-200 bg-neutral-50 hover:bg-[#7653F8]/5 text-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Mini gradient sphere placeholder resembling preset color dynamics */}
                          <div 
                            className={`w-7 h-7 rounded-lg border border-white shrink-0 overflow-hidden relative shadow-xs`}
                            style={{
                              backgroundImage: `url(${originalUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              filter: `brightness(${p.state.brightness}%) contrast(${p.state.contrast}%) saturate(${p.state.saturation}%) sepia(${p.state.sepia}%) grayscale(${p.state.grayscale}%) blur(${p.state.blur}px)`
                            }}
                          />
                          <span className="text-xs font-semibold">{p.name}</span>
                        </div>
                        {isActivePreset && <Check className="h-4 w-4 text-[#7653F8]" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ================= COLUMN 2: CENTER VIEWFLOW PORT DESK (SPAN 6) ================= */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          <div 
            ref={viewportRef}
            id="viewport-desk-checkerboard"
            className="w-full h-[470px] bg-[#EEEDED] relative rounded-3xl border border-gray-200 shadow-inner flex items-center justify-center overflow-hidden"
          >
            {/* Checkerboard Backdrop element */}
            <div 
              className="absolute inset-0 select-none opacity-40 pointer-events-none" 
              style={{ 
                backgroundImage: 'radial-gradient(#CECECE 18%, transparent 18%), radial-gradient(#CECECE 18%, transparent 18%)', 
                backgroundPosition: '0 0, 7px 7px', 
                backgroundSize: '14px 14px' 
              }} 
            />

            {originalUrl ? (
              <div 
                className="relative select-none transition-transform duration-300 flex items-center justify-center p-6 w-full h-full max-w-full max-h-full"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                {/* Active editing image wrapper element */}
                <div className="relative border border-white/80 shadow-2xl rounded-xl inline-block overflow-hidden max-w-full max-h-[380px]">
                  <img
                    ref={imgRef}
                    id="canvas-base-img"
                    src={originalUrl}
                    alt="Active Workspace Image Canvas"
                    className="object-contain max-h-[360px] h-auto w-auto pointer-events-none"
                    style={{
                      filter: getFilterCSS(),
                      ...getTransformCSS()
                    }}
                  />

                  {/* Contrast live split overlay hold view */}
                  {isHoldingCompare && (
                    <div className="absolute inset-0 pointer-events-none select-none z-10 transition-shadow">
                      <div className="absolute top-0 bottom-0 left-0 hover:shadow-2xl border-r-2 border-[#7653F8] shadow-white overflow-hidden w-1/2">
                        <img
                          src={originalUrl}
                          className="max-h-[360px] h-auto w-auto max-w-none object-contain select-none"
                          style={{
                            width: imgRef.current?.clientWidth,
                            height: imgRef.current?.clientHeight,
                            ...getTransformCSS()
                          }}
                          alt="Contrast original anchor comparison viewport"
                        />
                      </div>
                    </div>
                  )}

                  {/* CUSTOM DRAGGABLE HTML CROPPER BOX OVERLAY LAYER */}
                  {isCropperEnabled && !isHoldingCompare && (
                    <div 
                      id="interactive-cropper-boundary-box"
                      className="absolute border border-dashed border-white cursor-move z-20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-shadow duration-300"
                      style={{
                        left: `${cropRect.x}%`,
                        top: `${cropRect.y}%`,
                        width: `${cropRect.width}%`,
                        height: `${cropRect.height}%`,
                      }}
                      onMouseDown={(e) => handleCropperMouseDown(e, 'move')}
                    >
                      {/* Thirds Grid Helper guidelines inside cropper frame */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35 pointer-events-none">
                        <div className="border-r border-b border-neutral-100" />
                        <div className="border-r border-b border-neutral-100" />
                        <div className="border-b border-neutral-100" />
                        <div className="border-r border-b border-neutral-100" />
                        <div className="border-r border-b border-neutral-100" />
                        <div className="border-b border-neutral-100" />
                        <div className="border-r border-neutral-100" />
                        <div className="border-r border-neutral-100" />
                        <div />
                      </div>

                      {/* Resize Edge handle bars and Anchor control circles */}
                      {/* NW */}
                      <div 
                        onMouseDown={(e) => handleCropperMouseDown(e, 'nw')}
                        className="absolute w-3 h-3 bg-white border-2 border-[#7653F8] rounded-full -top-1.5 -left-1.5 cursor-nwse-resize hover:scale-125 transition-transform z-30" 
                      />
                      {/* NE */}
                      <div 
                        onMouseDown={(e) => handleCropperMouseDown(e, 'ne')}
                        className="absolute w-3 h-3 bg-white border-2 border-[#7653F8] rounded-full -top-1.5 -right-1.5 cursor-nesw-resize hover:scale-125 transition-transform z-30" 
                      />
                      {/* SE */}
                      <div 
                        onMouseDown={(e) => handleCropperMouseDown(e, 'se')}
                        className="absolute w-3 h-3 bg-white border-2 border-[#7653F8] rounded-full -bottom-1.5 -right-1.5 cursor-nwse-resize hover:scale-125 transition-transform z-30" 
                      />
                      {/* SW */}
                      <div 
                        onMouseDown={(e) => handleCropperMouseDown(e, 'sw')}
                        className="absolute w-3 h-3 bg-white border-2 border-[#7653F8] rounded-full -bottom-1.5 -left-1.5 cursor-nesw-resize hover:scale-125 transition-transform z-30" 
                      />
                      
                      {/* Side borders handle zones */}
                      <div onMouseDown={(e) => handleCropperMouseDown(e, 'n')} className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize" />
                      <div onMouseDown={(e) => handleCropperMouseDown(e, 's')} className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize" />
                      <div onMouseDown={(e) => handleCropperMouseDown(e, 'e')} className="absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize" />
                      <div onMouseDown={(e) => handleCropperMouseDown(e, 'w')} className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize" />
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-250/50 hover:border-[#7653F8]/60 bg-white/70 hover:bg-neutral-50/20 p-8 rounded-3xl max-w-sm text-center transition-all duration-300"
              >
                <div className="w-14 h-14 bg-[#7653F8]/5 border border-[#7653F8]/10 rounded-2xl flex items-center justify-center text-[#7653F8] mb-4 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-800 tracking-tight">Load an Image into Editor</h3>
                <p className="text-[12px] text-gray-400 leading-normal mt-1 max-w-xs mx-auto">
                  Select a file from the list or drag one here to instantly open the crop & adjustment layers studio.
                </p>
                <button 
                  type="button"
                  className="mt-4 text-xs font-bold px-4 py-2 bg-[#7653F8] text-white rounded-full hover:bg-[#6039ea] transition-all duration-200 outline-none cursor-pointer"
                >
                  Browse Image
                </button>
              </div>
            )}
          </div>

          {/* Viewport Control Strip bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-xs text-xs font-semibold text-neutral-600 select-none">
            
            {/* Target dimensions */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] bg-neutral-100 text-neutral-550 border border-neutral-200/50 px-2 py-1 rounded-lg font-mono">
                {naturalWidth} × {naturalHeight}px
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">Source Size</span>
            </div>

            {/* Quick compare toggle triggers state */}
            <div className="flex items-center gap-1.5">
              <button
                onMouseDown={() => setIsHoldingCompare(true)}
                onMouseUp={() => setIsHoldingCompare(false)}
                onTouchStart={() => setIsHoldingCompare(true)}
                onTouchEnd={() => setIsHoldingCompare(false)}
                className="flex items-center gap-1 hover:text-[#7653F8] hover:bg-neutral-50 transition-all border border-neutral-100 rounded-lg py-1.5 px-2.5 cursor-pointer outline-none shrink-0"
              >
                <Maximize className="h-3.5 w-3.5" />
                Hold to Compare Original
              </button>
            </div>

            {/* Digital Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
                className="p-1 text-neutral-450 hover:text-black hover:bg-neutral-50 rounded-md transition-all cursor-pointer focus:outline-none"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="font-mono min-w-[40px] text-center text-[11px] text-neutral-600">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                className="p-1 text-neutral-450 hover:text-black hover:bg-neutral-50 rounded-md transition-all cursor-pointer focus:outline-none"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileSelect} 
          />

          {/* Quick switcher list bottom row */}
          <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm select-none">
            <p className="text-[11px] uppercase tracking-wider font-bold text-[#7653F8] mb-3 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Workspace Queue Switcher
            </p>
            {files.length === 0 ? (
              <div className="text-center py-4 text-xs text-neutral-400">
                No files in current converter queue. Drag/upload below to append.
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 max-w-full">
                {files.map((item) => (
                  <button
                    id={`image-switcher-item-${item.id}`}
                    key={item.id}
                    onClick={() => setActiveFile(item)}
                    type="button"
                    className={`relative flex items-center gap-2 p-2 rounded-xl text-left border focus:outline-none shrink-0 transition-all ${
                      activeFile?.id === item.id 
                        ? 'border-[#7653F8] bg-[#7653F8]/5 outline-1 outline-[#7653F8]' 
                        : 'border-neutral-100 hover:border-gray-200 hover:bg-neutral-50/50'
                    }`}
                  >
                    <img src={item.previewUrl || ''} className="h-8 w-8 object-cover rounded bg-neutral-100 shrink-0" alt="Queue element thumbnail" />
                    <div className="text-[10px] pr-2 max-w-[110px] leading-tight">
                      <p className="font-semibold text-neutral-800 truncate">{item.name}</p>
                      <p className="text-neutral-400 font-mono mt-0.5">{formatBytes(item.size)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ================= COLUMN 3: RIGHT PANEL EXPORT CONFIGURATIONS (SPAN 3) ================= */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          
          {/* Metadata Infobar card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3.5 text-left select-none">
            <h4 className="text-xs font-bold text-neutral-800 tracking-wider uppercase flex items-center gap-1.5 border-b border-gray-50 pb-2 mb-1.5">
              <Info className="h-3.5 w-3.5 text-[#7653F8]" />
              Image Details
            </h4>
            
            {activeFile ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between font-sans">
                  <span className="text-gray-400 font-semibold">Name</span>
                  <span className="text-neutral-800 font-bold truncate max-w-[150px]" title={activeFile.file.name}>{activeFile.file.name}</span>
                </div>
                <div className="flex justify-between font-sans">
                  <span className="text-gray-400 font-semibold">Original Size</span>
                  <span className="text-neutral-800 font-bold font-mono">{formatBytes(activeFile.size)}</span>
                </div>
                <div className="flex justify-between font-sans">
                  <span className="text-gray-400 font-semibold">Source Format</span>
                  <span className="text-neutral-800 font-bold uppercase">{activeFile.originalFormat}</span>
                </div>
                {activeFile.analysis && (
                  <div className="mt-3.5 rounded-2xl bg-[#7653F8]/5 border border-[#7653F8]/10 p-2.5 text-[10px] text-neutral-600 leading-normal">
                    <Sparkles className="h-3 w-3 text-[#7653F8] inline mr-1 animate-pulse" />
                    <span className="font-bold text-[#7653F8] uppercase">{activeFile.analysis.recommendation} Suggestion:</span> {activeFile.analysis.reason}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-neutral-400 font-medium font-sans">
                No active image selected.
              </div>
            )}
          </div>

          {/* Custom Dimension input parameters card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3.5 text-left select-none">
            <h4 className="text-xs font-bold text-neutral-800 tracking-wider uppercase flex items-center gap-1.5 border-b border-gray-50 pb-2">
              <Grid className="h-3.5 w-3.5 text-[#7653F8]" />
              Resizing Dimensions
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Width (px)</label>
                <input
                  id="dimension-width"
                  type="number"
                  disabled={!activeFile}
                  value={imgState.width || ''}
                  onChange={(e) => updateSetting('width', Math.max(10, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-150 rounded-xl text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#7653F8] font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-1">Height (px)</label>
                <input
                  id="dimension-height"
                  type="number"
                  disabled={!activeFile}
                  value={imgState.height || ''}
                  onChange={(e) => updateSetting('height', Math.max(10, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-150 rounded-xl text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#7653F8] font-mono"
                />
              </div>
            </div>

            <label className="flex items-start gap-1.5 cursor-pointer mt-1">
              <input
                id="checkbox-aspect-lock"
                type="checkbox"
                disabled={!activeFile}
                checked={imgState.aspectRatioLock}
                onChange={(e) => updateSetting('aspectRatioLock', e.target.checked)}
                className="rounded text-[#7653F8] focus:ring-[#7653F8]/20 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#7653F8] mt-0.5"
              />
              <span className="text-[10px] font-semibold text-neutral-500 leading-tight block">
                Lock Aspect Dimension Ratio
              </span>
            </label>
          </div>

          {/* Core Export Panel Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 text-left select-none">
            <h4 className="text-xs font-bold text-neutral-800 tracking-wider uppercase flex items-center gap-1.5 border-b border-gray-50 pb-2">
              <Download className="h-3.5 w-3.5 text-[#7653F8]" />
              Compile & Export
            </h4>

            {/* Target Mimetype Switcher Row */}
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold text-neutral-400 uppercase">Target Format</span>
              <div className="flex gap-1.5 p-1 bg-neutral-50 rounded-xl border border-neutral-150 text-xs font-semibold text-neutral-600">
                {['png', 'jpeg', 'webp'].map((fmt) => (
                  <button
                    id={`export-format-btn-${fmt}`}
                    key={fmt}
                    onClick={() => setExportFormat(fmt as any)}
                    type="button"
                    className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-all focus:outline-none text-[11px] ${
                      exportFormat === fmt 
                        ? 'bg-white text-[#7653F8] shadow-xs font-bold' 
                        : 'hover:text-black hover:bg-neutral-150/40 text-[#868686]'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality compression slider (active for webp and jpeg outputs only) */}
            {exportFormat !== 'png' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                  <span>Export Quality</span>
                  <span className="text-[#7653F8] font-mono font-bold">{exportQuality}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={exportQuality}
                  onChange={(e) => setExportQuality(parseInt(e.target.value))}
                  className="w-full accent-[#7653F8] cursor-pointer h-1 bg-neutral-100 rounded appearance-none"
                />
              </div>
            )}

            {/* Primary Download & Export Action Stack */}
            <div className="space-y-2 pt-2">
              <button
                id="btn-immediate-download-edited"
                disabled={!activeFile || isExporting}
                onClick={handleImmediateDownload}
                className="w-full py-2.5 px-4 bg-[#7653F8] hover:bg-[#6039ea] disabled:bg-neutral-100 disabled:text-neutral-400 text-white text-xs font-bold rounded-2xl shadow-md shadow-[#7653F8]/15 hover:shadow-[#7653F8]/25 transition-all text-center flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
              >
                {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                {isExporting ? 'Exporting...' : 'Download Image'}
              </button>
              
              <button
                id="btn-queue-export-edited"
                disabled={!activeFile || isQueueExporting}
                onClick={handleExportToConverter}
                className="w-full py-2.5 px-4 bg-neutral-50 hover:bg-neutral-100 disabled:bg-neutral-50 disabled:text-neutral-300 text-neutral-700 text-xs font-bold border border-neutral-150 rounded-2xl transition-all text-center flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
              >
                {isQueueExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-[#7653F8]" />}
                Export back to Queue
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
