import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  ChevronDown
} from 'lucide-react';
import TumorBurdenPanel from '../../viewer/TumorBurdenPanel';
import SliceCoordinatesPanel from '../../viewer/SliceCoordinatesPanel';

/**
 * VolumetricsAnalysisPanel
 * 
 * Reusable clinical analytics panel featuring:
 * 1. Volumetrics Tab: Tumor Burden, Sub-compartment quantitation (WT, TC, ET), Jump-to-slice, Relative burden, Category
 * 2. Coords Tab: Multiplanar Slice Coordinates (Z, Y, X) stepper & sliders
 * 3. Layers Tab: Segmentation subregions (WT, TC, ET) toggles, Anatomy background toggle, Opacity slider
 * 
 * Works seamlessly in both standard workspace accordion and fullscreen overlay view.
 */
export default function VolumetricsAnalysisPanel({
  patientId,
  segSource,
  confidenceThreshold = 0.90,
  activeMriModality,
  axialSlice,
  coronalSlice,
  sagittalSlice,
  dimensions,
  onAxialChange,
  onCoronalChange,
  onSagittalChange,
  subregions = { wt: true, tc: true, et: true },
  onToggleSubregion,
  layers = { mri: true, tumor: true, overlay: true },
  onToggleLayer,
  opacity = 0.85,
  onChangeOpacity,
  activeTab = 'burden',
  onTabChange,
  isOpen = true,
  onToggleOpen,
  isFullscreen = false,
  onClose
}) {
  return (
    <div className={`rounded-xl border transition-all duration-200 select-none overflow-hidden ${
      isFullscreen
        ? 'border-[#399DBA]/40 bg-[#F4FCFA]/95 dark:bg-[#092B47]/95 shadow-2xl backdrop-blur-md flex flex-col h-full'
        : 'border-[#111111]/35 dark:border-white/20 bg-transparent shadow-xs'
    }`}>
      {/* Header Button / Title (Solid Mint Surface & Highlighted Header) */}
      {isFullscreen ? (
        <div className="w-full flex items-center justify-between px-3.5 py-3 select-none bg-[#E2F7F2] dark:bg-[#0E3547] border-b border-[#399DBA]/30 shrink-0">
          <div className="flex-1 flex items-center gap-2 text-left font-extrabold text-xs uppercase tracking-wider text-[#0A2540] dark:text-[#E2F7F2] font-mono">
            <span className="w-1.5 h-3.5 rounded-full bg-[#399DBA] shadow-[0_0_8px_rgba(57,157,186,0.5)] shrink-0" />
            <BarChart3 className="w-4 h-4 text-[#399DBA] shrink-0" />
            <span className="truncate">Volumetrics & Analysis</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between px-3.5 py-3 text-left font-extrabold text-xs uppercase tracking-wider text-[#0A2540] dark:text-[#E2F7F2] font-mono bg-[#E2F7F2]/80 hover:bg-[#D4F3EB] dark:bg-[#0E3547]/80 dark:hover:bg-[#124259] transition-colors cursor-pointer group border-b border-[#399DBA]/25"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#399DBA] shadow-[0_0_8px_rgba(57,157,186,0.5)] shrink-0" />
            <BarChart3 className="w-4 h-4 text-[#399DBA] group-hover:scale-110 transition-transform shrink-0" />
            <span>Volumetrics & Analysis</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#0A2540] dark:text-[#E2F7F2] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
      )}

      {/* Body Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: isFullscreen ? '100%' : 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={`overflow-hidden ${isFullscreen ? 'flex-1 flex flex-col min-h-0' : 'bg-transparent'}`}
          >
            <div className={`p-3 pt-2 space-y-3 font-mono text-xs ${
              isFullscreen 
                ? 'flex-1 overflow-y-auto no-scrollbar' 
                : 'bg-transparent'
            }`}>
              {/* Inner Tabs: Volumetrics | Coords | Layers */}
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-transparent border border-[#111111]/20 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => onTabChange && onTabChange('burden')}
                  className={`py-1 rounded text-center text-[10px] font-bold transition-all cursor-pointer ${
                    activeTab === 'burden'
                      ? 'bg-[#103B5C] text-white shadow-xs'
                      : 'bg-transparent hover:bg-black/5 text-slate-800 dark:text-slate-300 hover:text-[#103B5C]'
                  }`}
                >
                  Volumetrics
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange && onTabChange('coords')}
                  className={`py-1 rounded text-center text-[10px] font-bold transition-all cursor-pointer ${
                    activeTab === 'coords'
                      ? 'bg-[#103B5C] text-white shadow-xs'
                      : 'bg-transparent hover:bg-black/5 text-slate-800 dark:text-slate-300 hover:text-[#103B5C]'
                  }`}
                >
                  Coords
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange && onTabChange('layers')}
                  className={`py-1 rounded text-center text-[10px] font-bold transition-all cursor-pointer ${
                    activeTab === 'layers'
                      ? 'bg-[#103B5C] text-white shadow-xs'
                      : 'bg-transparent hover:bg-black/5 text-slate-800 dark:text-slate-300 hover:text-[#103B5C]'
                  }`}
                >
                  Layers
                </button>
              </div>

              {/* TAB 1: Volumetrics (Burden Analysis, Compartment Volumetrics, Relative Burden, Category) */}
              {activeTab === 'burden' && (
                <div className="space-y-2">
                  <TumorBurdenPanel
                    patientId={patientId}
                    segSource={segSource}
                    confidenceThreshold={confidenceThreshold}
                    activeMriModality={activeMriModality}
                    onSliceSelect={(sliceIdx) => onAxialChange && onAxialChange(sliceIdx)}
                  />
                </div>
              )}

              {/* TAB 2: Coords (Spatial Coordinates Stepper & Sliders) */}
              {activeTab === 'coords' && (
                <div className="space-y-2">
                  <SliceCoordinatesPanel
                    axialSlice={axialSlice}
                    coronalSlice={coronalSlice}
                    sagittalSlice={sagittalSlice}
                    dimensions={dimensions}
                    onAxialChange={onAxialChange}
                    onCoronalChange={onCoronalChange}
                    onSagittalChange={onSagittalChange}
                  />
                </div>
              )}

              {/* TAB 3: Layers (Display Layers & 3D Shading) */}
              {activeTab === 'layers' && (
                <div className="space-y-3">
                  {/* Subregion Layers */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#103B5C] dark:text-cyan-300 block">
                      Segmentation Overlays
                    </span>
                    {[
                      { key: 'wt', label: 'Whole Tumor (WT)', color: '#EAB308', desc: 'Edema + Core + Enhancing' },
                      { key: 'tc', label: 'Tumor Core (TC)', color: '#EF4444', desc: 'Necrotic Core + Enhancing' },
                      { key: 'et', label: 'Enhancing Tumor (ET)', color: '#06B6D4', desc: 'Active Enhancing Tissue' },
                    ].map(({ key, label, color, desc }) => (
                      <label
                        key={key}
                        className="flex items-center justify-between p-2 rounded-lg bg-transparent border border-[#111111]/20 dark:border-white/10 hover:border-[#103B5C] text-xs cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: color }} />
                          <div className="min-w-0">
                            <span className="text-[#111827] dark:text-slate-100 font-bold block truncate">{label}</span>
                            <span className="text-[9px] text-[#64748B] dark:text-slate-400 font-mono">{desc}</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={subregions[key]}
                          onChange={() => onToggleSubregion && onToggleSubregion(key)}
                          className="accent-[#399DBA] rounded cursor-pointer shrink-0"
                        />
                      </label>
                    ))}
                  </div>

                  {/* MRI Anatomy Background Toggle */}
                  <div className="space-y-1.5 pt-1 border-t border-[#111111]/15 dark:border-white/10">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#103B5C] dark:text-cyan-300 block">
                      Anatomy Background
                    </span>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-transparent border border-[#111111]/20 dark:border-white/10 hover:border-[#103B5C] text-xs cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded bg-slate-400 shrink-0" />
                        <div>
                          <span className="text-[#111827] dark:text-slate-100 font-bold block">MRI Scan Anatomy</span>
                          <span className="text-[9px] text-[#64748B] dark:text-slate-400 font-mono">Atlas & Scan Background</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={layers.mri}
                        onChange={() => onToggleLayer && onToggleLayer('mri')}
                        className="accent-[#399DBA] rounded cursor-pointer shrink-0"
                      />
                    </label>
                  </div>

                  {/* Opacity */}
                  <div className="p-2.5 rounded-lg bg-transparent border border-[#111111]/20 dark:border-white/10 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#103B5C] dark:text-cyan-300 font-mono">
                      <span className="font-bold">Segmentation Opacity</span>
                      <span className="font-bold">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => onChangeOpacity && onChangeOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#399DBA] cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
