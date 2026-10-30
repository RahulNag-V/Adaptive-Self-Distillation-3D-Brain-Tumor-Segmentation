import React from 'react';
import { Sliders } from 'lucide-react';

/**
 * SliceCoordinatesPanel
 * Precision multi-planar slice coordinate navigation rail.
 * Clean, compact, and optimized for professional PACS-style interaction.
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

  const safeAxial = Math.max(0, Math.min(totalAxial - 1, axialSlice));
  const safeCoronal = Math.max(0, Math.min(totalCoronal - 1, coronalSlice));
  const safeSagittal = Math.max(0, Math.min(totalSagittal - 1, sagittalSlice));

  const planes = [
    {
      id: 'axial',
      label: 'Axial (Z)',
      value: safeAxial,
      total: totalAxial,
      color: 'bg-medical-teal',
      textAccent: 'text-medical-tealLight',
      accentClass: 'accent-medical-teal',
      onChange: onAxialChange,
    },
    {
      id: 'coronal',
      label: 'Coronal (Y)',
      value: safeCoronal,
      total: totalCoronal,
      color: 'bg-medical-cyan',
      textAccent: 'text-medical-cyan',
      accentClass: 'accent-medical-cyan',
      onChange: onCoronalChange,
    },
    {
      id: 'sagittal',
      label: 'Sagittal (X)',
      value: safeSagittal,
      total: totalSagittal,
      color: 'bg-medical-blueLight',
      textAccent: 'text-medical-blueLight',
      accentClass: 'accent-medical-blueLight',
      onChange: onSagittalChange,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-1 border-b border-medical-border/60">
        <span className="text-[11px] font-mono uppercase tracking-wider text-medical-muted font-semibold">
          Slice Coordinates
        </span>
        <Sliders className="w-3.5 h-3.5 text-medical-teal" />
      </div>

      <div className="space-y-2">
        {planes.map(({ id, label, value, total, color, textAccent, accentClass, onChange }) => (
          <div
            key={id}
            className="p-2 rounded-lg bg-medical-card/80 border border-medical-border/70 hover:border-medical-border transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-[11px] font-sans">{label}</span>
              </span>
              <span className={`font-mono font-tabular text-[11px] font-bold ${textAccent}`}>
                {value + 1} <span className="text-medical-muted/60 font-normal">/ {total}</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={total - 1}
              value={value}
              disabled={disabled}
              onChange={(e) => onChange && onChange(parseInt(e.target.value, 10))}
              className={`w-full ${accentClass} cursor-pointer h-1.5 bg-medical-surface rounded-lg disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={`${label} Coordinate`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
