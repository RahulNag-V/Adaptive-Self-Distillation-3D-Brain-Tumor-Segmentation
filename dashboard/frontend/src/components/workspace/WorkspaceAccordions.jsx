import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Sliders,
  BarChart3,
  Search,
  Check,
  Paintbrush,
  RotateCcw,
  SlidersHorizontal,
  Eraser,
  Undo2,
  Redo2,
  Save,
  Send,
  GitCompare,
  Palette,
  Play,
  Loader2,
  Box,
  Grid,
  ShieldCheck,
  Database
} from 'lucide-react';
import TumorBurdenPanel from '../../viewer/TumorBurdenPanel';
import SliceCoordinatesPanel from '../../viewer/SliceCoordinatesPanel';
import VolumetricsAnalysisPanel from './VolumetricsAnalysisPanel';
import { BRAIN_APPEARANCE_OPTIONS } from '../../viewer/MedicalViewer';

export default function WorkspaceAccordions({
  // Case & Patient
  patients = [],
  selectedPatientId,
  onSelectPatient,
  currentResult,
  annotationRecord,
  // Modality & View
  activeMriModality = 'flair',
  onSelectModality,
  availableModalities = ['flair', 't1', 't1ce', 't2'],
  activeView = '3d',
  onSelectView,
  segSource = 'ground_truth',
  onSelectSegSource,
  confidenceThreshold = 0.90,
  onConfidenceChange,
  // Subregions & Layers
  subregions = { wt: true, tc: true, et: true },
  onToggleSubregion,
  layers = { mri: true, tumor: true, overlay: true },
  onToggleLayer,
  opacity = 0.58,
  onChangeOpacity,
  brainAppearance = 'regions',
  onChangeBrainAppearance,
  // Tools & HITL
  isEditing = false,
  onToggleEditing,
  onReset,
  brushMode = 'paint',
  setBrushMode,
  activeLabel = 1,
  setActiveLabel,
  brushRadius = 4,
  setBrushRadius,
  onUndo,
  onRedo,
  onClearEdits,
  onOpenCompare,
  onOpenDraftModal,
  onOpenSubmitModal,
  onRunPrediction,
  predicting = false,
  // Coordinates & Dimensions
  axialSlice = 75,
  coronalSlice = 120,
  sagittalSlice = 120,
  dimensions = { axial: 155, coronal: 240, sagittal: 240 },
  onAxialChange,
  onCoronalChange,
  onSagittalChange,
  activeAnalysisTab: externalActiveAnalysisTab,
  onActiveAnalysisTabChange,
}) {
  // Accordion Expand/Collapse States (FAQ-style independent toggles)
  const [accordion1Open, setAccordion1Open] = useState(true);
  const [accordion2Open, setAccordion2Open] = useState(true);

  // Accordion 2 Inner Tabs: 'burden' | 'coords' | 'layers'
  const [internalActiveAnalysisTab, setInternalActiveAnalysisTab] = useState('burden');
  const activeAnalysisTab = externalActiveAnalysisTab !== undefined ? externalActiveAnalysisTab : internalActiveAnalysisTab;
  const setActiveAnalysisTab = onActiveAnalysisTabChange || setInternalActiveAnalysisTab;

  // Case Selector Dropdown State
  const [caseDropdownOpen, setCaseDropdownOpen] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const caseDropdownRef = useRef(null);

  // 3D Appearance Dropdown State
  const [appearanceDropdownOpen, setAppearanceDropdownOpen] = useState(false);
  const appearanceDropdownRef = useRef(null);

  // Outside click listener for internal popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (caseDropdownRef.current && !caseDropdownRef.current.contains(e.target)) {
        setCaseDropdownOpen(false);
      }
      if (appearanceDropdownRef.current && !appearanceDropdownRef.current.contains(e.target)) {
        setAppearanceDropdownOpen(false);
      }
    };
    if (caseDropdownOpen || appearanceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [caseDropdownOpen, appearanceDropdownOpen]);

  const selectedPatientObj = patients.find((p) => p.id === selectedPatientId);
  const isValidationCase = selectedPatientObj?.is_validation;

  return (
    <div className="flex flex-col gap-2.5 w-full select-none">
      
      {/* ============================================================== */}
      {/* ACCORDION 1: CASE & VISUALIZATION CONTROLS                     */}
      {/* ============================================================== */}
      <div className="rounded-xl border border-[#111111]/35 dark:border-white/20 bg-transparent shadow-xs overflow-hidden transition-all duration-200">
        {/* Accordion 1 Header Button (Highlighted with mint surface, dark navy text, and teal accent) */}
        <button
          type="button"
          onClick={() => setAccordion1Open((prev) => !prev)}
          aria-expanded={accordion1Open}
          className="w-full flex items-center justify-between px-3.5 py-3 text-left font-extrabold text-xs uppercase tracking-wider text-[#0A2540] dark:text-[#E2F7F2] font-mono bg-[#E2F7F2]/80 hover:bg-[#D4F3EB] dark:bg-[#0E3547]/80 dark:hover:bg-[#124259] transition-colors cursor-pointer group border-b border-[#399DBA]/25"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#399DBA] shadow-[0_0_8px_rgba(57,157,186,0.5)] shrink-0" />
            <Sliders className="w-4 h-4 text-[#399DBA] group-hover:rotate-45 transition-transform shrink-0" />
            <span>Case & Visualization Controls</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#0A2540] dark:text-[#E2F7F2] transition-transform duration-200 ${
              accordion1Open ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>

        {/* Accordion 1 Body */}
        <AnimatePresence initial={false}>
          {accordion1Open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-1 space-y-3 text-xs font-mono bg-transparent">
                
                {/* 1. Case Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#103B5C] tracking-wider">
                      Case Selection:
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      {patients.length} cohorts
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Custom Case Dropdown */}
                    <div className="relative flex-1 min-w-[140px]" ref={caseDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setCaseDropdownOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-1.5 bg-transparent hover:bg-black/5 border border-[#111111]/30 hover:border-[#103B5C] text-[#103B5C] text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        aria-haspopup="listbox"
                        aria-expanded={caseDropdownOpen}
                      >
                        <span className="truncate">
                          {currentResult && selectedPatientId === currentResult.session_id
                            ? `Live: ${currentResult.session_id.substring(0, 10)}...`
                            : selectedPatientId || 'Select Case'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-[#103B5C] transition-transform ${caseDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {caseDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-[#111111] rounded-xl shadow-xl p-2 max-h-60 flex flex-col">
                          {/* Filter Search */}
                          <div className="relative mb-1.5 shrink-0">
                            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={caseSearch}
                              onChange={(e) => setCaseSearch(e.target.value)}
                              placeholder="Filter BraTS case..."
                              className="w-full bg-[#F8FCFB] border border-[#111111]/20 rounded-lg pl-7 pr-2 py-1 text-[11px] text-[#111827] focus:outline-none focus:border-[#399DBA]"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* List */}
                          <div className="overflow-y-auto space-y-0.5 max-h-44 pr-1">
                            {patients
                              .filter((p) => p.id.toLowerCase().includes(caseSearch.toLowerCase()))
                              .map((p) => {
                                const isSel = selectedPatientId === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      onSelectPatient && onSelectPatient(p.id);
                                      setCaseDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] transition-colors cursor-pointer ${
                                      isSel
                                        ? 'bg-[#399DBA]/20 text-[#103B5C] font-bold border border-[#399DBA]'
                                        : 'hover:bg-black/5 text-[#111827]'
                                    }`}
                                  >
                                    <span className="truncate">{p.id}</span>
                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                      <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                                        p.is_validation
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {p.is_validation ? 'Val' : 'Train'}
                                      </span>
                                      {isSel && <Check className="w-3 h-3 text-[#103B5C]" />}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dataset split badge */}
                    <span className={`text-[10px] px-2 py-1 rounded-lg border font-bold shrink-0 ${
                      isValidationCase
                        ? 'bg-transparent border-purple-400 text-purple-900'
                        : 'bg-transparent border-emerald-500 text-emerald-900'
                    }`}>
                      {isValidationCase ? 'Val' : 'Train'}
                    </span>
                  </div>

                  {/* Dataset Name & Source Badge */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-transparent border border-[#111111]/25 text-[#103B5C] font-bold">
                      {annotationRecord?.source_dataset || 'BraTS 2021'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-transparent border border-[#111111]/25 text-[#64748B] font-semibold">
                      {annotationRecord?.status || 'Included in Training Dataset'} (v{annotationRecord?.version || 1})
                    </span>
                  </div>
                </div>

                {/* 2. MRI Modality */}
                <div className="space-y-1 pt-1.5 border-t border-[#111111]/15">
                  <span className="text-[10px] font-bold uppercase text-[#103B5C] tracking-wider block">
                    MRI Modality:
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {availableModalities.map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => onSelectModality && onSelectModality(mod)}
                        className={`py-1 rounded-lg text-center uppercase text-[10px] font-bold transition-all cursor-pointer ${
                          activeMriModality === mod
                            ? 'bg-[#103B5C] text-white shadow-xs'
                            : 'bg-transparent hover:bg-black/5 text-slate-800 hover:text-[#103B5C] border border-[#111111]/25'
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. View Selection */}
                <div className="space-y-1 pt-1.5 border-t border-[#111111]/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#103B5C] tracking-wider">
                      View Selection:
                    </span>
                    <span className="text-[9px] text-[#64748B]">Click view to promote</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: 'quad', label: 'Quad', icon: Grid },
                      { id: '3d', label: '3D', icon: Box },
                      { id: 'axial', label: 'Axial' },
                      { id: 'coronal', label: 'Coron' },
                      { id: 'sagittal', label: 'Sagit' },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectView && onSelectView(id)}
                        className={`py-1 rounded-lg text-center text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          activeView === id
                            ? 'bg-[#103B5C] text-white shadow-xs'
                            : 'bg-transparent hover:bg-black/5 text-slate-800 hover:text-[#103B5C] border border-[#111111]/25'
                        }`}
                        title={`Switch view to ${label}`}
                      >
                        {Icon && <Icon className="w-3 h-3" />}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Segmentation Mask Source */}
                <div className="space-y-1 pt-1.5 border-t border-[#111111]/15">
                  <span className="text-[10px] font-bold uppercase text-[#103B5C] tracking-wider block">
                    Segmentation Mask:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'prediction', label: 'AI Pred' },
                      { id: 'corrected', label: 'Corrected' },
                      { id: 'ground_truth', label: 'Ground Truth' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectSegSource && onSelectSegSource(id)}
                        className={`py-1 rounded-lg text-center text-[10px] font-bold transition-all cursor-pointer ${
                          segSource === id
                            ? 'bg-[#103B5C] text-white shadow-xs'
                            : 'bg-transparent hover:bg-black/5 text-slate-800 hover:text-[#103B5C] border border-[#111111]/25'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* High Confidence Filtering Option for AI Prediction */}
                  {segSource === 'prediction' && (
                    <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#103B5C] font-semibold text-[9px]">Confidence:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onConfidenceChange && onConfidenceChange(0.90)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                            confidenceThreshold === 0.90
                              ? 'bg-[#103B5C] text-white shadow-xs'
                              : 'bg-transparent hover:bg-black/5 text-slate-700 hover:text-[#103B5C] border border-[#111111]/25'
                          }`}
                          title="Display only predictions with >= 90% calibrated tumor probability"
                        >
                          ≥90% High Conf
                        </button>
                        <button
                          type="button"
                          onClick={() => onConfidenceChange && onConfidenceChange(null)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                            confidenceThreshold === null
                              ? 'bg-[#B45309] text-white shadow-xs'
                              : 'bg-transparent hover:bg-black/5 text-slate-700 hover:text-[#B45309] border border-[#111111]/25'
                          }`}
                          title="Display raw unfiltered argmax prediction (debugging)"
                        >
                          Raw (Debug)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Tumor Compartment Legend */}
                <div className="space-y-1.5 pt-1.5 border-t border-[#111111]/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#103B5C] tracking-wider">
                      Tumor Compartment Legend:
                    </span>
                    <span className="text-[9px] text-[#64748B]">Toggle subregion</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'wt', label: 'WT', full: 'Whole Tumor', color: '#EAB308', textClass: 'text-[#B45309]' },
                      { key: 'tc', label: 'TC', full: 'Tumor Core', color: '#EF4444', textClass: 'text-[#DC2626]' },
                      { key: 'et', label: 'ET', full: 'Enhancing', color: '#06B6D4', textClass: 'text-[#0891B2]' },
                    ].map(({ key, label, full, color, textClass }) => {
                      const isActive = subregions[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onToggleSubregion && onToggleSubregion(key)}
                          className={`flex items-center justify-between p-1.5 rounded-lg border text-[10px] transition-all cursor-pointer ${
                            isActive
                              ? 'bg-transparent border-[#111111]/30 shadow-2xs font-bold'
                              : 'bg-transparent border-[#111111]/15 opacity-50'
                          }`}
                          title={`Toggle ${full} (${label})`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                            <span className={textClass}>{label}</span>
                          </div>
                          <span className="text-[9px] text-[#64748B]">{isActive ? 'ON' : 'OFF'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Tools & Visualization Settings */}
                <div className="space-y-2 pt-1.5 border-t border-[#111111]/15">
                  <span className="text-[10px] font-bold uppercase text-[#103B5C] tracking-wider block">
                    Tools & Actions:
                  </span>
                  
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Correct Button */}
                    <button
                      type="button"
                      onClick={onToggleEditing}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all shadow-xs cursor-pointer ${
                        isEditing
                          ? 'bg-amber-400 border-amber-500 text-slate-950'
                          : 'bg-transparent hover:bg-black/5 border-[#111111]/30 text-amber-950'
                      }`}
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Exit Editor' : 'Correct'}</span>
                    </button>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={onReset}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-transparent hover:bg-black/5 border border-[#111111]/30 text-[#103B5C] text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>

                  {/* 3D Brain Appearance Dropdown */}
                  <div className="space-y-1 relative" ref={appearanceDropdownRef}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#103B5C]">3D Brain Appearance:</span>
                      <Palette className="w-3 h-3 text-[#399DBA]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppearanceDropdownOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between bg-transparent border border-[#111111]/30 hover:border-[#103B5C] rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#103B5C] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30"
                          style={{
                            backgroundColor:
                              BRAIN_APPEARANCE_OPTIONS.find((o) => o.id === brainAppearance)?.swatchColor || '#E5B19F',
                          }}
                        />
                        <span className="truncate">
                          {BRAIN_APPEARANCE_OPTIONS.find((o) => o.id === brainAppearance)?.name || 'Anatomical Regions'}
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-[#103B5C] transition-transform ${appearanceDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {appearanceDropdownOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white border border-[#111111] rounded-xl shadow-xl p-1.5 space-y-1">
                        {BRAIN_APPEARANCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              onChangeBrainAppearance && onChangeBrainAppearance(opt.id);
                              setAppearanceDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] transition-colors cursor-pointer ${
                              brainAppearance === opt.id
                                ? 'bg-[#399DBA]/20 text-[#103B5C] font-bold'
                                : 'hover:bg-black/5 text-[#111827]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-3 h-3 rounded-full shrink-0 border border-black/30" style={{ backgroundColor: opt.swatchColor }} />
                              <span className="truncate font-medium">{opt.name}</span>
                            </div>
                            {brainAppearance === opt.id && <Check className="w-3.5 h-3.5 text-[#103B5C]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Segmentation Opacity Slider */}
                  <div className="p-2 rounded-lg bg-transparent border border-[#111111]/25 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-[#103B5C] font-bold">
                      <span>Opacity:</span>
                      <span>{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => onChangeOpacity && onChangeOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#399DBA] cursor-pointer h-1.5 bg-black/10 rounded-lg"
                    />
                  </div>

                  {/* Run Prediction Trigger */}
                  <button
                    type="button"
                    onClick={onRunPrediction}
                    disabled={predicting}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#399DBA] hover:bg-[#103B5C] text-white font-bold text-xs shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {predicting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Inferring UNETR Model...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Re-run UNETR Model</span>
                      </>
                    )}
                  </button>

                  {/* HITL Editor Drawer (Visible when isEditing is true) */}
                  {isEditing && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2 animate-fadeIn">
                      <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Paintbrush className="w-3 h-3 text-amber-700" />
                        <span>Contour Brush Settings</span>
                      </div>

                      {/* Brush vs Eraser */}
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setBrushMode('paint')}
                          className={`py-1 rounded text-center text-[10px] font-bold transition-colors cursor-pointer ${
                            brushMode === 'paint' ? 'bg-[#399DBA] text-white shadow-xs' : 'bg-white text-slate-700 border'
                          }`}
                        >
                          Brush
                        </button>
                        <button
                          type="button"
                          onClick={() => setBrushMode('erase')}
                          className={`py-1 rounded text-center text-[10px] font-bold transition-colors cursor-pointer ${
                            brushMode === 'erase' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-700 border'
                          }`}
                        >
                          Eraser
                        </button>
                      </div>

                      {/* Active Label */}
                      {brushMode === 'paint' && (
                        <div className="grid grid-cols-3 gap-1 text-[9px] font-bold">
                          {[
                            { id: 1, name: 'TC Core', color: '#EF4444' },
                            { id: 2, name: 'WT Edema', color: '#EAB308' },
                            { id: 3, name: 'ET Active', color: '#06B6D4' },
                          ].map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setActiveLabel(l.id)}
                              className={`py-1 px-1 rounded text-center truncate border transition-colors cursor-pointer ${
                                activeLabel === l.id
                                  ? 'border-slate-900 text-white shadow-xs'
                                  : 'border-black/10 bg-white text-slate-700'
                              }`}
                              style={{ backgroundColor: activeLabel === l.id ? l.color : undefined }}
                            >
                              {l.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Radius */}
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span>Radius: {brushRadius}px</span>
                        <div className="flex items-center gap-1">
                          {[2, 4, 8, 16].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setBrushRadius(r)}
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                brushRadius === r ? 'bg-[#103B5C] text-white' : 'bg-white text-slate-700'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions: Undo, Redo, Compare, Submit */}
                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-amber-200">
                        <button
                          type="button"
                          onClick={onUndo}
                          className="flex items-center justify-center gap-1 py-1 rounded bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-900"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Undo</span>
                        </button>
                        <button
                          type="button"
                          onClick={onRedo}
                          className="flex items-center justify-center gap-1 py-1 rounded bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-900"
                        >
                          <Redo2 className="w-3 h-3" />
                          <span>Redo</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenCompare}
                          className="flex items-center justify-center gap-1 py-1 rounded bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-900"
                        >
                          <GitCompare className="w-3 h-3" />
                          <span>Compare</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenSubmitModal}
                          className="flex items-center justify-center gap-1 py-1 rounded bg-[#399DBA] hover:bg-[#103B5C] text-white text-[10px] font-bold shadow-xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>Submit</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================== */}
      {/* ACCORDION 2: VOLUMETRICS & ANALYSIS                            */}
      {/* ============================================================== */}
      <VolumetricsAnalysisPanel
        patientId={selectedPatientId}
        segSource={segSource}
        confidenceThreshold={confidenceThreshold}
        activeMriModality={activeMriModality}
        axialSlice={axialSlice}
        coronalSlice={coronalSlice}
        sagittalSlice={sagittalSlice}
        dimensions={dimensions}
        onAxialChange={onAxialChange}
        onCoronalChange={onCoronalChange}
        onSagittalChange={onSagittalChange}
        subregions={subregions}
        onToggleSubregion={onToggleSubregion}
        layers={layers}
        onToggleLayer={onToggleLayer}
        opacity={opacity}
        onChangeOpacity={onChangeOpacity}
        activeTab={activeAnalysisTab}
        onTabChange={setActiveAnalysisTab}
        isOpen={accordion2Open}
        onToggleOpen={() => setAccordion2Open((prev) => !prev)}
        isFullscreen={false}
      />

    </div>
  );
}
