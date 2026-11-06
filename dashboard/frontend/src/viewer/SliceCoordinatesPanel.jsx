import React from 'react';
import { Sliders } from 'lucide-react';

/**
 * SliceCoordinatesPanel
 * Precision multi-planar slice coordinate navigation panel.
 * Styled for the unified clinical dark workstation palette (#080B12 / #101722 / #151E2B / #1C2636).
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
      dotColor: 'bg-[#35B982]',
      textAccent: 'text-[#35B982]',
      accentClass: 'accent-[#35B982]',
      onChange: onAxialChange,
    },
    {
      id: 'coronal',
      label: 'Coronal (Y)',
      value: safeCoronal,
      total: totalCoronal,
      dotColor: 'bg-[#35C6B0]',
      textAccent: 'text-[#35C6B0]',
      accentClass: 'accent-[#35C6B0]',
      onChange: onCoronalChange,
    },
    {
      id: 'sagittal',
      label: 'Sagittal (X)',
      value: safeSagittal,
      total: totalSagittal,
      dotColor: 'bg-[#4C8DFF]',
      textAccent: 'text-[#4C8DFF]',
      accentClass: 'accent-[#4C8DFF]',
      onChange: onSagittalChange,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#1C2636]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8496AC] font-semibold">
          Spatial Coordinates
        </span>
        <Sliders className="w-3.5 h-3.5 text-[#4C8DFF]" />
      </div>

      <div className="space-y-1.5">
        {planes.map(({ id, label, value, total, dotColor, textAccent, accentClass, onChange }) => (
          <div
            key={id}
            className="p-2 rounded-lg bg-[#151E2B] border border-[#1C2636] hover:border-[#243348] transition-colors space-y-1 shadow-clinical-sm"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F4F7FC] font-medium flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span className="text-[11px] font-sans">{label}</span>
              </span>
              <span className={`font-mono tabular-nums text-[11px] font-bold ${textAccent}`}>
                {value + 1} <span className="text-[#8496AC]/70 font-normal">/ {total}</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={total - 1}
              value={value}
              disabled={disabled}
              onChange={(e) => onChange && onChange(parseInt(e.target.value, 10))}
              className={`w-full ${accentClass} cursor-pointer h-1.5 bg-[#101722] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={`${label} Coordinate`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
