/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { 
  Camera, 
  Download, 
  Upload, 
  RefreshCw,
  Info,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Format = 'mini' | 'square' | 'wide';

interface FormatConfig {
  id: Format;
  name: string;
  label: string;
  aspect: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
}

const FORMATS: Record<Format, FormatConfig> = {
  mini: {
    id: 'mini',
    name: 'MINI',
    label: '46 x 62 mm',
    aspect: 46 / 62,
    width: 460,
    height: 620,
    frameWidth: 540,
    frameHeight: 860,
  },
  square: {
    id: 'square',
    name: 'SQUARE',
    label: '62 x 62 mm',
    aspect: 1 / 1,
    width: 620,
    height: 620,
    frameWidth: 720,
    frameHeight: 860,
  },
  wide: {
    id: 'wide',
    name: 'WIDE',
    label: '99 x 62 mm',
    aspect: 99 / 62,
    width: 990,
    height: 620,
    frameWidth: 1100,
    frameHeight: 860,
  },
};

export default function App() {
  const [format, setFormat] = useState<Format>('mini');
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  // Film Settings
  const [exposure, setExposure] = useState(0); // -100 to 100
  const [tone, setTone] = useState(50); // 0 (Warm) to 100 (Classic Blue)
  const [grain, setGrain] = useState(10); // 0 to 100
  const [fade, setFade] = useState(0); // 0 to 100
  const [vignette, setVignette] = useState(20); // 0 to 100
  const [lightLeak, setLightLeak] = useState(false);
  const [lightLeakType, setLightLeakType] = useState(1); // 1 to 8
  
  // Date Settings
  const [showDate, setShowDate] = useState(false);
  const [dateText, setDateText] = useState(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, ' . '));
  const [dateFont, setDateFont] = useState<'stamp' | 'hand' | 'mono'>('stamp');
  const [dateSize, setDateSize] = useState(24);
  const [dateX, setDateX] = useState(0); // Offset from center
  const [dateY, setDateY] = useState(0); // Offset from bottom margin center
  const [dateOpacity, setDateOpacity] = useState(70);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedArea);
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Effect to handle format change when image exists
  useEffect(() => {
    if (image) {
      setIsCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [format]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result as string);
        setIsCropping(true); // Open cropper immediately after upload
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const downloadInstax = async () => {
    if (!image || !croppedAreaPixels) return;
    setIsGenerating(true);

    try {
      const config = FORMATS[format];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = config.frameWidth;
      canvas.height = config.frameHeight;

      // 1. Draw Frame (White with texture)
      ctx.fillStyle = '#FDFDFD';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Subtle Paper Texture
      ctx.save();
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
      }
      ctx.restore();

      // Subtle Plastic Gloss
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.3, 0,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.02)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Image
      const img = new Image();
      img.src = image;
      await new Promise((resolve) => (img.onload = resolve));

      let sideMargin, topMargin;
      if (format === 'mini') {
        sideMargin = (540 - 460) / 2;
        topMargin = sideMargin;
      } else if (format === 'square') {
        sideMargin = (720 - 620) / 2;
        topMargin = sideMargin;
      } else {
        sideMargin = (1100 - 990) / 2;
        topMargin = sideMargin;
      }
      
      const imgWidth = config.frameWidth - sideMargin * 2;
      const imgHeight = imgWidth / config.aspect;
      const imgX = sideMargin;
      const imgY = topMargin;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#000';
      ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
      ctx.shadowColor = 'transparent';

      ctx.beginPath();
      ctx.rect(imgX, imgY, imgWidth, imgHeight);
      ctx.clip();
      
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        imgX,
        imgY,
        imgWidth,
        imgHeight
      );

      // 3. Apply Film Filters
      if (exposure !== 0) {
        ctx.globalCompositeOperation = exposure > 0 ? 'screen' : 'multiply';
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(exposure) / 200})`;
        if (exposure < 0) ctx.fillStyle = `rgba(0, 0, 0, ${Math.abs(exposure) / 200})`;
        ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
      }

      ctx.globalCompositeOperation = 'soft-light';
      if (tone > 50) {
        const blueIntensity = (tone - 50) / 50;
        ctx.fillStyle = `rgba(0, 50, 255, ${blueIntensity * 0.15})`;
      } else {
        const warmIntensity = (50 - tone) / 50;
        ctx.fillStyle = `rgba(255, 150, 0, ${warmIntensity * 0.15})`;
      }
      ctx.fillRect(imgX, imgY, imgWidth, imgHeight);

      if (grain > 0) {
        ctx.globalCompositeOperation = 'overlay';
        for (let i = 0; i < grain * 500; i++) {
          const x = imgX + Math.random() * imgWidth;
          const y = imgY + Math.random() * imgHeight;
          const size = Math.random() * 1.5;
          const opacity = Math.random() * 0.1;
          ctx.fillStyle = `rgba(128, 128, 128, ${opacity})`;
          ctx.fillRect(x, y, size, size);
        }
      }

      // 3.5 Apply Optical Effects (Vignette & Light Leak)
      ctx.save();
      ctx.beginPath();
      ctx.rect(imgX, imgY, imgWidth, imgHeight);
      ctx.clip();

      if (vignette > 0) {
        const gradient = ctx.createRadialGradient(
          imgX + imgWidth / 2, imgY + imgHeight / 2, 0,
          imgX + imgWidth / 2, imgY + imgHeight / 2, Math.sqrt(imgWidth**2 + imgHeight**2) / 2
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, `rgba(0,0,0,${vignette / 400})`);
        gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
      }

      if (fade > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(128, 128, 128, ${fade / 400})`;
        ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - fade / 1000})`;
        ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
      }

      if (lightLeak) {
        ctx.globalCompositeOperation = 'screen';
        let leakGrad;
        
        switch(lightLeakType) {
          case 1: // Left Edge
            leakGrad = ctx.createLinearGradient(imgX, imgY, imgX + imgWidth * 0.4, imgY);
            leakGrad.addColorStop(0, 'rgba(255, 100, 0, 0.4)');
            leakGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
            break;
          case 2: // Right Edge
            leakGrad = ctx.createLinearGradient(imgX + imgWidth, imgY, imgX + imgWidth * 0.6, imgY);
            leakGrad.addColorStop(0, 'rgba(255, 50, 0, 0.4)');
            leakGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            break;
          case 3: // Top Edge
            leakGrad = ctx.createLinearGradient(imgX, imgY, imgX, imgY + imgHeight * 0.4);
            leakGrad.addColorStop(0, 'rgba(255, 150, 0, 0.3)');
            leakGrad.addColorStop(1, 'rgba(255, 150, 0, 0)');
            break;
          case 4: // Bottom Edge
            leakGrad = ctx.createLinearGradient(imgX, imgY + imgHeight, imgX, imgY + imgHeight * 0.6);
            leakGrad.addColorStop(0, 'rgba(255, 80, 0, 0.4)');
            leakGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
            break;
          case 5: // Top-Left Corner
            leakGrad = ctx.createRadialGradient(imgX, imgY, 0, imgX, imgY, imgWidth * 0.6);
            leakGrad.addColorStop(0, 'rgba(255, 50, 0, 0.5)');
            leakGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            break;
          case 6: // Top-Right Corner
            leakGrad = ctx.createRadialGradient(imgX + imgWidth, imgY, 0, imgX + imgWidth, imgY, imgWidth * 0.6);
            leakGrad.addColorStop(0, 'rgba(255, 100, 0, 0.5)');
            leakGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
            break;
          case 7: // Bottom-Left Corner
            leakGrad = ctx.createRadialGradient(imgX, imgY + imgHeight, 0, imgX, imgY + imgHeight, imgWidth * 0.6);
            leakGrad.addColorStop(0, 'rgba(255, 120, 0, 0.4)');
            leakGrad.addColorStop(1, 'rgba(255, 120, 0, 0)');
            break;
          case 8: // Bottom-Right Corner
            leakGrad = ctx.createRadialGradient(imgX + imgWidth, imgY + imgHeight, 0, imgX + imgWidth, imgY + imgHeight, imgWidth * 0.6);
            leakGrad.addColorStop(0, 'rgba(255, 40, 0, 0.5)');
            leakGrad.addColorStop(1, 'rgba(255, 40, 0, 0)');
            break;
          default:
            leakGrad = ctx.createLinearGradient(imgX, imgY, imgX + imgWidth * 0.4, imgY);
            leakGrad.addColorStop(0, 'rgba(255, 100, 0, 0.4)');
            leakGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
        }
        
        ctx.fillStyle = leakGrad;
        ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
      }

      ctx.restore();
      ctx.restore();

      // 4. Draw Date
      if (showDate && dateText) {
        ctx.save();
        const fonts = {
          stamp: 'Special Elite',
          hand: 'Caveat',
          mono: 'JetBrains Mono'
        };
        ctx.font = `${dateSize}px "${fonts[dateFont]}"`;
        ctx.fillStyle = `rgba(0, 0, 0, ${dateOpacity / 100})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const bottomMarginCenterY = (imgY + imgHeight + canvas.height) / 2;
        const finalX = canvas.width / 2 + dateX;
        const finalY = bottomMarginCenterY + dateY;
        
        ctx.fillText(dateText, finalX, finalY);
        ctx.restore();
      }

      // Final border
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = `instaxer-${format}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFFFFF', '#F27D26', '#141414']
      });

    } catch (err) {
      console.error('Generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper for CSS Preview
  const getPreviewStyles = () => {
    const config = FORMATS[format];
    
    return {
      frame: {
        aspectRatio: `${config.frameWidth} / ${config.frameHeight}`,
        width: 'auto',
        height: '100%',
      },
      imageArea: {
        top: `${(config.frameWidth - config.width) / 2 / config.frameHeight * 100}%`,
        left: `${(config.frameWidth - config.width) / 2 / config.frameWidth * 100}%`,
        width: `${config.width / config.frameWidth * 100}%`,
        height: `${config.height / config.frameHeight * 100}%`,
      }
    };
  };

  return (
    <div className="h-screen bg-[#E4E3E0] text-[#141414] font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-[#141414] p-4 flex justify-between items-center bg-white/50 backdrop-blur-sm z-50 shrink-0">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <h1 className="font-mono font-bold tracking-tighter text-xl uppercase">Instaxer</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={downloadInstax}
            disabled={!image || isGenerating}
            className="bg-[#141414] text-[#E4E3E0] px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:bg-[#F27D26] disabled:opacity-30 transition-colors flex items-center gap-2"
          >
            {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            保存 / Save
          </button>
          <div className="font-mono text-xs opacity-50">[ v1.1 ]</div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Live Preview Area */}
        <div className="flex-1 bg-[#D1D0CB] flex items-center justify-center p-8 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={format}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full w-full flex items-center justify-center p-8 sm:p-12"
            >
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#FDFDFD] shadow-[0_30px_60px_rgba(0,0,0,0.25)] border border-black/5 relative cursor-pointer group/frame transition-transform hover:scale-[1.01] active:scale-[0.99]"
                style={{ 
                  ...getPreviewStyles().frame,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              >
                {/* Paper Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-multiply z-40" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                
                {/* Image Area */}
                <div 
                  className="absolute bg-[#111] overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
                  style={getPreviewStyles().imageArea}
                >
                  {!image ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[#E4E3E0]/20 font-mono text-[10px] uppercase tracking-widest group-hover/frame:text-[#E4E3E0]/40 transition-colors">
                      <Upload className="w-10 h-10 mb-3" />
                      点击上传图片
                    </div>
                  ) : (
                    <>
                      {/* The actual cropped image preview */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-full h-full overflow-hidden">
                           {croppedArea ? (
                             <img 
                               src={image} 
                               className="absolute pointer-events-none max-w-none"
                               style={{
                                 width: `${100 / croppedArea.width * 100}%`,
                                 height: `${100 / croppedArea.height * 100}%`,
                                 left: `${-croppedArea.x * (100 / croppedArea.width)}%`,
                                 top: `${-croppedArea.y * (100 / croppedArea.height)}%`,
                                 filter: `brightness(${1 + exposure / 200})`,
                               }}
                             />
                           ) : (
                             <img 
                               src={image} 
                               className="absolute top-1/2 left-1/2 w-full h-full object-cover pointer-events-none"
                               style={{
                                 transform: `translate(-50%, -50%) translate(${crop.x}%, ${crop.y}%) scale(${zoom})`,
                                 filter: `brightness(${1 + exposure / 200})`,
                               }}
                             />
                           )}
                        </div>
                      </div>

                      {/* Hover Overlay for Upload */}
                      <div className="absolute inset-0 bg-[#141414]/40 opacity-0 group-hover/frame:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-30">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="font-mono text-[8px] uppercase tracking-widest font-bold">更换图片 / Change</span>
                      </div>

                      {/* Tone Overlay */}
                      <div className="absolute inset-0 z-10 pointer-events-none" style={{
                        backgroundColor: tone > 50 ? `rgba(0, 50, 255, ${(tone - 50) / 50 * 0.15})` : `rgba(255, 150, 0, ${(50 - tone) / 50 * 0.15})`,
                        mixBlendMode: 'soft-light',
                      }} />

                      {/* Grain Overlay */}
                      <div className="absolute inset-0 z-20 pointer-events-none" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        opacity: grain / 500,
                      }} />

                      {/* Fade Overlay */}
                      {fade > 0 && (
                        <div className="absolute inset-0 z-25 pointer-events-none" style={{
                          backgroundColor: `rgba(128, 128, 128, ${fade / 400})`,
                          mixBlendMode: 'screen',
                        }} />
                      )}

                      {/* Vignette Overlay */}
                      {vignette > 0 && (
                        <div className="absolute inset-0 z-25 pointer-events-none" style={{
                          background: `radial-gradient(circle, transparent 50%, rgba(0,0,0,${vignette / 100}))`,
                        }} />
                      )}

                      {/* Light Leak Overlay */}
                      {lightLeak && (
                        <div className="absolute inset-0 z-25 pointer-events-none" style={{
                          background: 
                            lightLeakType === 1 ? 'linear-gradient(to right, rgba(255, 100, 0, 0.3), transparent 40%)' :
                            lightLeakType === 2 ? 'linear-gradient(to left, rgba(255, 50, 0, 0.3), transparent 40%)' :
                            lightLeakType === 3 ? 'linear-gradient(to bottom, rgba(255, 150, 0, 0.2), transparent 40%)' :
                            lightLeakType === 4 ? 'linear-gradient(to top, rgba(255, 80, 0, 0.3), transparent 40%)' :
                            lightLeakType === 5 ? 'radial-gradient(circle at top left, rgba(255, 50, 0, 0.4), transparent 60%)' :
                            lightLeakType === 6 ? 'radial-gradient(circle at top right, rgba(255, 100, 0, 0.4), transparent 60%)' :
                            lightLeakType === 7 ? 'radial-gradient(circle at bottom left, rgba(255, 120, 0, 0.3), transparent 60%)' :
                            'radial-gradient(circle at bottom right, rgba(255, 40, 0, 0.4), transparent 60%)',
                          mixBlendMode: 'screen',
                        }} />
                      )}
                    </>
                  )}
                </div>

                {/* Date Display */}
                {showDate && dateText && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 flex items-center justify-center pointer-events-none whitespace-pre-wrap text-center"
                    style={{ 
                      height: `${(FORMATS[format].frameHeight - FORMATS[format].height - (FORMATS[format].frameWidth - FORMATS[format].width) / 2) / FORMATS[format].frameHeight * 100}%`,
                      transform: `translate(${dateX}px, ${dateY}px)`,
                      opacity: dateOpacity / 100,
                      fontSize: `${dateSize / 2}px`, // Scaled for preview
                      fontFamily: dateFont === 'stamp' ? 'Special Elite' : dateFont === 'hand' ? 'Caveat' : 'JetBrains Mono',
                      color: '#000',
                      padding: '0 10px'
                    }}
                  >
                    {dateText}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Controls Panel */}
        <div className="w-96 bg-[#E4E3E0] border-l border-[#141414] overflow-y-auto p-6 space-y-10 shrink-0">
          
          {/* Step 01: Format */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded">01</span>
              <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold">规格 / Format</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.values(FORMATS) as FormatConfig[]).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "py-3 border border-[#141414] flex flex-col items-center gap-2 transition-all",
                    format === f.id ? "bg-[#141414] text-[#E4E3E0]" : "bg-white/50 hover:bg-white"
                  )}
                >
                  <div className={cn(
                    "border transition-colors",
                    format === f.id ? "border-[#E4E3E0]" : "border-[#141414]",
                    f.id === 'mini' && "w-4 h-6",
                    f.id === 'square' && "w-5 h-5",
                    f.id === 'wide' && "w-7 h-5"
                  )} />
                  <span className="font-mono text-[8px] font-bold">{f.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Step 02: Upload & Crop */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded">02</span>
              <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold">图像 / Image</h2>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border border-dashed border-[#141414] font-mono text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-3 h-3" />
                {image ? '更换图片 / Change' : '上传图片 / Upload'}
              </button>
              {image && (
                <button 
                  onClick={() => setIsCropping(true)}
                  className="w-full py-2 border border-[#141414] font-mono text-[8px] uppercase tracking-widest hover:bg-white transition-all"
                >
                  重新裁剪 / Re-crop
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </section>

          {/* Step 03: Film Settings */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded">03</span>
              <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold">富士色彩实验室 / Film Lab</h2>
            </div>
            
            <div className="space-y-8">
              {/* Basic */}
              <div className="space-y-4">
                <h3 className="font-mono text-[8px] uppercase tracking-widest font-bold opacity-30 border-b border-[#141414]/5 pb-1">[ 基础 ]</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest opacity-50">
                      <span>曝光补偿 / Exposure</span>
                      <span>{(exposure / 100).toFixed(2)}</span>
                    </div>
                    <input type="range" min="-100" max="100" value={exposure} onChange={(e) => setExposure(Number(e.target.value))} className="w-full accent-[#141414] h-1 bg-[#141414]/10 rounded-full appearance-none cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest opacity-50">
                      <span>色彩温度 / Tone</span>
                      <span>{tone > 50 ? '偏冷' : tone < 50 ? '偏暖' : '中性'}</span>
                    </div>
                    <input type="range" min="0" max="100" value={tone} onChange={(e) => setTone(Number(e.target.value))} className="w-full accent-[#141414] h-1 bg-[#141414]/10 rounded-full appearance-none cursor-pointer" />
                  </div>
                </div>
              </div>

              {/* Texture */}
              <div className="space-y-4">
                <h3 className="font-mono text-[8px] uppercase tracking-widest font-bold opacity-30 border-b border-[#141414]/5 pb-1">[ 质感 ]</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest opacity-50">
                      <span>胶片颗粒 / Grain</span>
                      <span>Lvl. {Math.floor(grain / 20)}</span>
                    </div>
                    <input type="range" min="0" max="100" value={grain} onChange={(e) => setGrain(Number(e.target.value))} className="w-full accent-[#141414] h-1 bg-[#141414]/10 rounded-full appearance-none cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest opacity-50">
                      <span>褪色效果 / Fade</span>
                      <span>{fade}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={fade} onChange={(e) => setFade(Number(e.target.value))} className="w-full accent-[#141414] h-1 bg-[#141414]/10 rounded-full appearance-none cursor-pointer" />
                  </div>
                </div>
              </div>

              {/* Optical */}
              <div className="space-y-4">
                <h3 className="font-mono text-[8px] uppercase tracking-widest font-bold opacity-30 border-b border-[#141414]/5 pb-1">[ 光学 ]</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest opacity-50">
                      <span>镜头暗角 / Vignette</span>
                      <span>{vignette < 20 ? '轻微' : vignette < 60 ? '中度' : '重度'}</span>
                    </div>
                    <input type="range" min="0" max="100" value={vignette} onChange={(e) => setVignette(Number(e.target.value))} className="w-full accent-[#141414] h-1 bg-[#141414]/10 rounded-full appearance-none cursor-pointer" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[8px] uppercase tracking-widest opacity-50">随机漏光 / Light Leak</label>
                      {lightLeak && (
                        <button 
                          onClick={() => setLightLeakType(prev => (prev % 8) + 1)}
                          className="p-1 hover:bg-[#141414]/5 rounded transition-colors"
                          title="切换漏光样式"
                        >
                          <RefreshCw className="w-3 h-3 opacity-40" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {lightLeak && <span className="font-mono text-[7px] opacity-30 uppercase">Style {lightLeakType}</span>}
                      <button onClick={() => setLightLeak(!lightLeak)} className={cn("w-8 h-4 rounded-full relative transition-colors", lightLeak ? "bg-[#F27D26]" : "bg-[#141414]/20")}>
                        <motion.div animate={{ x: lightLeak ? 18 : 2 }} className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Step 04: Date Settings */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded">04</span>
              <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold">日期 / Date</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[8px] uppercase tracking-widest opacity-50">启用日期 / Enable</label>
                <button onClick={() => setShowDate(!showDate)} className={cn("w-8 h-4 rounded-full relative transition-colors", showDate ? "bg-[#F27D26]" : "bg-[#141414]/20")}>
                  <motion.div animate={{ x: showDate ? 18 : 2 }} className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              {showDate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                  <input type="text" value={dateText} onChange={(e) => setDateText(e.target.value)} className="w-full bg-white border border-[#141414] p-2 font-mono text-[10px] focus:outline-none" />
                  
                  <div className="grid grid-cols-3 gap-1">
                    {['stamp', 'hand', 'mono'].map((f) => (
                      <button key={f} onClick={() => setDateFont(f as any)} className={cn("py-1.5 border text-[8px] font-bold uppercase transition-all", dateFont === f ? "bg-[#141414] text-white border-[#141414]" : "border-[#141414]/20")}>
                        {f === 'stamp' ? '印章' : f === 'hand' ? '手写' : '经典'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[7px] opacity-50 uppercase"><span>大小 / Size</span><span>{dateSize}</span></div>
                      <input type="range" min="12" max="64" value={dateSize} onChange={(e) => setDateSize(Number(e.target.value))} className="w-full accent-[#141414] h-0.5 bg-[#141414]/10 appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[7px] opacity-50 uppercase"><span>水平 / Pos X</span><span>{dateX}</span></div>
                      <input type="range" min="-50" max="50" value={dateX} onChange={(e) => setDateX(Number(e.target.value))} className="w-full accent-[#141414] h-0.5 bg-[#141414]/10 appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[7px] opacity-50 uppercase"><span>垂直 / Pos Y</span><span>{dateY}</span></div>
                      <input type="range" min="-30" max="30" value={dateY} onChange={(e) => setDateY(Number(e.target.value))} className="w-full accent-[#141414] h-0.5 bg-[#141414]/10 appearance-none cursor-pointer" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          {/* Footer Info */}
          <div className="pt-10 border-t border-[#141414]/10 font-mono text-[7px] opacity-30 uppercase tracking-widest leading-relaxed">
            <p>INSTAXER . LOCAL PROCESSING</p>
            <p>PRIVACY SECURED . 2026</p>
          </div>
        </div>
      </div>

      {/* Cropper Modal */}
      <AnimatePresence>
        {isCropping && image && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#141414]/90 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#E4E3E0] p-4 sm:p-6 max-w-2xl w-full border border-[#141414] shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center border-b border-[#141414]/10 pb-3 mb-4">
                <h3 className="font-mono font-bold uppercase tracking-widest text-xs">构图裁剪 / CROP IMAGE</h3>
              </div>
              
              <div className="flex-1 min-h-[250px] relative bg-[#f0f0f0] border border-[#141414] mb-4">
                <Cropper 
                  key={format}
                  image={image} 
                  crop={crop} 
                  zoom={zoom} 
                  aspect={FORMATS[format].aspect} 
                  onCropChange={setCrop} 
                  onCropComplete={onCropComplete} 
                  onZoomChange={setZoom}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white/50 p-3 rounded border border-[#141414]/10">
                  <span className="font-mono text-[10px] opacity-50">ZOOM</span>
                  <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[#141414]" />
                </div>
                
                <button onClick={() => setIsCropping(false)} className="w-full py-3 bg-[#141414] text-[#E4E3E0] font-mono text-xs font-bold hover:bg-[#F27D26] transition-colors uppercase tracking-widest">
                  完成裁剪 / DONE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
