import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Crosshair, 
  Maximize2, 
  Minimize2,
  Info,
  Layers,
  Move,
  Palette,
  Play,
  Pause
} from 'lucide-react';
import { getSliceUrl } from '../api/segmentation';

/**
 * Detailed configuration for each anatomical plane according to radiological conventions.
 */
const PLANE_CONFIG = {
  axial: {
    name: 'AXIAL',
    planeType: 'transverse',
    planeLabel: 'Transverse',
    description: 'Cranial-Caudal horizontal section',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    accentColor: 'teal',
    lineColor: 'border-teal-400/80',
    pipBorder: 'border-teal-300',
    pipBg: 'bg-teal-400',
    nativeW: 240,
    nativeH: 240,
    // Radiological standard: Anterior Top, Posterior Bottom, Patient Right on Left, Patient Left on Right
    labels: { top: 'A (Anterior)', bottom: 'P (Posterior)', left: 'R (Right)', right: 'L (Left)' },
    shortLabels: { top: 'A', bottom: 'P', left: 'R', right: 'L' },
  },
  coronal: {
    name: 'CORONAL',
    planeType: 'frontal',
    planeLabel: 'Frontal',
    description: 'Anterior-Posterior vertical section',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accentColor: 'cyan',
    lineColor: 'border-cyan-400/80',
    pipBorder: 'border-cyan-300',
    pipBg: 'bg-cyan-400',
    nativeW: 240,
    nativeH: 155,
    // Superior Top, Inferior Bottom, Patient Right on Left, Patient Left on Right
    labels: { top: 'S (Superior)', bottom: 'I (Inferior)', left: 'R (Right)', right: 'L (Left)' },
    shortLabels: { top: 'S', bottom: 'I', left: 'R', right: 'L' },
  },
  sagittal: {
    name: 'SAGITTAL',
    planeType: 'side view',
    planeLabel: 'Side View',
    description: 'Lateral vertical section',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    accentColor: 'blue',
    lineColor: 'border-sky-400/80',
    pipBorder: 'border-sky-300',
    pipBg: 'bg-sky-400',
    nativeW: 240,
    nativeH: 155,
    // Superior Top, Inferior Bottom, Anterior on Left, Posterior on Right
    labels: { top: 'S (Superior)', bottom: 'I (Inferior)', left: 'A (Anterior)', right: 'P (Posterior)' },
    shortLabels: { top: 'S', bottom: 'I', left: 'A', right: 'P' },
  },
};

/**
 * OrthogonalSliceViewer
 * High-clarity 2D medical slice viewer for Axial, Coronal, and Sagittal planes.
 * 
 * Features:
 * - Dynamic "Fit to View" image scaling that fills the panel while preserving exact anatomical aspect ratios.
 * - Interactive Pan, Zoom In, Zoom Out, Fit to View, and Reset controls.
 * - Precision thin crosshairs with center reticle marker and toggle option.
 * - Wheel navigation for slice scrolling.
 * - Synchronized 3D coordinate click targeting.
 * - Comprehensive plane headers (AXIAL | Transverse | Modality | Slice N / Total).
 * - Clear viewer footer with voxel coordinates, zoom %, and navigation hints.
 * - Integrated toggleable BraTS segmentation color legend.
 */
export default function OrthogonalSliceViewer({
  plane = 'axial', // 'axial' | 'coronal' | 'sagittal'
  title, // optional custom override
  patientId,
  sliceIndex = 75,
  totalSlices = 155,
  modality = 'flair',
  segSource = 'ground_truth',
  subregions = { wt: true, tc: true, et: true },
  onToggleSubregion,
  opacity = 0.75,
  showOverlay = true,
  crosshair = { x: 120, y: 120, z: 78 },
  dimensions = { axial: 155, coronal: 240, sagittal: 240 },
  onSliceChange,
  onCoordinateClick,
  accentColor,
  showControls = true,
  isMaximized = false,
  onToggleMaximize,
  isEditing = false,
  brushMode = 'paint', // 'paint' | 'erase'
  activeLabel = 1, // 1: NCR, 2: ED, 3: ET, 0: Erase
  brushRadius = 4,
  onStrokeComplete,
  segTimestamp = null,
  rotation = 0,
  brightness = 100,
  contrast = 100,
  externalZoom = null,
  externalPan = null,
}) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const paintCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const strokePointsRef = useRef([]);

  const cfg = PLANE_CONFIG[plane] || PLANE_CONFIG.axial;

  // Viewport and dynamic scaling state
  const [viewportDims, setViewportDims] = useState({ width: 300, height: 260 });
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const controlsRef = useRef(null);

  // Sync external zoom and pan if passed from parent voice controls
  useEffect(() => {
    if (externalZoom !== null && externalZoom !== undefined) {
      setZoom(externalZoom);
    }
  }, [externalZoom]);

  useEffect(() => {
    if (externalPan !== null && externalPan !== undefined) {
      setPan(externalPan);
    }
  }, [externalPan]);

  // Click-outside listener to dismiss BraTS legend popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target)) {
        setShowLegend(false);
      }
    };
    if (showLegend) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLegend]);

  // Cine Mode: continuous automated slice cycling
  useEffect(() => {
    if (!isPlaying || !onSliceChange) return;

    const timer = setInterval(() => {
      onSliceChange((prev) => {
        const current = typeof prev === 'number' ? prev : sliceIndex;
        return (current + 1) % totalSlices;
      });
    }, 85);

    return () => clearInterval(timer);
  }, [isPlaying, sliceIndex, totalSlices, onSliceChange]);

  // Mouse drag tracking
  const mouseTrackRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    hasMoved: false,
  });

  // Native slice dimensions
  const nativeW = cfg.nativeW;
  const nativeH = cfg.nativeH;

  // Calculate base "Fit to View" dimensions using ResizeObserver
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewportDims({ width, height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute scale so slice occupies 94% of available space without clipping
  const availW = Math.max(40, viewportDims.width - 24);
  const availH = Math.max(40, viewportDims.height - 24);
  const fitScale = Math.min(availW / nativeW, availH / nativeH);
  const baseWidth = Math.max(20, Math.round(nativeW * fitScale));
  const baseHeight = Math.max(20, Math.round(nativeH * fitScale));

  // Clear canvas when sliceIndex, plane, or segTimestamp changes
  useEffect(() => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [sliceIndex, plane, isEditing, segTimestamp]);

  const getCanvasVoxelCoords = (e) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) return null;
    const u = clickX / rect.width;
    const v = clickY / rect.height;
    const px = Math.max(0, Math.min(nativeW - 1, Math.round(u * (nativeW - 1))));
    const py = Math.max(0, Math.min(nativeH - 1, Math.round(v * (nativeH - 1))));
    return { px, py };
  };

  const drawBrushPoint = (px, py) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    if (brushMode === 'erase' || activeLabel === 0) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      if (activeLabel === 1) ctx.fillStyle = 'rgba(244, 63, 94, 0.85)'; // TC Coral Red
      else if (activeLabel === 2) ctx.fillStyle = 'rgba(234, 179, 8, 0.85)'; // WT Yellow (Edema)
      else if (activeLabel === 3) ctx.fillStyle = 'rgba(6, 182, 212, 0.85)'; // ET Cyan
      else ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
    }
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, brushRadius), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePaintMouseDown = (e) => {
    if (e.button !== 0 || !isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    const coords = getCanvasVoxelCoords(e);
    if (!coords) return;
    isDrawingRef.current = true;
    strokePointsRef.current = [[coords.px, coords.py]];
    drawBrushPoint(coords.px, coords.py);
  };

  const handlePaintMouseMove = (e) => {
    if (!isDrawingRef.current || !isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    const coords = getCanvasVoxelCoords(e);
    if (!coords) return;
    strokePointsRef.current.push([coords.px, coords.py]);
    drawBrushPoint(coords.px, coords.py);
  };

  const handlePaintMouseUp = (e) => {
    if (!isDrawingRef.current || !isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    isDrawingRef.current = false;
    const pts = strokePointsRef.current;
    strokePointsRef.current = [];
    if (pts.length > 0 && onStrokeComplete) {
      onStrokeComplete({
        plane,
        slice_index: sliceIndex,
        label: brushMode === 'erase' ? 0 : activeLabel,
        brush_radius: brushRadius,
        points: pts,
      });
    }
  };

  // Compute slice URL
  const sliceUrl = patientId
    ? getSliceUrl({
        patientId,
        plane,
        index: sliceIndex,
        modality,
        segSource,
        showWt: subregions.wt,
        showTc: subregions.tc,
        showEt: subregions.et,
        opacity,
        showOverlay,
        timestamp: segTimestamp,
      })
    : '';

  // Wheel navigation: scroll through slices
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      if (!onSliceChange) return;

      const delta = e.deltaY < 0 ? 1 : -1;
      const nextSlice = Math.max(0, Math.min(totalSlices - 1, sliceIndex + delta));
      if (nextSlice !== sliceIndex) {
        onSliceChange(nextSlice);
      }
    },
    [sliceIndex, totalSlices, onSliceChange]
  );

  // Fit to View action
  const handleFitToView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Reset View action
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Zoom controls (multiplicative scaling)
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(5.0, Number((prev * 1.2).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.4, Number((prev * 0.83).toFixed(2))));
  };

  // Mouse down for coordinate picking or dragging to pan
  const handleMouseDown = (e) => {
    if (e.button === 0 || e.button === 1 || e.button === 2) {
      mouseTrackRef.current = {
        isDown: true,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        hasMoved: false,
      };
    }
  };

  const handleMouseMove = (e) => {
    const track = mouseTrackRef.current;
    if (!track.isDown) return;

    const dx = e.clientX - track.startX;
    const dy = e.clientY - track.startY;

    // If dragged more than 4px, treat as pan gesture
    if (Math.hypot(dx, dy) > 4) {
      track.hasMoved = true;
      setIsPanning(true);
      setPan({
        x: track.startPanX + dx,
        y: track.startPanY + dy,
      });
    }
  };

  const handleMouseUp = (e) => {
    const track = mouseTrackRef.current;
    if (!track.isDown) return;

    const wasPanning = track.hasMoved;
    track.isDown = false;
    track.hasMoved = false;
    setIsPanning(false);

    // If it was a simple click (not a drag) on left button, set coordinate
    if (!wasPanning && e.button === 0 && imageRef.current && onCoordinateClick) {
      const rect = imageRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (clickX >= 0 && clickX <= rect.width && clickY >= 0 && clickY <= rect.height) {
        const u = Math.max(0, Math.min(1, clickX / rect.width));
        const v = Math.max(0, Math.min(1, clickY / rect.height));

        const maxSag = Math.max(1, (dimensions?.sagittal || 240) - 1);
        const maxCor = Math.max(1, (dimensions?.coronal || 240) - 1);
        const maxAx = Math.max(1, (dimensions?.axial || 155) - 1);

        if (plane === 'axial') {
          const x = Math.round((1 - u) * maxSag);
          const y = Math.round((1 - v) * maxCor);
          onCoordinateClick({ x, y });
        } else if (plane === 'coronal') {
          const x = Math.round((1 - u) * maxSag);
          const z = Math.round((1 - v) * maxAx);
          onCoordinateClick({ x, z });
        } else if (plane === 'sagittal') {
          const y = Math.round((1 - u) * maxCor);
          const z = Math.round((1 - v) * maxAx);
          onCoordinateClick({ y, z });
        }
      }
    }
  };

  // Compute crosshair position (u, v in 0..1 range)
  const maxSag = Math.max(1, (dimensions?.sagittal || 240) - 1);
  const maxCor = Math.max(1, (dimensions?.coronal || 240) - 1);
  const maxAx = Math.max(1, (dimensions?.axial || 155) - 1);

  let crosshairU = 0.5;
  let crosshairV = 0.5;

  if (plane === 'axial') {
    crosshairU = 1 - (crosshair?.x ?? 120) / maxSag;
    crosshairV = 1 - (crosshair?.y ?? 120) / maxCor;
  } else if (plane === 'coronal') {
    crosshairU = 1 - (crosshair?.x ?? 120) / maxSag;
    crosshairV = 1 - (crosshair?.z ?? 78) / maxAx;
  } else if (plane === 'sagittal') {
    crosshairU = 1 - (crosshair?.y ?? 120) / maxCor;
    crosshairV = 1 - (crosshair?.z ?? 78) / maxAx;
  }

  // Crosshair styling
  const lineColor = cfg.lineColor;
  const pipBorder = cfg.pipBorder;
  const pipBg = cfg.pipBg;

  const headerTitle = title || cfg.name;

  // Viewport width thresholds for responsive header & footer layout
  const isCompact = viewportDims.width < 450;
  const isUltraCompact = viewportDims.width < 340;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full min-h-0 bg-mri-bg rounded-xl overflow-hidden border border-mri-border select-none flex flex-col group shadow-lg"
    >
      {/* 1. TOP HEADER HUD (Responsive, Compact, Clear Metadata & Controls) */}
      <div className="h-9 px-2.5 bg-mri-surface/95 border-b border-mri-border/80 flex items-center justify-between z-20 shrink-0 select-none backdrop-blur-sm">
        {/* Left: Plane Name | Anatomical Type | Modality | Slice Index */}
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span 
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm shrink-0 ${cfg.badgeClass}`}
            title={`${cfg.name} Plane (${cfg.planeLabel} - ${cfg.description})`}
          >
            {isUltraCompact ? cfg.name : headerTitle}
          </span>

          {!isCompact && (
            <>
              <span className="text-[11px] font-medium text-mri-muted capitalize shrink-0">
                {cfg.planeLabel}
              </span>
              <span className="text-mri-border/80 shrink-0">•</span>
              <span className="px-1.5 py-0.5 rounded bg-mri-bg border border-mri-border/70 text-[10px] font-mono font-bold text-mri-text uppercase shrink-0">
                {modality}
              </span>
              <span className="text-mri-border/80 shrink-0">•</span>
            </>
          )}

          <span className="px-1.5 py-0.5 rounded bg-mri-bg border border-mri-border/80 text-[10px] font-mono font-tabular text-mri-text font-semibold shadow-sm shrink-0">
            {isCompact ? `${sliceIndex + 1}/${totalSlices}` : `Slice ${sliceIndex + 1} / ${totalSlices}`}
          </span>

          {isEditing && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono text-amber-300 font-bold uppercase animate-pulse shrink-0">
              EDIT: {brushMode === 'erase' ? 'Eraser' : `L${activeLabel}`} (R:{brushRadius})
            </span>
          )}
        </div>

        {/* Right: Quick Crosshair & Fit Controls */}
        {showControls && (
          <div className="flex items-center gap-0.5 bg-mri-bg/90 border border-mri-border/80 p-0.5 rounded-lg shadow-sm shrink-0 ml-1">
            {/* Toggle Crosshairs */}
            <button
              onClick={() => setShowCrosshair((prev) => !prev)}
              className={`p-1 rounded text-xs transition-colors ${
                showCrosshair ? 'bg-mri-surface text-mri-accent' : 'text-mri-muted hover:text-white hover:bg-mri-surface'
              }`}
              title={showCrosshair ? 'Hide Crosshairs' : 'Show Crosshairs'}
              aria-label="Toggle Crosshairs"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            {/* Maximize / Restore Button */}
            <button
              onClick={onToggleMaximize || handleFitToView}
              className="p-1 rounded text-mri-muted hover:text-white hover:bg-mri-surface transition-colors"
              title={isMaximized ? 'Restore View (Esc)' : 'Maximize Whole Screen'}
              aria-label={isMaximized ? 'Restore View' : 'Maximize Whole Screen'}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5 text-mri-accent" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* 2. MAIN VIEWPORT AREA (Dynamic Scaling, Fitted Slices & Centering) */}
      <div 
        ref={viewportRef}
        className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black/60 ${
          isPanning ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
      >
        {/* Anatomical Compass Direction Indicators (R/L, A/P, S/I) */}
        <div 
          className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded bg-medical-darkest/80 border border-medical-border/60 text-[10px] font-mono font-bold text-medical-muted/90 pointer-events-none shadow-sm"
          title={cfg.labels.top}
        >
          {cfg.shortLabels.top}
        </div>
        <div 
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded bg-medical-darkest/80 border border-medical-border/60 text-[10px] font-mono font-bold text-medical-muted/90 pointer-events-none shadow-sm"
          title={cfg.labels.bottom}
        >
          {cfg.shortLabels.bottom}
        </div>
        <div 
          className="absolute top-1/2 left-1.5 -translate-y-1/2 z-10 px-1.5 py-0.5 rounded bg-medical-darkest/80 border border-medical-border/60 text-[10px] font-mono font-bold text-medical-muted/90 pointer-events-none shadow-sm"
          title={cfg.labels.left}
        >
          {cfg.shortLabels.left}
        </div>
        <div 
          className="absolute top-1/2 right-1.5 -translate-y-1/2 z-10 px-1.5 py-0.5 rounded bg-medical-darkest/80 border border-medical-border/60 text-[10px] font-mono font-bold text-medical-muted/90 pointer-events-none shadow-sm"
          title={cfg.labels.right}
        >
          {cfg.shortLabels.right}
        </div>

        {/* Center Image Container with Smooth Pan, Zoom, Rotation, and Brightness/Contrast Filters */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
            transition: isPanning ? 'none' : 'transform 0.12s ease-out, filter 0.12s ease-out',
            width: `${baseWidth}px`,
            height: `${baseHeight}px`,
          }}
          className="relative flex items-center justify-center flex-shrink-0"
        >
          {sliceUrl ? (
            <img
              ref={imageRef}
              src={sliceUrl}
              alt={`${plane} slice ${sliceIndex}`}
              onLoad={() => setImgLoaded(true)}
              style={{
                width: `${baseWidth}px`,
                height: `${baseHeight}px`,
                imageRendering: zoom > 1.4 ? 'pixelated' : 'auto',
              }}
              className="object-fill rounded shadow-2xl pointer-events-auto block border border-medical-border/40"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-medical-muted font-mono">
              Loading MRI slice...
            </div>
          )}

          {/* Interactive Segmentation Paint Canvas */}
          <canvas
            ref={paintCanvasRef}
            width={nativeW}
            height={nativeH}
            style={{
              width: `${baseWidth}px`,
              height: `${baseHeight}px`,
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 15,
              cursor: isEditing ? (brushMode === 'erase' ? 'cell' : 'crosshair') : 'default',
              pointerEvents: isEditing ? 'auto' : 'none',
            }}
            onMouseDown={handlePaintMouseDown}
            onMouseMove={handlePaintMouseMove}
            onMouseUp={handlePaintMouseUp}
            onMouseLeave={handlePaintMouseUp}
          />

          {/* Synchronized Thin Crosshairs & Center Target Reticle */}
          {showCrosshair && imgLoaded && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Vertical Crosshair Line */}
              <div
                className={`absolute top-0 bottom-0 pointer-events-none border-l ${lineColor}`}
                style={{ 
                  left: `${crosshairU * 100}%`,
                  width: '1px',
                  boxShadow: '0 0 2px rgba(0,0,0,0.85)',
                }}
              />
              {/* Horizontal Crosshair Line */}
              <div
                className={`absolute left-0 right-0 pointer-events-none border-t ${lineColor}`}
                style={{ 
                  top: `${crosshairV * 100}%`,
                  height: '1px',
                  boxShadow: '0 0 2px rgba(0,0,0,0.85)',
                }}
              />
              {/* Precision Center Marker Reticle */}
              <div
                className={`absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border ${pipBorder} shadow-md flex items-center justify-center pointer-events-none ring-1 ring-black/80`}
                style={{
                  left: `${crosshairU * 100}%`,
                  top: `${crosshairV * 100}%`,
                }}
              >
                <span className={`w-1 h-1 rounded-full ${pipBg}`} />
              </div>
            </div>
          )}
        </div>

        {/* Floating Viewport Quick Controls Pill at Bottom Right */}
        {showControls && (
          <div
            ref={controlsRef}
            className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 bg-mri-surface/90 border border-mri-border/80 backdrop-blur-md p-1 rounded-lg shadow-lg opacity-90 hover:opacity-100 transition-opacity"
          >
            {/* Segmentation Color Legend popover - opens upward aligned to right, NEVER overlapping controls! */}
            {showLegend && showOverlay && (
              <div 
                style={{ backgroundColor: '#18263B' }}
                className="absolute right-0 bottom-full mb-2 w-60 max-w-[calc(100vw-3rem)] bg-[#18263B] border border-[#30445E] backdrop-blur-md p-2 rounded-xl shadow-2xl z-40 text-[10px] font-mono animate-dropdown-up"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-mri-border/60 text-mri-muted font-bold text-[9px] uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1.5 text-mri-text">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    BraTS Segmentation
                  </span>
                  <span className="text-cyan-400 font-normal">{Math.round(opacity * 100)}%</span>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleSubregion && onToggleSubregion('wt')}
                    className={`w-full flex items-center justify-between p-1.5 rounded transition-colors ${
                      subregions.wt
                        ? 'bg-amber-950/40 border border-amber-500/40 text-white'
                        : 'bg-mri-bg border border-mri-border text-mri-muted hover:text-white'
                    } ${onToggleSubregion ? 'cursor-pointer hover:bg-amber-900/30' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3 h-3 rounded-sm bg-[#EAB308] shrink-0 shadow-sm ${!subregions.wt ? 'opacity-30' : ''}`} />
                      <span className="font-medium truncate">Whole Tumor (WT)</span>
                    </div>
                    <span className="text-amber-400 font-mono text-[9px] shrink-0 ml-1.5">
                      {subregions.wt ? 'Yellow' : 'Off'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSubregion && onToggleSubregion('tc')}
                    className={`w-full flex items-center justify-between p-1.5 rounded transition-colors ${
                      subregions.tc
                        ? 'bg-rose-950/40 border border-rose-500/40 text-white'
                        : 'bg-mri-bg border border-mri-border text-mri-muted hover:text-white'
                    } ${onToggleSubregion ? 'cursor-pointer hover:bg-rose-900/30' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3 h-3 rounded-sm bg-[#F43F5E] shrink-0 shadow-sm ${!subregions.tc ? 'opacity-30' : ''}`} />
                      <span className="font-medium truncate">Tumor Core (TC)</span>
                    </div>
                    <span className="text-rose-400 font-mono text-[9px] shrink-0 ml-1.5">
                      {subregions.tc ? 'Coral' : 'Off'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSubregion && onToggleSubregion('et')}
                    className={`w-full flex items-center justify-between p-1.5 rounded transition-colors ${
                      subregions.et
                        ? 'bg-cyan-950/40 border border-cyan-500/40 text-white'
                        : 'bg-mri-bg border border-mri-border text-mri-muted hover:text-white'
                    } ${onToggleSubregion ? 'cursor-pointer hover:bg-cyan-900/30' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3 h-3 rounded-sm bg-[#06B6D4] shrink-0 shadow-sm ${!subregions.et ? 'opacity-30' : ''}`} />
                      <span className="font-medium truncate">Enhancing (ET)</span>
                    </div>
                    <span className="text-cyan-400 font-mono text-[9px] shrink-0 ml-1.5">
                      {subregions.et ? 'Cyan' : 'Off'}
                    </span>
                  </button>
                </div>
                {onToggleSubregion && (
                  <div className="text-[9px] text-mri-muted/80 text-center pt-1 mt-1 border-t border-mri-border/40">
                    Click layer to toggle visibility
                  </div>
                )}
              </div>
            )}

            {/* Palette Button with authentic BraTS 3-color swatch */}
            <button
              onClick={() => setShowLegend((prev) => !prev)}
              className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-mono ${
                showLegend
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-mri-bg text-mri-muted hover:text-white'
              }`}
              title={showLegend ? 'Hide BraTS Palette Legend' : 'Show BraTS Palette Legend'}
              aria-label="Toggle Segmentation Legend"
            >
              <Palette className="w-4 h-4" />
              <span 
                className="w-2.5 h-2.5 rounded-full border border-black/50 shadow-sm inline-block shrink-0 bg-gradient-to-tr from-[#EAB308] via-[#F43F5E] to-[#06B6D4]"
              />
            </button>

            {/* Cine Auto-Scroll Play / Pause */}
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className={`p-1.5 rounded transition-colors ${
                isPlaying
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-mri-bg text-mri-muted hover:text-white'
              }`}
              title={isPlaying ? 'Pause Cine Scroll' : 'Play Cine Scroll (Auto-cycle slices)'}
              aria-label="Cine Play"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-mri-bg text-mri-muted hover:text-white transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-mri-bg text-mri-muted hover:text-white transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Reset Camera / View */}
            <button
              onClick={() => {
                setIsPlaying(false);
                handleResetView();
              }}
              className="p-1.5 rounded hover:bg-mri-bg text-mri-muted hover:text-white transition-colors"
              title="Reset View & Pan"
              aria-label="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. BOTTOM VIEWER FOOTER (Compact, Non-overlapping Metadata & Instructions) */}
      <div className="h-6 px-2.5 bg-mri-surface/95 border-t border-mri-border/60 flex items-center justify-between text-[10px] font-mono text-mri-muted z-10 shrink-0 select-none">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="shrink-0">
            MOD: <strong className="text-mri-text uppercase">{modality}</strong>
          </span>
          {!isUltraCompact && (
            <>
              <span className="text-mri-border/80 shrink-0">•</span>
              <span className="truncate">
                VOX: <strong className="text-cyan-400 font-tabular">[{crosshair?.x ?? 0},{crosshair?.y ?? 0},{crosshair?.z ?? 0}]</strong>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {rotation !== 0 && (
            <>
              <span className="text-cyan-400 font-semibold font-tabular">
                {rotation}°
              </span>
              <span className="text-mri-border/80">•</span>
            </>
          )}
          {(brightness !== 100 || contrast !== 100) && (
            <>
              <span className="text-amber-400 font-tabular" title={`Brightness: ${brightness}%, Contrast: ${contrast}%`}>
                B:{brightness}% C:{contrast}%
              </span>
              <span className="text-mri-border/80">•</span>
            </>
          )}
          <span>
            ZOOM: <strong className="text-mri-text font-tabular">{(zoom * 100).toFixed(0)}%</strong>
          </span>
          {!isCompact && (
            <>
              <span className="text-mri-border/80">•</span>
              <span className="text-mri-muted/80">
                Wheel / Click
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
