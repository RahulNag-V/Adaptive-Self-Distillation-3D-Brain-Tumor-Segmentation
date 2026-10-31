import React from 'react';
import { Sliders } from 'lucide-react';

/**
 * SliceCoordinatesPanel
 * Precision multi-planar slice coordinate navigation rail.
 * Styled for the dedicated dark MRI workstation environment (#101B2D / #18263B / #30445E).
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
      dotColor: 'bg-[#7DD3FC]',
      textAccent: 'text-[#7DD3FC]',
      accentClass: 'accent-[#7DD3FC]',
      onChange: onAxialChange,
    },
    {
      id: 'coronal',
      label: 'Coronal (Y)',
      value: safeCoronal,
      total: totalCoronal,
      dotColor: 'bg-[#06B6D4]',
      textAccent: 'text-[#22D3EE]',
      accentClass: 'accent-[#06B6D4]',
      onChange: onCoronalChange,
    },
    {
      id: 'sagittal',
      label: 'Sagittal (X)',
      value: safeSagittal,
      total: totalSagittal,
      dotColor: 'bg-[#38BDF8]',
      textAccent: 'text-[#38BDF8]',
      accentClass: 'accent-[#38BDF8]',
      onChange: onSagittalChange,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#30445E]">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#A7B5C8] font-bold">
          Slice Coordinates
        </span>
        <Sliders className="w-3.5 h-3.5 text-[#7DD3FC]" />
      </div>

      <div className="space-y-2">
        {planes.map(({ id, label, value, total, dotColor, textAccent, accentClass, onChange }) => (
          <div
            key={id}
            className="p-2.5 rounded-xl bg-[#101B2D] border border-[#30445E] hover:border-[#3F5877] transition-colors space-y-1.5 shadow-2xs"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F1F5F9] font-medium flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span className="text-[11px] font-sans">{label}</span>
              </span>
              <span className={`font-mono font-tabular text-[11px] font-bold ${textAccent}`}>
                {value + 1} <span className="text-[#A7B5C8]/60 font-normal">/ {total}</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={total - 1}
              value={value}
              disabled={disabled}
              onChange={(e) => onChange && onChange(parseInt(e.target.value, 10))}
              className={`w-full ${accentClass} cursor-pointer h-1.5 bg-[#18263B] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={`${label} Coordinate`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
