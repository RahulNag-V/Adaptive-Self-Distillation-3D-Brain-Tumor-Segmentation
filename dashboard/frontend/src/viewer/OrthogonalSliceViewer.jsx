import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
import { getSliceUrl } from '../api/segmentation';

/**
 * OrthogonalSliceViewer
 * Interactive 2D medical viewer for Axial, Coronal, and Sagittal planes.
 * Features:
 * - Real NIfTI slice streaming
 * - Mouse wheel scrolling through slices
 * - Click-to-position synchronized crosshairs
 * - Zoom, pan, and reset
 * - Anatomical directional labels (R/L, A/P, S/I)
 */
export default function OrthogonalSliceViewer({
  plane = 'axial', // 'axial' | 'coronal' | 'sagittal'
  title = 'Axial (Z)',
  patientId,
  sliceIndex = 75,
  totalSlices = 155,
  modality = 'flair',
  segSource = 'ground_truth',
  subregions = { wt: true, tc: true, et: true },
  opacity = 0.75,
  showOverlay = true,
  crosshair = { x: 120, y: 120, z: 78 },
  dimensions = { axial: 155, coronal: 240, sagittal: 240 },
  onSliceChange,
  onCoordinateClick,
  accentColor = 'teal', // 'teal' | 'cyan' | 'blue'
  showControls = true,
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);

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

  // Click on image to update synchronized 3D coordinates
  const handleImageClick = (e) => {
    if (!imageRef.current || !onCoordinateClick) return;
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const u = Math.max(0, Math.min(1, clickX / rect.width));
    const v = Math.max(0, Math.min(1, clickY / rect.height));

    const maxSag = Math.max(1, dimensions.sagittal - 1);
    const maxCor = Math.max(1, dimensions.coronal - 1);
    const maxAx = Math.max(1, dimensions.axial - 1);

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
  };

  // Dragging for pan (middle or right click, or with Alt key)
  const handleMouseDown = (e) => {
    if (e.button === 1 || e.button === 2 || e.altKey) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Compute crosshair position (u, v in 0..1 range)
  const maxSag = Math.max(1, dimensions.sagittal - 1);
  const maxCor = Math.max(1, dimensions.coronal - 1);
  const maxAx = Math.max(1, dimensions.axial - 1);

  let crosshairU = 0.5;
  let crosshairV = 0.5;

  if (plane === 'axial') {
    crosshairU = 1 - crosshair.x / maxSag;
    crosshairV = 1 - crosshair.y / maxCor;
  } else if (plane === 'coronal') {
    crosshairU = 1 - crosshair.x / maxSag;
    crosshairV = 1 - crosshair.z / maxAx;
  } else if (plane === 'sagittal') {
    crosshairU = 1 - crosshair.y / maxCor;
    crosshairV = 1 - crosshair.z / maxAx;
  }

  // Crosshair color by plane
  const crosshairColor =
    accentColor === 'teal'
      ? 'border-medical-teal text-medical-teal'
      : accentColor === 'cyan'
      ? 'border-medical-cyan text-medical-cyan'
      : 'border-medical-blueLight text-medical-blueLight';

  const badgeBg =
    accentColor === 'teal'
      ? 'bg-medical-teal/15 text-medical-teal border-medical-teal/30'
      : accentColor === 'cyan'
      ? 'bg-medical-cyan/15 text-medical-cyan border-medical-cyan/30'
      : 'bg-medical-blueLight/15 text-medical-blueLight border-medical-blueLight/30';

  // Directional labels
  let labelTop = 'A', labelBottom = 'P', labelLeft = 'R', labelRight = 'L';
  if (plane === 'coronal') {
    labelTop = 'S'; labelBottom = 'I'; labelLeft = 'R'; labelRight = 'L';
  } else if (plane === 'sagittal') {
    labelTop = 'S'; labelBottom = 'I'; labelLeft = 'A'; labelRight = 'P';
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full min-h-[260px] bg-medical-darkest rounded-xl overflow-hidden border border-medical-border select-none flex flex-col group"
    >
      {/* Top Header HUD */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 pointer-events-none">
        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${badgeBg}`}>
          {title}
        </span>
        <span className="px-2 py-0.5 rounded bg-medical-base/80 border border-medical-border text-[11px] font-mono text-white">
          Slice {sliceIndex + 1} / {totalSlices}
        </span>
      </div>

      {/* Floating Viewport Controls */}
      {showControls && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-medical-base/90 border border-medical-border/80 p-0.5 rounded-lg shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowCrosshair((prev) => !prev)}
            className={`p-1 rounded text-xs transition-colors ${
              showCrosshair ? 'bg-medical-surface text-medical-teal' : 'text-medical-muted hover:text-white'
            }`}
            title={showCrosshair ? 'Hide Crosshairs' : 'Show Crosshairs'}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.min(3.5, prev * 1.15))}
            className="p-1 rounded text-medical-muted hover:text-white hover:bg-medical-surface transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(0.6, prev * 0.85))}
            className="p-1 rounded text-medical-muted hover:text-white hover:bg-medical-surface transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded text-medical-muted hover:text-white hover:bg-medical-surface transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Anatomical Compass Direction Indicators */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-[10px] font-mono font-bold text-medical-muted/70 pointer-events-none">
        {labelTop}
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-[10px] font-mono font-bold text-medical-muted/70 pointer-events-none">
        {labelBottom}
      </div>
      <div className="absolute top-1/2 left-2 -translate-y-1/2 z-10 text-[10px] font-mono font-bold text-medical-muted/70 pointer-events-none">
        {labelLeft}
      </div>
      <div className="absolute top-1/2 right-2 -translate-y-1/2 z-10 text-[10px] font-mono font-bold text-medical-muted/70 pointer-events-none">
        {labelRight}
      </div>

      {/* Center Image Container with Pan and Zoom */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair">
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          {sliceUrl ? (
            <img
              ref={imageRef}
              src={sliceUrl}
              alt={`${plane} slice ${sliceIndex}`}
              onClick={handleImageClick}
              onLoad={() => setImgLoaded(true)}
              className="max-w-[420px] max-h-[360px] object-contain rounded shadow-lg pointer-events-auto"
              draggable={false}
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-xs text-medical-muted font-mono">
              Loading MRI slice...
            </div>
          )}

          {/* Crosshair Overlay (positioned relative to image) */}
          {showCrosshair && imgLoaded && (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
              }}
            >
              {/* Vertical Crosshair Line */}
              <div
                className={`absolute top-0 bottom-0 border-l border-dashed opacity-75 ${crosshairColor}`}
                style={{ left: `${crosshairU * 100}%` }}
              />
              {/* Horizontal Crosshair Line */}
              <div
                className={`absolute left-0 right-0 border-t border-dashed opacity-75 ${crosshairColor}`}
                style={{ top: `${crosshairV * 100}%` }}
              />
              {/* Intersection Pip */}
              <div
                className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full border border-white bg-medical-teal/60 shadow-sm"
                style={{
                  left: `${crosshairU * 100}%`,
                  top: `${crosshairV * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Metadata Bar */}
      <div className="h-6 px-3 bg-medical-base/80 border-t border-medical-border/60 flex items-center justify-between text-[10px] font-mono text-medical-muted z-10">
        <span>Modality: {modality.toUpperCase()}</span>
        <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
        <span>Scroll: Wheel / Drag Slider</span>
      </div>
    </div>
  );
}
