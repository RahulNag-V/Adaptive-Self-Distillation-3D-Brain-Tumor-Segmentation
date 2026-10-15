import React from 'react';
import { Sliders } from 'lucide-react';

/**
 * SliceCoordinatesPanel
 * Fully functional multi-planar slice coordinate navigation panel matching the reference screenshot.
 * Color themes:
 * - Axial (Z): Teal
 * - Coronal (Y): Cyan
 * - Sagittal (X): Blue
 */
export default function SliceCoordinatesPanel({
  axialSlice = 75,
  coronalSlice = 120,
  sagittalSlice = 120,
  dimensions = { axial: 155, coronal: 240, sagittal: 240 },
  onAxialChange,
  onCoronalChange,
  onSagittalChange,
  disabled = false,
}) {
  const totalAxial = Math.max(1, dimensions?.axial || 155);
  const totalCoronal = Math.max(1, dimensions?.coronal || 240);
  const totalSagittal = Math.max(1, dimensions?.sagittal || 240);

  // Clamped values for safe rendering
  const safeAxial = Math.max(0, Math.min(totalAxial - 1, axialSlice));
  const safeCoronal = Math.max(0, Math.min(totalCoronal - 1, coronalSlice));
  const safeSagittal = Math.max(0, Math.min(totalSagittal - 1, sagittalSlice));

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold flex items-center gap-1.5">
          <span>Slice Coordinates</span>
        </span>
        <Sliders className="w-3.5 h-3.5 text-medical-teal" />
      </div>

      {/* 1. Axial Slice (Z) Card - Teal */}
      <div className="space-y-1.5 bg-medical-card p-3 rounded-lg border border-medical-border/80 hover:border-medical-teal/40 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-medical-teal" />
            <span>Axial Slice (Z)</span>
          </span>
          <span className="font-mono text-medical-tealLight font-bold">
            {safeAxial + 1} / {totalAxial}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={totalAxial - 1}
          value={safeAxial}
          disabled={disabled}
          onChange={(e) => onAxialChange && onAxialChange(parseInt(e.target.value, 10))}
          className="w-full accent-medical-teal cursor-pointer h-1.5 bg-medical-surface rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Axial Slice Coordinate"
        />
      </div>

      {/* 2. Coronal Slice (Y) Card - Cyan */}
      <div className="space-y-1.5 bg-medical-card p-3 rounded-lg border border-medical-border/80 hover:border-medical-cyan/40 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-medical-cyan" />
            <span>Coronal Slice (Y)</span>
          </span>
          <span className="font-mono text-medical-cyan font-bold">
            {safeCoronal + 1} / {totalCoronal}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={totalCoronal - 1}
          value={safeCoronal}
          disabled={disabled}
          onChange={(e) => onCoronalChange && onCoronalChange(parseInt(e.target.value, 10))}
          className="w-full accent-medical-cyan cursor-pointer h-1.5 bg-medical-surface rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Coronal Slice Coordinate"
        />
      </div>

      {/* 3. Sagittal Slice (X) Card - Blue */}
      <div className="space-y-1.5 bg-medical-card p-3 rounded-lg border border-medical-border/80 hover:border-medical-blueLight/40 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-medical-blueLight" />
            <span>Sagittal Slice (X)</span>
          </span>
          <span className="font-mono text-medical-blueLight font-bold">
            {safeSagittal + 1} / {totalSagittal}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={totalSagittal - 1}
          value={safeSagittal}
          disabled={disabled}
          onChange={(e) => onSagittalChange && onSagittalChange(parseInt(e.target.value, 10))}
          className="w-full accent-medical-blueLight cursor-pointer h-1.5 bg-medical-surface rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Sagittal Slice Coordinate"
        />
      </div>
    </div>
  );
}
