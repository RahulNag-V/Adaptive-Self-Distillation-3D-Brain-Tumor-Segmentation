import React from 'react';
import { Sliders } from 'lucide-react';

/**
 * SliceCoordinatesPanel
 * Precision multi-planar slice coordinate navigation panel.
 * Theme: Neuro Resonence AI Brand Palette (Deep Blue #103B5C, Primary Brand Blue #399DBA, Ocean Blue #1B6284, Soft Mint #98D9CE)
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
      dotColor: 'bg-[#103B5C]',
      textAccent: 'text-[#103B5C]',
      accentClass: 'accent-[#103B5C]',
      onChange: onAxialChange,
    },
    {
      id: 'coronal',
      label: 'Coronal (Y)',
      value: safeCoronal,
      total: totalCoronal,
      dotColor: 'bg-[#399DBA]',
      textAccent: 'text-[#103B5C]',
      accentClass: 'accent-[#399DBA]',
      onChange: onCoronalChange,
    },
    {
      id: 'sagittal',
      label: 'Sagittal (X)',
      value: safeSagittal,
      total: totalSagittal,
      dotColor: 'bg-[#1B6284]',
      textAccent: 'text-[#103B5C]',
      accentClass: 'accent-[#1B6284]',
      onChange: onSagittalChange,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#111111]/15">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#103B5C] font-bold">
          Spatial Coordinates
        </span>
        <Sliders className="w-3.5 h-3.5 text-[#399DBA]" />
      </div>

      <div className="space-y-1.5">
        {planes.map(({ id, label, value, total, dotColor, textAccent, accentClass, onChange }) => (
          <div
            key={id}
            className="p-2.5 rounded-lg bg-transparent border border-[#111111]/25 hover:border-[#103B5C] transition-colors space-y-1.5 shadow-xs"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#111827] font-bold flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span className="text-[11px] font-sans">{label}</span>
              </span>
              <span className={`font-mono tabular-nums text-[11px] font-bold ${textAccent}`}>
                {value + 1} <span className="text-[#6B7280] font-normal">/ {total}</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={total - 1}
              value={value}
              disabled={disabled}
              onChange={(e) => onChange && onChange(parseInt(e.target.value, 10))}
              className={`w-full ${accentClass} cursor-pointer h-1.5 bg-black/10 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={`${label} Coordinate`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
