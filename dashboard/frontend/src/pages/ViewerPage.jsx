import React, { useState, useEffect, useCallback } from 'react';
import { 
  RotateCcw, 
  Layers, 
  Sliders, 
  Eye, 
  EyeOff, 
  Box, 
  CheckSquare, 
  Square, 
  Download,
  Grid,
  Maximize2,
  Minimize2,
  Loader2,
  Sparkles,
  Play,
  Database,
  CheckCircle2,
  AlertCircle,
  Palette,
  Info,
  Activity,
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Save,
  Send,
  GitCompare,
  RefreshCw,
  FileCheck,
  ShieldAlert,
  Cpu,
  X,
  Tag
} from 'lucide-react';
import MedicalViewer, { BRAIN_APPEARANCE_OPTIONS, ANATOMICAL_REGIONS_LEGEND } from '../viewer/MedicalViewer';
import OrthogonalSliceViewer from '../viewer/OrthogonalSliceViewer';
import SliceCoordinatesPanel from '../viewer/SliceCoordinatesPanel';
import TumorBurdenPanel from '../viewer/TumorBurdenPanel';
import { getPatients, getPatientMetadata, runPatientPrediction } from '../api/segmentation';
import { 
  getAnnotation, 
  editAnnotation, 
  undoEdit, 
  redoEdit, 
  clearEdits, 
  saveDraft, 
  submitForReview, 
  compareMasks 
} from '../api/adaptive';
import { REGION_LEGEND, DEMO_CASE_METADATA } from '../utils/mockData';

export default function ViewerPage({ currentResult, onNavigate }) {
  // Patient and Dataset State
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    currentResult?.session_id || 'BraTS2021_01017'
  );
  const [patientMeta, setPatientMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);

  // View Layout Mode: 'quad' (4-view MPR standard) | '3d' | 'axial' | 'coronal' | 'sagittal'
  const [viewLayout, setViewLayout] = useState('quad');

  // Full-Screen Maximized Mode: null | '3d' | 'axial' | 'coronal' | 'sagittal'
  const [maximizedViewer, setMaximizedViewer] = useState(null);

  // Shared 3D Voxel Coordinate State (Single Source of Truth)
  const [axialSlice, setAxialSlice] = useState(78);
  const [coronalSlice, setCoronalSlice] = useState(120);
  const [sagittalSlice, setSagittalSlice] = useState(120);

  // Active Sequence (FLAIR, T1, T1CE, T2, or CT)
  const [activeMriModality, setActiveMriModality] = useState(
    currentResult?.is_ct ? 'ct' : 'flair'
  );

  // Segmentation Source: 'prediction' | 'corrected' | 'ground_truth' | 'none'
  const [segSource, setSegSource] = useState(
    currentResult ? (currentResult.is_ct ? 'corrected' : 'prediction') : 'ground_truth'
  );
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState(null);

  // Interactive Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [brushMode, setBrushMode] = useState('paint'); // 'paint' | 'erase'
  const [activeLabel, setActiveLabel] = useState(1); // 1: NCR, 2: ED, 3: ET, 0: Erase
  const [brushRadius, setBrushRadius] = useState(4);
  const [segTimestamp, setSegTimestamp] = useState(Date.now());

  // Annotation Status State
  const [annotationRecord, setAnnotationRecord] = useState(null);
  const [annotationLoading, setAnnotationLoading] = useState(false);

  // Modals for Comparison, Draft Save, and Submission
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftSaving, setDraftSaving] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Layer Visibility
  const [layers, setLayers] = useState({
    mri: true,
    tumor: true,
    overlay: true,
  });

  // Brain Surface & Segmentation Opacity (0.0 to 1.0)
  const [opacity, setOpacity] = useState(0.85);
  const [brainAppearance, setBrainAppearance] = useState('regions');

  // Sub-region filters
  const [subregions, setSubregions] = useState({
    wt: true,
    tc: true,
    et: true,
  });

  // Active right sidebar tab: 'burden' | 'layers'
  const [activeRightTab, setActiveRightTab] = useState('burden');

  // Keyboard shortcut support: Esc to exit fullscreen, 1-4 to switch between views
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && maximizedViewer !== null) {
        setMaximizedViewer(null);
      }
      if (maximizedViewer !== null) {
        if (e.key === '1') setMaximizedViewer('3d');
        if (e.key === '2') setMaximizedViewer('axial');
        if (e.key === '3') setMaximizedViewer('coronal');
        if (e.key === '4') setMaximizedViewer('sagittal');
      }
      // Undo / Redo shortcuts when editing
      if (isEditing && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedViewer, isEditing, selectedPatientId]);

  // Fetch available patients on mount
  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await getPatients();
        if (res && res.patients && res.patients.length > 0) {
          setPatients(res.patients);
          if (!currentResult && !res.patients.some(p => p.id === selectedPatientId)) {
            setSelectedPatientId(res.patients[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch patients list, using fallback:', err);
      }
    }
    loadPatients();
  }, [currentResult]);

  // Load patient metadata whenever selected patient changes
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      if (!selectedPatientId) return;
      setMetaLoading(true);
      try {
        const meta = await getPatientMetadata(selectedPatientId);
        if (isMounted && meta) {
          setPatientMeta(meta);
          if (meta.dimensions) {
            setAxialSlice(Math.floor(meta.dimensions.axial / 2));
            setCoronalSlice(Math.floor(meta.dimensions.coronal / 2));
            setSagittalSlice(Math.floor(meta.dimensions.sagittal / 2));
          }
        }
      } catch (err) {
        console.warn('Could not load patient metadata:', err);
      } finally {
        if (isMounted) setMetaLoading(false);
      }
    }
    loadMeta();
    return () => { isMounted = false; };
  }, [selectedPatientId]);

  // Load versioned annotation record on patient / segSource change
  useEffect(() => {
    let isMounted = true;
    async function loadAnnotation() {
      if (!selectedPatientId) return;
      setAnnotationLoading(true);
      try {
        const rec = await getAnnotation(selectedPatientId, segSource);
        if (isMounted && rec) {
          setAnnotationRecord(rec);
          if (rec.has_corrected_mask && segSource === 'prediction') {
            setSegSource('corrected');
          }
        }
      } catch (err) {
        console.warn('Could not load annotation record:', err);
      } finally {
        if (isMounted) setAnnotationLoading(false);
      }
    }
    loadAnnotation();
    return () => { isMounted = false; };
  }, [selectedPatientId]);

  // Dimensions derived from real metadata or fallback
  const dimensions = patientMeta?.dimensions || { axial: 155, coronal: 240, sagittal: 240 };

  const toggleLayer = (layerKey) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const toggleSubregion = (key) => {
    setSubregions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    setAxialSlice(Math.floor(dimensions.axial / 2));
    setCoronalSlice(Math.floor(dimensions.coronal / 2));
    setSagittalSlice(Math.floor(dimensions.sagittal / 2));
    setOpacity(0.75);
  };

  const handleCoordinateClick = useCallback((newCoords) => {
    if (newCoords.x !== undefined) setSagittalSlice(newCoords.x);
    if (newCoords.y !== undefined) setCoronalSlice(newCoords.y);
    if (newCoords.z !== undefined) setAxialSlice(newCoords.z);
  }, []);

  // --- STROKE DRAWING HANDLER ---
  const handleStrokeComplete = async (stroke) => {
    try {
      const res = await editAnnotation(
        selectedPatientId,
        [stroke],
        stroke.label === 0 ? 'erase' : 'paint',
        segSource
      );
      setSegSource('corrected');
      setSegTimestamp(Date.now());
      // Refresh annotation record
      const rec = await getAnnotation(selectedPatientId, 'corrected');
      if (rec) setAnnotationRecord(rec);
    } catch (err) {
      console.error('Failed to apply stroke:', err);
      alert('Error applying edit stroke: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUndo = async () => {
    try {
      const res = await undoEdit(selectedPatientId);
      setSegTimestamp(Date.now());
      const rec = await getAnnotation(selectedPatientId, 'corrected');
      if (rec) setAnnotationRecord(rec);
    } catch (err) {
      console.error('Failed to undo edit:', err);
    }
  };

  const handleRedo = async () => {
    try {
      const res = await redoEdit(selectedPatientId);
      setSegTimestamp(Date.now());
      const rec = await getAnnotation(selectedPatientId, 'corrected');
      if (rec) setAnnotationRecord(rec);
    } catch (err) {
      console.error('Failed to redo edit:', err);
    }
  };

  const handleClearEdits = async () => {
    if (!window.confirm('Revert all human corrections and reset to original AI prediction mask?')) return;
    try {
      await clearEdits(selectedPatientId);
      setSegTimestamp(Date.now());
      setSegSource('prediction');
      const rec = await getAnnotation(selectedPatientId, 'prediction');
      if (rec) setAnnotationRecord(rec);
    } catch (err) {
      console.error('Failed to clear edits:', err);
    }
  };

  const handleOpenCompare = async () => {
    setCompareLoading(true);
    try {
      const data = await compareMasks(selectedPatientId);
      setCompareData(data);
      setShowCompareModal(true);
    } catch (err) {
      alert('Compare failed: ' + (err.message || 'Prediction mask not available'));
    } finally {
      setCompareLoading(false);
    }
  };

  const handleExecuteSaveDraft = async () => {
    setDraftSaving(true);
    try {
      const res = await saveDraft(selectedPatientId, 'radiologist_user', draftNotes);
      if (res.record) setAnnotationRecord(res.record);
      setShowDraftModal(false);
      setDraftNotes('');
      alert(`Annotation draft saved successfully as Version ${res.record?.version || 1}.`);
    } catch (err) {
      alert('Failed to save draft: ' + err.message);
    } finally {
      setDraftSaving(false);
    }
  };

  const handleExecuteSubmitReview = async () => {
    setSubmitting(true);
    try {
      const res = await submitForReview(selectedPatientId, 'radiologist_user', submitNotes);
      if (res.record) setAnnotationRecord(res.record);
      setShowSubmitModal(false);
      setSubmitNotes('');
      alert('Correction submitted to supervisory clinical review queue for dataset ingestion!');
    } catch (err) {
      alert('Failed to submit for review: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Run on-demand prediction using trained Adaptive UNETR model
  const handleRunPrediction = async () => {
    if (!selectedPatientId) return;
    setPredicting(true);
    setPredictError(null);
    try {
      await runPatientPrediction(selectedPatientId);
      const updatedMeta = await getPatientMetadata(selectedPatientId);
      if (updatedMeta) setPatientMeta(updatedMeta);
      setSegSource('prediction');
      setSegTimestamp(Date.now());
      const rec = await getAnnotation(selectedPatientId, 'prediction');
      if (rec) setAnnotationRecord(rec);
    } catch (err) {
      setPredictError(err.message || 'Model prediction failed.');
    } finally {
      setPredicting(false);
    }
  };

  const dimensionsStr = `${dimensions.sagittal} × ${dimensions.coronal} × ${dimensions.axial} voxels`;

  // Color mappings for Annotation State
  const stateBadgeStyle = (status) => {
    switch (status) {
      case 'Prediction Generated':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Correction In Progress':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Draft Saved':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Submitted for Review':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'Approved for Training':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Rejected':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Included in Training Dataset':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-medical-surface text-medical-muted border-medical-border';
    }
  };

  return (
    <div className="h-full flex flex-col p-3 lg:p-4 space-y-2.5 overflow-hidden">
      {/* 1. TOP BANNER / CASE IDENTIFIER & HITL STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-medical-base border border-medical-border px-3.5 py-2 rounded-xl shadow-md">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-medical-teal animate-pulse" />
            <span className="text-xs text-medical-muted uppercase font-mono font-semibold">Case:</span>
          </div>

          {/* Patient Selector Dropdown */}
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="bg-medical-card border border-medical-teal/40 hover:border-medical-teal text-white text-xs font-mono font-semibold px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-medical-teal cursor-pointer"
          >
            {currentResult && (
              <option value={currentResult.session_id}>
                Live Session: {currentResult.session_id.substring(0, 16)}...
              </option>
            )}
            {patients.length > 0 ? (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} {p.is_validation ? '(Validation Split)' : ''}
                </option>
              ))
            ) : (
              <option value="BraTS2021_01017">BraTS2021_01017 (Training)</option>
            )}
          </select>

          {/* Annotation Lifecycle State Badge */}
          {annotationRecord && (
            <div className="flex items-center gap-1.5 border-l border-medical-border pl-2.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${stateBadgeStyle(annotationRecord.status)}`}>
                {annotationRecord.status} (v{annotationRecord.version || 1})
              </span>
              {annotationRecord.edit_history?.length > 0 && (
                <span className="text-[10px] font-mono text-medical-muted">
                  {annotationRecord.edit_history.length} edit{annotationRecord.edit_history.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Seg Source Toggle (Prediction vs Corrected vs Ground Truth) */}
          <div className="flex items-center gap-1 bg-medical-card border border-medical-border p-0.5 rounded-lg text-xs font-mono">
            <span className="text-[10px] text-medical-muted px-1.5">Mask:</span>
            {[
              { id: 'prediction', label: 'AI Prediction' },
              { id: 'corrected', label: 'Human Corrected' },
              { id: 'ground_truth', label: 'Ground Truth' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSegSource(id)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  segSource === id
                    ? 'bg-medical-teal text-medical-darkest shadow-sm'
                    : 'text-medical-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Header Controls: Interactive Editor Toggle & Sequence Selector */}
        <div className="flex items-center gap-2">
          {/* Correction Mode Button */}
          <button
            onClick={() => setIsEditing(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all shadow-md ${
              isEditing
                ? 'bg-amber-400 text-medical-darkest border-amber-300 shadow-amber-400/20'
                : 'bg-medical-card text-amber-300 border-amber-400/50 hover:bg-amber-400/10'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Exit Editor' : 'Correct Segmentation'}</span>
          </button>

          {/* Modality Selector Buttons */}
          <div className="flex items-center gap-1 bg-medical-card border border-medical-border p-0.5 rounded-lg text-xs font-mono">
            {['flair', 't1', 't1ce', 't2'].map((mod) => (
              <button
                key={mod}
                onClick={() => setActiveMriModality(mod)}
                className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold transition-all ${
                  activeMriModality === mod
                    ? 'bg-medical-teal text-medical-darkest'
                    : 'text-medical-muted hover:text-white'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE CORRECTION TOOLBAR RIBBON (VISIBLE WHEN isEditing IS TRUE) */}
      {isEditing && (
        <div className="bg-medical-base border border-amber-400/40 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fadeIn">
          {/* Left: Mode (Paint vs Erase) & Label Selection */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5" />
              HITL Editor:
            </span>

            {/* Brush vs Eraser Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-medical-card border border-medical-border">
              <button
                onClick={() => setBrushMode('paint')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  brushMode === 'paint'
                    ? 'bg-medical-teal text-medical-darkest shadow-sm'
                    : 'text-medical-muted hover:text-white'
                }`}
              >
                <Paintbrush className="w-3 h-3" />
                <span>Brush</span>
              </button>
              <button
                onClick={() => setBrushMode('erase')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  brushMode === 'erase'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-medical-muted hover:text-white'
                }`}
              >
                <Eraser className="w-3 h-3" />
                <span>Eraser</span>
              </button>
            </div>

            {/* Subregion Label Selection (only active when paint mode is on) */}
            {brushMode === 'paint' && (
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-[11px] text-medical-muted">Label:</span>
                {[
                  { id: 1, name: 'NCR / NET', color: '#EF4444', desc: 'Necrotic Core / Non-enhancing' },
                  { id: 2, name: 'ED (Edema)', color: '#10B981', desc: 'Peritumoral Edema' },
                  { id: 3, name: 'ET (Enhancing)', color: '#F59E0B', desc: 'Enhancing Active Tumor' },
                ].map(({ id, name, color, desc }) => (
                  <button
                    key={id}
                    onClick={() => setActiveLabel(id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all ${
                      activeLabel === id
                        ? 'border-white text-white font-bold shadow-md'
                        : 'border-transparent text-medical-muted hover:text-white bg-medical-card'
                    }`}
                    style={{
                      backgroundColor: activeLabel === id ? color : undefined,
                      color: activeLabel === id ? '#000' : undefined
                    }}
                    title={desc}
                  >
                    <span 
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: color }}
                    />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Brush Radius Slider & Presets */}
            <div className="flex items-center gap-2 pl-2 border-l border-medical-border text-xs font-mono">
              <span className="text-medical-muted text-[11px]">Radius: {brushRadius}px</span>
              <input
                type="range"
                min="1"
                max="25"
                value={brushRadius}
                onChange={(e) => setBrushRadius(Number(e.target.value))}
                className="w-20 accent-medical-teal cursor-pointer"
              />
              <div className="flex items-center gap-0.5">
                {[2, 4, 8, 16].map((r) => (
                  <button
                    key={r}
                    onClick={() => setBrushRadius(r)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${brushRadius === r ? 'bg-medical-teal text-medical-darkest font-bold' : 'text-medical-muted hover:text-white bg-medical-card'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Undo, Redo, Clear, Compare, Draft Save, Submit */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={!annotationRecord?.edit_history?.length}
              className="p-1.5 rounded bg-medical-card hover:bg-medical-surface border border-medical-border text-white disabled:opacity-40 transition-colors"
              title="Undo Last Stroke (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            {/* Redo */}
            <button
              onClick={handleRedo}
              className="p-1.5 rounded bg-medical-card hover:bg-medical-surface border border-medical-border text-white transition-colors"
              title="Redo Stroke (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            {/* Clear All Human Edits */}
            <button
              onClick={handleClearEdits}
              disabled={!annotationRecord?.edit_history?.length}
              className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-[11px] disabled:opacity-40 transition-colors"
              title="Reset all edits"
            >
              Clear
            </button>

            {/* Compare Masks */}
            <button
              onClick={handleOpenCompare}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-medical-card hover:bg-medical-surface border border-medical-teal/40 text-medical-tealLight text-[11px] transition-colors"
              title="Compare Original AI vs Corrected Mask"
            >
              <GitCompare className="w-3 h-3 text-medical-teal" />
              <span>Compare</span>
            </button>

            {/* Save Draft */}
            <button
              onClick={() => setShowDraftModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/40 text-purple-300 text-[11px] transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>Save Draft</span>
            </button>

            {/* Confirm & Submit for Review */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-medical-darkest font-bold text-[11px] shadow-sm transition-all"
            >
              <Send className="w-3 h-3" />
              <span>Submit for Review</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CLINICAL WORKSPACE: LEFT (PROJECTIONS) | CENTER (VIEWPORTS) | RIGHT (LAYERS) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Projection Mode & Slice Coordinates Panel (3 cols on lg) */}
        <div className="lg:col-span-3 bg-medical-base border border-medical-border rounded-xl p-3.5 flex flex-col justify-between space-y-3 overflow-y-auto">
          <div className="space-y-3">
            {/* Projection / Layout Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold block">
                Projection Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-medical-card border border-medical-border">
                {[
                  { id: 'quad', label: 'Quad MPR (4-up)', icon: Grid },
                  { id: '3d', label: '3D Volume', icon: Box },
                  { id: 'axial', label: 'Axial (Z)', icon: null },
                  { id: 'coronal', label: 'Coronal (Y)', icon: null },
                  { id: 'sagittal', label: 'Sagittal (X)', icon: null },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setViewLayout(id)}
                    className={`py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      id === 'quad' ? 'col-span-2' : ''
                    } ${
                      viewLayout === id
                        ? 'bg-medical-teal text-medical-darkest font-semibold shadow-sm'
                        : 'text-medical-muted hover:text-white hover:bg-medical-surface'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SLICE COORDINATES PANEL */}
            <SliceCoordinatesPanel
              axialSlice={axialSlice}
              coronalSlice={coronalSlice}
              sagittalSlice={sagittalSlice}
              dimensions={dimensions}
              onAxialChange={setAxialSlice}
              onCoronalChange={setCoronalSlice}
              onSagittalChange={setSagittalSlice}
            />
          </div>

          {/* Tool Action Buttons */}
          <div className="pt-2 border-t border-medical-border/70 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-medical-muted block">
              Quick Actions
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-border text-white transition-all shadow-sm"
              >
                <RotateCcw className="w-3 h-3 text-medical-muted" />
                <span>Reset View</span>
              </button>
              <button
                onClick={() => setViewLayout('quad')}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-border text-white transition-all shadow-sm"
              >
                <Grid className="w-3 h-3 text-medical-teal" />
                <span>Quad MPR</span>
              </button>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive 3D & 2D Multi-Planar Reconstruction (6 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col min-h-0 h-full overflow-hidden">
          {viewLayout === 'quad' ? (
            /* QUAD MPR VIEW: 2x2 Synchronized Grid (3D + Axial + Coronal + Sagittal) */
            <div className="grid grid-cols-1 sm:grid-cols-2 grid-rows-2 gap-2 h-full min-h-0">
              {/* Viewport 1: 3D Anatomical Brain & Segmented Tumor */}
              <div className="h-full min-h-0 overflow-hidden">
                <MedicalViewer
                  viewMode="3d"
                  layers={layers}
                  opacity={opacity}
                  subregions={subregions}
                  brainAppearance={brainAppearance}
                  onBrainAppearanceChange={setBrainAppearance}
                  onResetView={handleReset}
                  isMaximized={false}
                  onToggleMaximize={() => setMaximizedViewer('3d')}
                />
              </div>

              {/* Viewport 2: Axial (Z) Plane */}
              <div className="h-full min-h-0 overflow-hidden">
                <OrthogonalSliceViewer
                  plane="axial"
                  title="Axial (Z)"
                  patientId={selectedPatientId}
                  sliceIndex={axialSlice}
                  totalSlices={dimensions.axial}
                  modality={activeMriModality}
                  segSource={segSource}
                  subregions={subregions}
                  opacity={opacity}
                  showOverlay={layers.tumor || layers.overlay}
                  crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                  dimensions={dimensions}
                  onSliceChange={setAxialSlice}
                  onCoordinateClick={handleCoordinateClick}
                  accentColor="teal"
                  isMaximized={false}
                  onToggleMaximize={() => setMaximizedViewer('axial')}
                  isEditing={isEditing}
                  brushMode={brushMode}
                  activeLabel={activeLabel}
                  brushRadius={brushRadius}
                  onStrokeComplete={handleStrokeComplete}
                  segTimestamp={segTimestamp}
                />
              </div>

              {/* Viewport 3: Coronal (Y) Plane */}
              <div className="h-full min-h-0 overflow-hidden">
                <OrthogonalSliceViewer
                  plane="coronal"
                  title="Coronal (Y)"
                  patientId={selectedPatientId}
                  sliceIndex={coronalSlice}
                  totalSlices={dimensions.coronal}
                  modality={activeMriModality}
                  segSource={segSource}
                  subregions={subregions}
                  opacity={opacity}
                  showOverlay={layers.tumor || layers.overlay}
                  crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                  dimensions={dimensions}
                  onSliceChange={setCoronalSlice}
                  onCoordinateClick={handleCoordinateClick}
                  accentColor="cyan"
                  isMaximized={false}
                  onToggleMaximize={() => setMaximizedViewer('coronal')}
                  isEditing={isEditing}
                  brushMode={brushMode}
                  activeLabel={activeLabel}
                  brushRadius={brushRadius}
                  onStrokeComplete={handleStrokeComplete}
                  segTimestamp={segTimestamp}
                />
              </div>

              {/* Viewport 4: Sagittal (X) Plane */}
              <div className="h-full min-h-0 overflow-hidden">
                <OrthogonalSliceViewer
                  plane="sagittal"
                  title="Sagittal (X)"
                  patientId={selectedPatientId}
                  sliceIndex={sagittalSlice}
                  totalSlices={dimensions.sagittal}
                  modality={activeMriModality}
                  segSource={segSource}
                  subregions={subregions}
                  opacity={opacity}
                  showOverlay={layers.tumor || layers.overlay}
                  crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                  dimensions={dimensions}
                  onSliceChange={setSagittalSlice}
                  onCoordinateClick={handleCoordinateClick}
                  accentColor="blue"
                  isMaximized={false}
                  onToggleMaximize={() => setMaximizedViewer('sagittal')}
                  isEditing={isEditing}
                  brushMode={brushMode}
                  activeLabel={activeLabel}
                  brushRadius={brushRadius}
                  onStrokeComplete={handleStrokeComplete}
                  segTimestamp={segTimestamp}
                />
              </div>
            </div>
          ) : viewLayout === '3d' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <MedicalViewer
                viewMode="3d"
                layers={layers}
                opacity={opacity}
                subregions={subregions}
                brainAppearance={brainAppearance}
                onBrainAppearanceChange={setBrainAppearance}
                onResetView={handleReset}
                isMaximized={false}
                onToggleMaximize={() => setMaximizedViewer('3d')}
              />
            </div>
          ) : viewLayout === 'axial' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <OrthogonalSliceViewer
                plane="axial"
                title="Axial (Z)"
                patientId={selectedPatientId}
                sliceIndex={axialSlice}
                totalSlices={dimensions.axial}
                modality={activeMriModality}
                segSource={segSource}
                subregions={subregions}
                opacity={opacity}
                showOverlay={layers.tumor || layers.overlay}
                crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                dimensions={dimensions}
                onSliceChange={setAxialSlice}
                onCoordinateClick={handleCoordinateClick}
                accentColor="teal"
                isMaximized={false}
                onToggleMaximize={() => setMaximizedViewer('axial')}
                isEditing={isEditing}
                brushMode={brushMode}
                activeLabel={activeLabel}
                brushRadius={brushRadius}
                onStrokeComplete={handleStrokeComplete}
                segTimestamp={segTimestamp}
              />
            </div>
          ) : viewLayout === 'coronal' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <OrthogonalSliceViewer
                plane="coronal"
                title="Coronal (Y)"
                patientId={selectedPatientId}
                sliceIndex={coronalSlice}
                totalSlices={dimensions.coronal}
                modality={activeMriModality}
                segSource={segSource}
                subregions={subregions}
                opacity={opacity}
                showOverlay={layers.tumor || layers.overlay}
                crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                dimensions={dimensions}
                onSliceChange={setCoronalSlice}
                onCoordinateClick={handleCoordinateClick}
                accentColor="cyan"
                isMaximized={false}
                onToggleMaximize={() => setMaximizedViewer('coronal')}
                isEditing={isEditing}
                brushMode={brushMode}
                activeLabel={activeLabel}
                brushRadius={brushRadius}
                onStrokeComplete={handleStrokeComplete}
                segTimestamp={segTimestamp}
              />
            </div>
          ) : (
            <div className="h-full min-h-0 overflow-hidden">
              <OrthogonalSliceViewer
                plane="sagittal"
                title="Sagittal (X)"
                patientId={selectedPatientId}
                sliceIndex={sagittalSlice}
                totalSlices={dimensions.sagittal}
                modality={activeMriModality}
                segSource={segSource}
                subregions={subregions}
                opacity={opacity}
                showOverlay={layers.tumor || layers.overlay}
                crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                dimensions={dimensions}
                onSliceChange={setSagittalSlice}
                onCoordinateClick={handleCoordinateClick}
                accentColor="blue"
                isMaximized={false}
                onToggleMaximize={() => setMaximizedViewer('sagittal')}
                isEditing={isEditing}
                brushMode={brushMode}
                activeLabel={activeLabel}
                brushRadius={brushRadius}
                onStrokeComplete={handleStrokeComplete}
                segTimestamp={segTimestamp}
              />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Layer Visibility & Quantitative Volumetrics (3 cols on lg) */}
        <div className="lg:col-span-3 bg-medical-base border border-medical-border rounded-xl p-3.5 flex flex-col justify-between space-y-3 overflow-y-auto">
          <div className="space-y-4">
            {/* Header Tabs */}
            <div className="flex items-center gap-1 p-1 bg-medical-card rounded-lg border border-medical-border text-xs">
              <button
                onClick={() => setActiveRightTab('burden')}
                className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                  activeRightTab === 'burden'
                    ? 'bg-medical-teal text-medical-darkest font-semibold'
                    : 'text-medical-muted hover:text-white'
                }`}
              >
                Volumetrics
              </button>
              <button
                onClick={() => setActiveRightTab('layers')}
                className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                  activeRightTab === 'layers'
                    ? 'bg-medical-teal text-medical-darkest font-semibold'
                    : 'text-medical-muted hover:text-white'
                }`}
              >
                Layers
              </button>
            </div>

            {/* TAB 1: Volumetric Analysis Panel */}
            {activeRightTab === 'burden' ? (
              <TumorBurdenPanel
                patientId={selectedPatientId}
                segSource={segSource}
                onSliceSelect={(sliceIdx) => setAxialSlice(sliceIdx)}
              />
            ) : (
              /* TAB 2: Layers & Opacity Control */
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold block">
                    Segmentation Overlays
                  </span>
                  {[
                    { key: 'wt', label: 'Whole Tumor (WT)', color: '#10B981' },
                    { key: 'tc', label: 'Tumor Core (TC)', color: '#F59E0B' },
                    { key: 'et', label: 'Enhancing Tumor (ET)', color: '#EF4444' },
                  ].map(({ key, label, color }) => (
                    <label key={key} className="flex items-center justify-between p-2 rounded bg-medical-card border border-medical-border text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
                        <span className="text-white">{label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={subregions[key]}
                        onChange={() => toggleSubregion(key)}
                        className="accent-medical-teal rounded"
                      />
                    </label>
                  ))}
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1.5 p-3 rounded bg-medical-card border border-medical-border text-xs">
                  <div className="flex items-center justify-between text-medical-muted font-mono">
                    <span>Overlay Opacity</span>
                    <span className="text-white font-bold">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-medical-teal cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Run Prediction / Pipeline Trigger */}
          <div className="pt-3 border-t border-medical-border/70">
            <button
              onClick={handleRunPrediction}
              disabled={predicting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-medical-teal hover:bg-medical-tealLight text-medical-darkest font-semibold text-xs transition-all shadow-md disabled:opacity-50"
            >
              {predicting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Segmenting...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Re-run UNETR Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* FULLSCREEN MAXIMIZED MODAL OVERLAY */}
      {maximizedViewer && (
        <div className="fixed inset-0 z-50 bg-[#070b13] flex flex-col p-2.5 sm:p-3 overflow-hidden select-none animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-medical-base/95 border border-medical-border/80 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md mb-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-medical-teal animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                {maximizedViewer.toUpperCase()} VIEW • CASE: {selectedPatientId}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMaximizedViewer(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-border text-white text-xs font-mono font-semibold"
              >
                <Minimize2 className="w-3.5 h-3.5 text-medical-teal" />
                <span>Exit Fullscreen (Esc)</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-0 relative rounded-xl overflow-hidden border border-medical-border shadow-2xl bg-medical-darkest">
            {maximizedViewer === '3d' && (
              <MedicalViewer
                viewMode="3d"
                layers={layers}
                opacity={opacity}
                subregions={subregions}
                brainAppearance={brainAppearance}
                onBrainAppearanceChange={setBrainAppearance}
                onResetView={handleReset}
                isMaximized={true}
                onToggleMaximize={() => setMaximizedViewer(null)}
              />
            )}
            {maximizedViewer === 'axial' && (
              <OrthogonalSliceViewer
                plane="axial"
                title="Axial Plane (Z)"
                patientId={selectedPatientId}
                sliceIndex={axialSlice}
                totalSlices={dimensions.axial}
                modality={activeMriModality}
                segSource={segSource}
                subregions={subregions}
                opacity={opacity}
                showOverlay={layers.tumor || layers.overlay}
                crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                dimensions={dimensions}
                onSliceChange={setAxialSlice}
                onCoordinateClick={handleCoordinateClick}
                accentColor="teal"
                isMaximized={true}
                onToggleMaximize={() => setMaximizedViewer(null)}
                isEditing={isEditing}
                brushMode={brushMode}
                activeLabel={activeLabel}
                brushRadius={brushRadius}
                onStrokeComplete={handleStrokeComplete}
                segTimestamp={segTimestamp}
              />
            )}
            {maximizedViewer === 'coronal' && (
              <OrthogonalSliceViewer
                plane="coronal"
                title="Coronal Plane (Y)"
                patientId={selectedPatientId}
                sliceIndex={coronalSlice}
                totalSlices={dimensions.coronal}
                modality={activeMriModality}
                segSource={segSource}
                subregions={subregions}
                opacity={opacity}
                showOverlay={layers.tumor || layers.overlay}
                crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                dimensions={dimensions}
                onSliceChange={setCoronalSlice}
                onCoordinateClick={handleCoordinateClick}
                accentColor="cyan"
                isMaximized={true}
                onToggleMaximize={() => setMaximizedViewer(null)}
                isEditing={isEditing}
                brushMode={brushMode}
                activeLabel={activeLabel}
                brushRadius={brushRadius}
                onStrokeComplete={handleStrokeComplete}
                segTimestamp={segTimestamp}
              />
            )}
            {maximizedViewer === 'sagittal' && (
              <OrthogonalSliceViewer
                plane="sagittal"
                title="Sagittal Plane (X)"
                patientId={selectedPatientId}
                sliceIndex={sagittalSlice}
                totalSlices={dimensions.sagittal}
                modality={activeMriModality}
                segSource={segSource}
                subregions={subregions}
                opacity={opacity}
                showOverlay={layers.tumor || layers.overlay}
                crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                dimensions={dimensions}
                onSliceChange={setSagittalSlice}
                onCoordinateClick={handleCoordinateClick}
                accentColor="blue"
                isMaximized={true}
                onToggleMaximize={() => setMaximizedViewer(null)}
                isEditing={isEditing}
                brushMode={brushMode}
                activeLabel={activeLabel}
                brushRadius={brushRadius}
                onStrokeComplete={handleStrokeComplete}
                segTimestamp={segTimestamp}
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: MASK COMPARISON MODAL (AI Prediction vs Corrected) */}
      {showCompareModal && compareData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-medical-base border border-medical-teal/50 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-medical-border pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-medical-teal" />
                <h3 className="font-bold text-white text-base">Mask Comparison Analysis</h3>
              </div>
              <button 
                onClick={() => setShowCompareModal(false)}
                className="text-medical-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-medical-muted">
                Quantifying agreement between original UNETR model prediction and human clinical correction:
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-medical-card border border-medical-border">
                  <span className="text-medical-muted block text-[10px]">Overall Dice Agreement</span>
                  <span className="text-lg font-bold text-medical-teal">
                    {compareData.dice_agreement !== undefined ? (compareData.dice_agreement * 100).toFixed(1) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-medical-card border border-medical-border">
                  <span className="text-medical-muted block text-[10px]">Modified Voxels</span>
                  <span className="text-lg font-bold text-white">
                    {compareData.voxels_changed || 0}
                  </span>
                </div>
              </div>

              {compareData.volume_comparison && (
                <div className="p-3 rounded-lg bg-medical-card border border-medical-border space-y-2">
                  <span className="font-semibold text-white block">Volume Deltas:</span>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-emerald-400 block font-bold">WT (Whole Tumor)</span>
                      <span>Pred: {compareData.volume_comparison.WT?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-white block font-semibold">Corr: {compareData.volume_comparison.WT?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                    <div>
                      <span className="text-amber-400 block font-bold">TC (Core)</span>
                      <span>Pred: {compareData.volume_comparison.TC?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-white block font-semibold">Corr: {compareData.volume_comparison.TC?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                    <div>
                      <span className="text-red-400 block font-bold">ET (Enhancing)</span>
                      <span>Pred: {compareData.volume_comparison.ET?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-white block font-semibold">Corr: {compareData.volume_comparison.ET?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 rounded-lg bg-medical-teal text-medical-darkest font-semibold text-xs shadow-md"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SAVE DRAFT MODAL */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-medical-base border border-purple-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-medical-border pb-3">
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Save Annotation Draft</h3>
              </div>
              <button onClick={() => setShowDraftModal(false)} className="text-medical-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-medical-muted">
                Save your in-progress voxel corrections without submitting to the training queue. You can resume editing later.
              </p>
              <div>
                <label className="text-white font-semibold block mb-1">Clinical Notes (Optional):</label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="e.g., Extended enhancing tumor margin on axial slices 72-80..."
                  className="w-full h-24 p-2.5 rounded-lg bg-medical-card border border-medical-border text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-3 py-1.5 rounded-lg border border-medical-border text-medical-muted text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSaveDraft}
                disabled={draftSaving}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md"
              >
                {draftSaving ? 'Saving...' : 'Confirm Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SUBMIT FOR REVIEW MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-medical-base border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-medical-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Submit for Clinical Review</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-medical-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1">
                <span className="font-bold block">Human-in-the-Loop Protocol:</span>
                <p>
                  Submitting this correction marks it as <strong>Submitted for Review</strong>. A supervisory neuro-radiologist will review and approve the contour before it is admitted to the adaptive training dataset.
                </p>
              </div>

              <div>
                <label className="text-white font-semibold block mb-1">Radiologist Review Notes:</label>
                <textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g., Confirmed enhancing tumor boundary on T1ce; reduced necrotic over-segmentation on coronal views."
                  className="w-full h-24 p-2.5 rounded-lg bg-medical-card border border-medical-border text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-3 py-1.5 rounded-lg border border-medical-border text-medical-muted text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSubmitReview}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-medical-darkest font-bold text-xs shadow-md"
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
