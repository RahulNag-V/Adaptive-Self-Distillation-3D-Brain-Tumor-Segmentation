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
import { useVoiceContext } from '../context/VoiceControlContext';

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

  // Voice Controlled Display Layer Adjustments
  const [sliceRotation, setSliceRotation] = useState(0); // 0, 90, 180, 270 deg
  const [sliceBrightness, setSliceBrightness] = useState(100); // 40% - 220%
  const [sliceContrast, setSliceContrast] = useState(100); // 40% - 220%
  const [sliceZoom, setSliceZoom] = useState(1.0); // 0.4x - 5.0x
  const [slicePan, setSlicePan] = useState({ x: 0, y: 0 });
  const [threeCommand, setThreeCommand] = useState(null);

  // Subscribe to Voice Control Context
  const { registerViewerHandler } = useVoiceContext();

  useEffect(() => {
    const unregister = registerViewerHandler((action, cmdRecord) => {
      const { type } = action;

      // 1. Modality Switching
      if (type === 'SET_MODALITY') {
        setActiveMriModality(action.value);
      }

      // 2. Anatomical Plane / Layout
      else if (type === 'SET_LAYOUT') {
        setViewLayout(action.value);
        if (maximizedViewer) setMaximizedViewer(null);
      }

      // 3. Slice Navigation
      else if (type === 'STEP_SLICE') {
        const step = action.step || 1;
        const activePlane = maximizedViewer || (viewLayout !== 'quad' ? viewLayout : 'axial');
        if (activePlane === 'coronal') {
          setCoronalSlice((prev) => Math.max(0, Math.min(dimensions.coronal - 1, prev + step)));
        } else if (activePlane === 'sagittal') {
          setSagittalSlice((prev) => Math.max(0, Math.min(dimensions.sagittal - 1, prev + step)));
        } else {
          setAxialSlice((prev) => Math.max(0, Math.min(dimensions.axial - 1, prev + step)));
        }
      }

      else if (type === 'GOTO_SLICE') {
        const idx = action.index;
        const activePlane = maximizedViewer || (viewLayout !== 'quad' ? viewLayout : 'axial');
        if (activePlane === 'coronal') {
          setCoronalSlice(Math.max(0, Math.min(dimensions.coronal - 1, idx)));
        } else if (activePlane === 'sagittal') {
          setSagittalSlice(Math.max(0, Math.min(dimensions.sagittal - 1, idx)));
        } else {
          setAxialSlice(Math.max(0, Math.min(dimensions.axial - 1, idx)));
        }
      }

      else if (type === 'GOTO_CENTER_SLICE') {
        setAxialSlice(Math.floor(dimensions.axial / 2));
        setCoronalSlice(Math.floor(dimensions.coronal / 2));
        setSagittalSlice(Math.floor(dimensions.sagittal / 2));
      }

      else if (type === 'RESET_SLICE') {
        handleReset();
      }

      // 4. Rotation Controls
      else if (type === 'ROTATE') {
        // Apply 2D Slice rotation (90° increments or custom)
        setSliceRotation((prev) => {
          if (action.direction === '180') return (prev + 180) % 360;
          if (action.direction === 'left') return (prev - (action.degrees || 90) + 360) % 360;
          return (prev + (action.degrees || 90)) % 360;
        });
        // Dispatch to 3D Three.js camera
        setThreeCommand({
          type: 'ROTATE',
          direction: action.direction,
          degrees: action.degrees,
          id: Date.now(),
        });
      }

      else if (type === 'RESET_ROTATION') {
        setSliceRotation(0);
        setThreeCommand({ type: 'RESET_ROTATION', id: Date.now() });
      }

      else if (type === 'SET_CAMERA_ANGLE') {
        setThreeCommand({ type: 'SET_CAMERA_ANGLE', angle: action.angle, id: Date.now() });
      }

      // 5. Zoom & Pan Controls
      else if (type === 'ZOOM') {
        setSliceZoom((prev) => Math.max(0.4, Math.min(5.0, Number((prev * action.factor).toFixed(2)))));
        setThreeCommand({ type: 'ZOOM', factor: action.factor, id: Date.now() });
      }

      else if (type === 'SET_ZOOM') {
        setSliceZoom(Math.max(0.4, Math.min(5.0, action.percent / 100)));
      }

      else if (type === 'PAN') {
        setSlicePan((prev) => ({
          x: Math.max(-250, Math.min(250, prev.x + action.dx)),
          y: Math.max(-250, Math.min(250, prev.y + action.dy)),
        }));
      }

      else if (type === 'CENTER_VIEW') {
        setSlicePan({ x: 0, y: 0 });
        setSliceZoom(1.0);
        setThreeCommand({ type: 'CENTER_VIEW', id: Date.now() });
      }

      else if (type === 'RESET_VIEW') {
        handleReset();
        setSliceRotation(0);
        setSliceBrightness(100);
        setSliceContrast(100);
        setSliceZoom(1.0);
        setSlicePan({ x: 0, y: 0 });
        setThreeCommand({ type: 'RESET_VIEW', id: Date.now() });
      }

      // Fullscreen Maximize / Minimize
      else if (type === 'FULLSCREEN') {
        if (action.enabled) {
          const target = viewLayout === 'quad' ? 'axial' : viewLayout;
          setMaximizedViewer(target);
        } else {
          setMaximizedViewer(null);
        }
      }

      // 6. Segmentation & Overlays
      else if (type === 'SET_SEGMENTATION') {
        setLayers((prev) => ({ ...prev, tumor: action.enabled, overlay: action.enabled }));
      }

      else if (type === 'TOGGLE_SEGMENTATION') {
        setLayers((prev) => ({ ...prev, tumor: !prev.tumor, overlay: !prev.overlay }));
      }

      else if (type === 'SET_OPACITY') {
        setOpacity(Math.max(0.1, Math.min(1.0, action.value)));
      }

      else if (type === 'STEP_OPACITY') {
        setOpacity((prev) => Math.max(0.1, Math.min(1.0, Number((prev + action.delta).toFixed(2)))));
      }

      else if (type === 'RESET_OVERLAY') {
        setOpacity(0.85);
        setLayers((prev) => ({ ...prev, tumor: true, overlay: true }));
      }

      else if (type === 'SET_SEG_SOURCE') {
        setSegSource(action.value);
      }

      else if (type === 'COMPARE_MASKS') {
        handleOpenCompare();
      }

      else if (type === 'TOGGLE_SUBREGION') {
        toggleSubregion(action.key);
      }

      // 7. Image Display Adjustments
      else if (type === 'STEP_BRIGHTNESS') {
        setSliceBrightness((prev) => Math.max(40, Math.min(220, prev + action.delta)));
        setThreeCommand({ type: 'STEP_BRIGHTNESS', delta: action.delta, id: Date.now() });
      }

      else if (type === 'STEP_CONTRAST') {
        setSliceContrast((prev) => Math.max(40, Math.min(220, prev + action.delta)));
      }

      else if (type === 'RESET_ADJUSTMENTS') {
        setSliceBrightness(100);
        setSliceContrast(100);
      }

      else if (type === 'SHOW_COORDINATES') {
        // Display toast or brief visual HUD feedback
        console.log(`[VoiceControl] Coordinates: X=${sagittalSlice}, Y=${coronalSlice}, Z=${axialSlice}`);
      }
    });

    return unregister;
  }, [
    registerViewerHandler,
    dimensions,
    viewLayout,
    maximizedViewer,
    sagittalSlice,
    coronalSlice,
    axialSlice,
    toggleSubregion,
    handleOpenCompare,
  ]);

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
      {/* 1. TOP TOOLBAR: THREE LOGICAL GROUPS + PERSISTENT COMPACT LEGEND */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-medical-base border border-medical-border px-3.5 py-2 rounded-xl shadow-md shrink-0">
        {/* Left: Group 1 (Case) & Group 2 (Mask Source) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* GROUP 1: CASE */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-medical-teal animate-pulse" />
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
                    {p.id} {p.is_validation ? '(Val)' : '(Train)'}
                  </option>
                ))
              ) : (
                <option value="BraTS2021_01017">BraTS2021_01017 (Train)</option>
              )}
            </select>

            {/* Dataset split badge */}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-medical-card border border-medical-border text-medical-muted hidden sm:inline">
              BraTS 2021
            </span>

            {/* Annotation Lifecycle State Badge */}
            {annotationRecord && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${stateBadgeStyle(annotationRecord.status)} hidden md:inline`}>
                {annotationRecord.status} (v{annotationRecord.version || 1})
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-medical-border/80 hidden sm:block" />

          {/* GROUP 2: MASK SOURCE */}
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

        {/* Right: Persistent Compact Legend & Group 3 (Image & Editing) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* PERSISTENT COMPACT SEGMENTATION LEGEND */}
          <div className="hidden lg:flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-medical-card/80 border border-medical-border text-[11px] font-mono shadow-sm">
            <span className="text-medical-muted uppercase text-[9px] font-bold tracking-wider">Legend:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-slate-400" />
              <span className="text-slate-300">MRI</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#EAB308]" />
              <span className="text-yellow-400 font-medium">WT</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#F43F5E]" />
              <span className="text-rose-400 font-medium">TC</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#06B6D4]" />
              <span className="text-cyan-400 font-medium">ET</span>
            </div>
          </div>

          <div className="h-4 w-px bg-medical-border/80 hidden lg:block" />

          {/* GROUP 3: IMAGE & EDITING */}
          <div className="flex items-center gap-2">
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

            {/* Correction Mode Button */}
            <button
              onClick={() => setIsEditing(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-colors shadow-sm ${
                isEditing
                  ? 'bg-amber-400 text-medical-darkest border-amber-300'
                  : 'bg-medical-card text-amber-300 border-amber-400/50 hover:bg-amber-400/10'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Exit Editor' : 'Correct'}</span>
            </button>
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
                  { id: 1, name: 'TC (Core)', color: '#F43F5E', desc: 'Tumor Core / Necrotic' },
                  { id: 2, name: 'WT (Edema)', color: '#EAB308', desc: 'Peritumoral Edema' },
                  { id: 3, name: 'ET (Enhancing)', color: '#06B6D4', desc: 'Enhancing Active Tumor' },
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

      {/* 3. CLINICAL WORKSPACE: LEFT RAIL (PROJECTIONS) | CENTER (VIEWPORTS) | RIGHT (INSPECTOR) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        
        {/* LEFT RAIL: Navigation, Projection Modes & Slice Coordinates */}
        <div className="w-full lg:w-[210px] xl:w-[220px] shrink-0 bg-medical-base border border-medical-border rounded-xl p-3 flex flex-col justify-between space-y-3 overflow-y-auto">
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

          {/* Quick Actions */}
          <div className="pt-2 border-t border-medical-border/70 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-medical-muted block">
              Quick Actions
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-border text-white transition-all shadow-sm"
              >
                <RotateCcw className="w-3 h-3 text-medical-muted" />
                <span>Reset View</span>
              </button>
              <button
                onClick={() => setViewLayout('quad')}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-border text-white transition-all shadow-sm"
              >
                <Grid className="w-3 h-3 text-medical-teal" />
                <span>Quad MPR</span>
              </button>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive 3D & 2D Multi-Planar Reconstruction (Takes majority of space) */}
        <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden">
          {viewLayout === 'quad' ? (
            /* QUAD MPR VIEW: 2x2 Synchronized Grid (3D + Axial + Coronal + Sagittal) */
            <div className="grid grid-cols-1 sm:grid-cols-2 grid-rows-2 gap-2 h-full min-h-0">
              {/* Viewport 1: 3D Anatomical Brain & Segmented Tumor */}
              <div className="h-full min-h-0 overflow-hidden">
                <MedicalViewer
                  viewMode="3d"
                  patientId={selectedPatientId}
                  segSource={segSource}
                  layers={layers}
                  opacity={opacity}
                  subregions={subregions}
                  brainAppearance={brainAppearance}
                  onBrainAppearanceChange={setBrainAppearance}
                  onResetView={handleReset}
                  isMaximized={false}
                  onToggleMaximize={() => setMaximizedViewer('3d')}
                  viewerCommand={threeCommand}
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
                  onToggleSubregion={toggleSubregion}
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
                  rotation={sliceRotation}
                  brightness={sliceBrightness}
                  contrast={sliceContrast}
                  externalZoom={sliceZoom}
                  externalPan={slicePan}
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
                  onToggleSubregion={toggleSubregion}
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
                  rotation={sliceRotation}
                  brightness={sliceBrightness}
                  contrast={sliceContrast}
                  externalZoom={sliceZoom}
                  externalPan={slicePan}
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
                  onToggleSubregion={toggleSubregion}
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
                  rotation={sliceRotation}
                  brightness={sliceBrightness}
                  contrast={sliceContrast}
                  externalZoom={sliceZoom}
                  externalPan={slicePan}
                />
              </div>
            </div>
          ) : viewLayout === '3d' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <MedicalViewer
                viewMode="3d"
                patientId={selectedPatientId}
                segSource={segSource}
                layers={layers}
                opacity={opacity}
                subregions={subregions}
                brainAppearance={brainAppearance}
                onBrainAppearanceChange={setBrainAppearance}
                onResetView={handleReset}
                isMaximized={false}
                onToggleMaximize={() => setMaximizedViewer('3d')}
                viewerCommand={threeCommand}
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
                onToggleSubregion={toggleSubregion}
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
                rotation={sliceRotation}
                brightness={sliceBrightness}
                contrast={sliceContrast}
                externalZoom={sliceZoom}
                externalPan={slicePan}
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
                onToggleSubregion={toggleSubregion}
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
                rotation={sliceRotation}
                brightness={sliceBrightness}
                contrast={sliceContrast}
                externalZoom={sliceZoom}
                externalPan={slicePan}
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
                onToggleSubregion={toggleSubregion}
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
                rotation={sliceRotation}
                brightness={sliceBrightness}
                contrast={sliceContrast}
                externalZoom={sliceZoom}
                externalPan={slicePan}
              />
            </div>
          )}
        </div>

        {/* RIGHT INSPECTOR: Volumetrics & Layers (Predictable readable width, no text clipping) */}
        <div className="w-full lg:w-[290px] xl:w-[315px] 2xl:w-[330px] shrink-0 bg-medical-base border border-medical-border rounded-xl p-3 flex flex-col justify-between space-y-3 overflow-y-auto overflow-x-hidden">
          <div className="space-y-3">
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
              <div className="space-y-3.5">
                {/* Segmentation Overlays */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-medical-muted font-semibold block">
                    Segmentation Layers
                  </span>
                  {[
                    { key: 'wt', label: 'Whole Tumor (WT)', color: '#EAB308', desc: 'Labels {1, 2, 3}' },
                    { key: 'tc', label: 'Tumor Core (TC)', color: '#F43F5E', desc: 'Labels {1, 3}' },
                    { key: 'et', label: 'Enhancing Tumor (ET)', color: '#06B6D4', desc: 'Label {3}' },
                  ].map(({ key, label, color, desc }) => (
                    <label key={key} className="flex items-center justify-between p-2 rounded-lg bg-medical-card border border-medical-border text-xs cursor-pointer hover:bg-medical-surface transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <span className="text-white font-medium block truncate">{label}</span>
                          <span className="text-[10px] text-medical-muted font-mono">{desc}</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={subregions[key]}
                        onChange={() => toggleSubregion(key)}
                        className="accent-medical-teal rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>

                {/* MRI Background Toggle */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-medical-muted font-semibold block">
                    Anatomy Background
                  </span>
                  <label className="flex items-center justify-between p-2 rounded-lg bg-medical-card border border-medical-border text-xs cursor-pointer hover:bg-medical-surface transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-slate-400 shrink-0" />
                      <div>
                        <span className="text-white font-medium block">MRI Anatomy</span>
                        <span className="text-[10px] text-medical-muted font-mono">Atlas & Scan Background</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={layers.mri}
                      onChange={() => setLayers(prev => ({ ...prev, mri: !prev.mri }))}
                      className="accent-medical-teal rounded cursor-pointer shrink-0"
                    />
                  </label>
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-medical-card border border-medical-border text-xs">
                  <div className="flex items-center justify-between text-medical-muted font-mono">
                    <span>Segmentation Opacity</span>
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

                {/* Brain Appearance Selector */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-medical-card border border-medical-border text-xs">
                  <span className="text-[11px] text-medical-muted font-mono block">3D Brain Appearance:</span>
                  <select
                    value={brainAppearance}
                    onChange={(e) => setBrainAppearance(e.target.value)}
                    className="w-full bg-medical-base border border-medical-border text-white text-xs font-mono rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-medical-teal"
                  >
                    {BRAIN_APPEARANCE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} ({opt.badge})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Run Prediction / Pipeline Trigger */}
          <div className="pt-2 border-t border-medical-border/70">
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
                patientId={selectedPatientId}
                segSource={segSource}
                layers={layers}
                opacity={opacity}
                subregions={subregions}
                brainAppearance={brainAppearance}
                onBrainAppearanceChange={setBrainAppearance}
                onResetView={handleReset}
                isMaximized={true}
                onToggleMaximize={() => setMaximizedViewer(null)}
                viewerCommand={threeCommand}
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
                onToggleSubregion={toggleSubregion}
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
                rotation={sliceRotation}
                brightness={sliceBrightness}
                contrast={sliceContrast}
                externalZoom={sliceZoom}
                externalPan={slicePan}
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
                onToggleSubregion={toggleSubregion}
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
                rotation={sliceRotation}
                brightness={sliceBrightness}
                contrast={sliceContrast}
                externalZoom={sliceZoom}
                externalPan={slicePan}
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
                onToggleSubregion={toggleSubregion}
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
                rotation={sliceRotation}
                brightness={sliceBrightness}
                contrast={sliceContrast}
                externalZoom={sliceZoom}
                externalPan={slicePan}
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
