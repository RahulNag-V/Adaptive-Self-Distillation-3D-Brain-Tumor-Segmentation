import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Tag,
  ChevronDown,
  Check,
  Search,
  Compass,
  Crosshair,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import MedicalViewer, { BRAIN_APPEARANCE_OPTIONS, ANATOMICAL_REGIONS_LEGEND } from '../viewer/MedicalViewer';
import OrthogonalSliceViewer from '../viewer/OrthogonalSliceViewer';
import SliceCoordinatesPanel from '../viewer/SliceCoordinatesPanel';
import TumorBurdenPanel from '../viewer/TumorBurdenPanel';
import WorkspaceAccordions from '../components/workspace/WorkspaceAccordions';
import VolumetricsAnalysisPanel from '../components/workspace/VolumetricsAnalysisPanel';
import { cn } from '../lib/utils';
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
import { useVoice } from '../voice/VoiceContext';
import { prefersReducedMotion } from '../utils/motion';

const DEFAULT_DIMENSIONS = { axial: 155, coronal: 240, sagittal: 240 };

function getBottomViewsOrder(activeView) {
  if (activeView === '3d') return ['axial', 'coronal', 'sagittal'];
  if (activeView === 'axial') return ['3d', 'coronal', 'sagittal'];
  if (activeView === 'coronal') return ['3d', 'axial', 'sagittal'];
  if (activeView === 'sagittal') return ['3d', 'axial', 'coronal'];
  return ['axial', 'coronal', 'sagittal'];
}

function getViewGridArea(viewId, activeView) {
  if (activeView === 'quad') {
    switch (viewId) {
      case '3d': return '1 / 1 / 2 / 2';
      case 'axial': return '1 / 2 / 2 / 3';
      case 'coronal': return '2 / 1 / 3 / 2';
      case 'sagittal': return '2 / 2 / 3 / 3';
      default: return 'auto';
    }
  }

  // Active main view spans all 3 columns on row 1
  if (viewId === activeView) {
    return '1 / 1 / 2 / 4';
  }

  // Previews sit on row 2, in columns 1, 2, 3
  const bottomOrder = getBottomViewsOrder(activeView);
  const colIndex = bottomOrder.indexOf(viewId);
  return `2 / ${colIndex + 1} / 3 / ${colIndex + 2}`;
}

export default function ViewerPage({ currentResult, onNavigate }) {
  // Patient and Dataset State
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    currentResult?.session_id || 'BraTS2021_01017'
  );
  const [patientMeta, setPatientMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);

  // Dimensions derived from real metadata or fallback
  const dimensions = patientMeta?.dimensions || DEFAULT_DIMENSIONS;

  // View Layout Mode: '3d' (default) | 'axial' | 'coronal' | 'sagittal' | 'quad'
  const [viewLayout, setViewLayout] = useState('3d');

  // Full-Screen Maximized Mode: null | '3d' | 'axial' | 'coronal' | 'sagittal'
  const [maximizedViewer, setMaximizedViewer] = useState(null);

  // Shared Active Volumetrics & Analysis Tab across Normal and Fullscreen Views
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('burden');
  const fullscreenContainerRef = useRef(null);

  // Sync fullscreen state with document.body and native Fullscreen API
  useEffect(() => {
    const isFs = !!maximizedViewer;
    if (isFs) {
      document.body.classList.add('workspace-fullscreen-active');
    } else {
      document.body.classList.remove('workspace-fullscreen-active');
    }
    window.dispatchEvent(new CustomEvent('workspace-fullscreen-change', { detail: { isFullscreen: isFs } }));

    const handleNativeFullscreenChange = () => {
      if (!document.fullscreenElement && maximizedViewer) {
        setMaximizedViewer(null);
      }
    };
    document.addEventListener('fullscreenchange', handleNativeFullscreenChange);

    return () => {
      document.body.classList.remove('workspace-fullscreen-active');
      window.dispatchEvent(new CustomEvent('workspace-fullscreen-change', { detail: { isFullscreen: false } }));
      document.removeEventListener('fullscreenchange', handleNativeFullscreenChange);
    };
  }, [maximizedViewer]);

  // Inspector Sidebar Toggle (Allows true 100% canvas view when collapsed)
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Shared 3D Voxel Coordinate State (Single Source of Truth)
  const [axialSlice, setAxialSlice] = useState(78);
  const [coronalSlice, setCoronalSlice] = useState(120);
  const [sagittalSlice, setSagittalSlice] = useState(120);

  // Active Sequence (FLAIR, T1, T1CE, T2, or CT)
  const [activeMriModality, setActiveMriModality] = useState(
    currentResult?.is_ct ? 'ct' : 'flair'
  );

  // Available modalities: standard BraTS 4 sequences, plus CT if currentResult has CT flag
  const availableModalities = currentResult?.is_ct 
    ? ['flair', 't1', 't1ce', 't2', 'ct'] 
    : ['flair', 't1', 't1ce', 't2'];

  // Segmentation Source: 'prediction' | 'corrected' | 'ground_truth' | 'none'
  const [segSource, setSegSource] = useState(
    currentResult ? (currentResult.is_ct ? 'corrected' : 'prediction') : 'ground_truth'
  );
  // 90% Calibrated High-Confidence Threshold for AI Prediction (Default 0.90)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.90);
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
  const [opacity, setOpacity] = useState(0.58);
  const [brainAppearance, setBrainAppearance] = useState('regions');

  // Interactive Animated Dropdown States & Lifecycle Managers
  const [caseDropdownState, setCaseDropdownState] = useState('closed'); // 'closed' | 'open' | 'closing'
  const [caseSearch, setCaseSearch] = useState('');
  const [appearanceDropdownState, setAppearanceDropdownState] = useState('closed'); // 'closed' | 'open' | 'closing'
  const caseDropdownRef = useRef(null);
  const appearanceDropdownRef = useRef(null);

  const closeCaseDropdown = useCallback(() => {
    setCaseDropdownState((prev) => {
      if (prev === 'closed' || prev === 'closing') return prev;
      if (prefersReducedMotion()) return 'closed';
      setTimeout(() => setCaseDropdownState('closed'), 160);
      return 'closing';
    });
  }, []);

  const openCaseDropdown = useCallback(() => {
    setCaseDropdownState('open');
    setCaseSearch('');
  }, []);

  const toggleCaseDropdown = useCallback(() => {
    if (caseDropdownState === 'open') {
      closeCaseDropdown();
    } else {
      openCaseDropdown();
    }
  }, [caseDropdownState, closeCaseDropdown, openCaseDropdown]);

  const closeAppearanceDropdown = useCallback(() => {
    setAppearanceDropdownState((prev) => {
      if (prev === 'closed' || prev === 'closing') return prev;
      if (prefersReducedMotion()) return 'closed';
      setTimeout(() => setAppearanceDropdownState('closed'), 160);
      return 'closing';
    });
  }, []);

  const openAppearanceDropdown = useCallback(() => {
    setAppearanceDropdownState('open');
  }, []);

  const toggleAppearanceDropdown = useCallback(() => {
    if (appearanceDropdownState === 'open') {
      closeAppearanceDropdown();
    } else {
      openAppearanceDropdown();
    }
  }, [appearanceDropdownState, closeAppearanceDropdown, openAppearanceDropdown]);

  // Click-outside & Escape key listener for dropdown menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (caseDropdownRef.current && !caseDropdownRef.current.contains(e.target)) {
        closeCaseDropdown();
      }
      if (appearanceDropdownRef.current && !appearanceDropdownRef.current.contains(e.target)) {
        closeAppearanceDropdown();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (caseDropdownState === 'open') closeCaseDropdown();
        if (appearanceDropdownState === 'open') closeAppearanceDropdown();
      }
    };
    if (caseDropdownState === 'open' || appearanceDropdownState === 'open') {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [caseDropdownState, appearanceDropdownState, closeCaseDropdown, closeAppearanceDropdown]);

  // Sub-region filters
  const [subregions, setSubregions] = useState({
    wt: true,
    tc: true,
    et: true,
  });

  // Active right sidebar tab: 'burden' | 'coords' | 'layers'
  const [activeRightTab, setActiveRightTab] = useState('burden');

  // Voice Controlled Display Layer Adjustments
  const [sliceRotation, setSliceRotation] = useState(0); // 0, 90, 180, 270 deg
  const [sliceBrightness, setSliceBrightness] = useState(100); // 40% - 220%
  const [sliceContrast, setSliceContrast] = useState(100); // 40% - 220%
  const [sliceZoom, setSliceZoom] = useState(1.0); // 0.4x - 5.0x
  const [slicePan, setSlicePan] = useState({ x: 0, y: 0 });
  const [threeCommand, setThreeCommand] = useState(null);

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

  const toggleLayer = (layerKey) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const toggleSubregion = (key) => {
    setSubregions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Scoped 3D Viewport Reset (Restores 3D camera, orientation, zoom without disrupting workspace)
  const handle3dReset = useCallback(() => {
    setThreeCommand({ type: 'RESET_VIEW', id: Date.now() });
  }, []);

  // Workspace-wide Reset (Restores slices, zoom, brightness, contrast, and default 58% opacity)
  const handleReset = () => {
    setAxialSlice(Math.floor(dimensions.axial / 2));
    setCoronalSlice(Math.floor(dimensions.coronal / 2));
    setSagittalSlice(Math.floor(dimensions.sagittal / 2));
    setOpacity(0.58);
    setSliceRotation(0);
    setSliceBrightness(100);
    setSliceContrast(100);
    setSliceZoom(1.0);
    setSlicePan({ x: 0, y: 0 });
    setThreeCommand({ type: 'RESET_VIEW', id: Date.now() });
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

  // Voice Control Integration
  const { registerViewerHandler, updateViewerStatus } = useVoice();

  // Keep shared voice viewer status synchronized
  useEffect(() => {
    if (updateViewerStatus) {
      const planeLabel = viewLayout === 'quad' 
        ? 'Quad MPR' 
        : `${viewLayout.toUpperCase()} (${viewLayout === 'axial' ? 'Z' : viewLayout === 'coronal' ? 'Y' : 'X'})`;
      updateViewerStatus({
        selectedPatientId,
        activePlane: planeLabel,
        coordinates: { x: sagittalSlice, y: coronalSlice, z: axialSlice },
        dimensions,
        availablePatients: patients,
      });
    }
  }, [selectedPatientId, viewLayout, sagittalSlice, coronalSlice, axialSlice, dimensions, patients, updateViewerStatus]);

  useEffect(() => {
    const unregister = registerViewerHandler((action, cmdRecord) => {
      const { type } = action;

      // 1. Modality Switching & Cycling
      if (type === 'SET_MODALITY') {
        setActiveMriModality(action.value);
      } else if (type === 'CYCLE_MODALITY') {
        const MODALITIES = availableModalities;
        const nextMod = MODALITIES[(MODALITIES.indexOf(activeMriModality) + 1) % MODALITIES.length];
        setActiveMriModality(nextMod);
      }

      // 2. Anatomical Plane / Layout
      else if (type === 'SET_LAYOUT') {
        setViewLayout(action.value);
        if (maximizedViewer) setMaximizedViewer(null);
      }

      // 3. Multi-Axis and Single-Axis Coordinate Controls
      else if (type === 'SET_COORDINATES') {
        let hasInvalid = false;
        let invalidMsg = '';
        const newCoords = {};

        if (action.coordinates.x !== undefined) {
          if (action.coordinates.x < 0 || action.coordinates.x >= dimensions.sagittal) {
            hasInvalid = true;
            invalidMsg = `Sagittal (X) coordinate ${action.coordinates.x} is out of bounds (Valid range: 0 to ${dimensions.sagittal - 1}).`;
          } else {
            newCoords.x = action.coordinates.x;
          }
        }
        if (action.coordinates.y !== undefined) {
          if (action.coordinates.y < 0 || action.coordinates.y >= dimensions.coronal) {
            hasInvalid = true;
            invalidMsg = `Coronal (Y) coordinate ${action.coordinates.y} is out of bounds (Valid range: 0 to ${dimensions.coronal - 1}).`;
          } else {
            newCoords.y = action.coordinates.y;
          }
        }
        if (action.coordinates.z !== undefined) {
          if (action.coordinates.z < 0 || action.coordinates.z >= dimensions.axial) {
            hasInvalid = true;
            invalidMsg = `Axial (Z) coordinate ${action.coordinates.z} is out of bounds (Valid range: 0 to ${dimensions.axial - 1}).`;
          } else {
            newCoords.z = action.coordinates.z;
          }
        }

        if (hasInvalid) {
          if (updateViewerStatus) updateViewerStatus({ lastFeedback: invalidMsg });
        } else {
          if (newCoords.x !== undefined) setSagittalSlice(newCoords.x);
          if (newCoords.y !== undefined) setCoronalSlice(newCoords.y);
          if (newCoords.z !== undefined) setAxialSlice(newCoords.z);
          if (updateViewerStatus && action.feedback) {
            updateViewerStatus({ lastFeedback: action.feedback });
          }
        }
      }

      else if (type === 'SET_AXIS_COORDINATE') {
        const maxVal = action.axis === 'z' ? dimensions.axial : action.axis === 'y' ? dimensions.coronal : dimensions.sagittal;
        const planeName = action.axis === 'z' ? 'Axial (Z)' : action.axis === 'y' ? 'Coronal (Y)' : 'Sagittal (X)';
        if (action.value < 0 || action.value >= maxVal) {
          if (updateViewerStatus) {
            updateViewerStatus({ lastFeedback: `${planeName} coordinate ${action.value} is out of bounds (Valid range: 0 to ${maxVal - 1}).` });
          }
        } else {
          if (action.axis === 'z') setAxialSlice(action.value);
          else if (action.axis === 'y') setCoronalSlice(action.value);
          else if (action.axis === 'x') setSagittalSlice(action.value);
          if (updateViewerStatus && action.feedback) {
            updateViewerStatus({ lastFeedback: action.feedback });
          }
        }
      }

      // 4. Case Selection & Patient Dataset Controls
      else if (type === 'SELECT_CASE') {
        if (action.direction === 'next') {
          const curIdx = patients.findIndex((p) => p.id === selectedPatientId);
          const nextIdx = curIdx >= 0 ? (curIdx + 1) % patients.length : 0;
          if (patients[nextIdx]) {
            setSelectedPatientId(patients[nextIdx].id);
            if (updateViewerStatus) updateViewerStatus({ lastFeedback: `Selected case ${patients[nextIdx].id}` });
          }
        } else if (action.direction === 'prev') {
          const curIdx = patients.findIndex((p) => p.id === selectedPatientId);
          const prevIdx = curIdx > 0 ? curIdx - 1 : Math.max(0, patients.length - 1);
          if (patients[prevIdx]) {
            setSelectedPatientId(patients[prevIdx].id);
            if (updateViewerStatus) updateViewerStatus({ lastFeedback: `Selected case ${patients[prevIdx].id}` });
          }
        } else if (action.direction === 'current') {
          if (updateViewerStatus) updateViewerStatus({ lastFeedback: `Current case is ${selectedPatientId}` });
        } else if (action.query) {
          const q = String(action.query).toLowerCase().replace(/[^a-z0-9]/g, '');
          const exact = patients.find((p) => {
            const pid = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
            return pid === q || pid.endsWith(q) || pid === `brats2021${q}`;
          });
          if (exact) {
            setSelectedPatientId(exact.id);
            if (updateViewerStatus) updateViewerStatus({ lastFeedback: `Loading case ${exact.id}.` });
          } else {
            const partials = patients.filter((p) => {
              const pid = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
              return pid.includes(q);
            });
            if (partials.length > 1) {
              const candidateList = partials.slice(0, 3).map((c) => c.id).join(', ');
              if (updateViewerStatus) {
                updateViewerStatus({ lastFeedback: `Multiple cases match "${action.query}": ${candidateList}. Please specify exact ID.` });
              }
            } else {
              if (updateViewerStatus) {
                updateViewerStatus({ lastFeedback: "I couldn't find that patient in the available dataset." });
              }
            }
          }
        }
      }

      // 5. Slice Navigation
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

      // 6. Rotation Controls
      else if (type === 'ROTATE' || type === 'ROTATE_ONCE') {
        setSliceRotation((prev) => {
          if (action.direction === '180') return (prev + 180) % 360;
          if (action.direction === 'left') return (prev - (action.degrees || 90) + 360) % 360;
          return (prev + (action.degrees || 90)) % 360;
        });
        setThreeCommand({
          type: 'ROTATE_ONCE',
          direction: action.direction,
          degrees: action.degrees || 15,
          id: Date.now(),
        });
      }

      else if (type === 'ROTATE_VERTICAL') {
        setThreeCommand({
          type: 'ROTATE_VERTICAL',
          direction: action.direction || 'up',
          degrees: action.degrees || 15,
          id: Date.now(),
        });
      }

      else if (type === 'START_CONTINUOUS_ROTATION') {
        setThreeCommand({
          type: 'START_CONTINUOUS_ROTATION',
          direction: action.direction || 'right',
          id: Date.now(),
        });
      }

      else if (type === 'STOP_ROTATION') {
        setThreeCommand({
          type: 'STOP_ROTATION',
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

      // 7. 3D Mesh, Layers & Appearance
      else if (type === 'TOGGLE_MESH') {
        setLayers((prev) => ({ ...prev, mri: action.visible }));
      }

      else if (type === 'SET_BRAIN_APPEARANCE') {
        const APPEARANCES = ['regions', 'natural', 'contrast', 'original'];
        let targetMode = action.mode;
        if (action.mode === 'cycle') {
          const curIdx = APPEARANCES.indexOf(brainAppearance);
          const nextIdx = action.direction === 'prev'
            ? (curIdx <= 0 ? APPEARANCES.length - 1 : curIdx - 1)
            : (curIdx >= 0 ? (curIdx + 1) % APPEARANCES.length : 0);
          targetMode = APPEARANCES[nextIdx];
        }
        setBrainAppearance(targetMode);
        setThreeCommand({ type: 'SET_BRAIN_APPEARANCE', mode: targetMode, id: Date.now() });
      }

      else if (type === 'SHOW_LAYERS_PANEL') {
        setActiveRightTab('layers');
        setInspectorOpen(true);
      }

      else if (type === 'HIDE_LAYERS_PANEL') {
        setActiveRightTab('burden');
      }

      else if (type === 'SHOW_VOLUMETRICS_PANEL') {
        setActiveRightTab('burden');
        setInspectorOpen(true);
      }

      else if (type === 'SHOW_LAYERS_AND_VOLUMETRICS') {
        setActiveRightTab('layers');
        setInspectorOpen(true);
      }

      else if (type === 'LIST_PATIENTS') {
        const patientNames = patients.slice(0, 5).map((p) => p.id).join(', ');
        if (updateViewerStatus) {
          updateViewerStatus({ lastFeedback: `Available patients include ${patientNames}, and others in the cohort.` });
        }
      }

      else if (type === 'UNSUPPORTED_FEATURE' || type === 'SET_RENDER_MODE') {
        if (updateViewerStatus && (action.message || action.label)) {
          updateViewerStatus({ lastFeedback: action.message || action.label });
        }
      }

      // 8. Zoom & Pan Controls
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
      }

      // Fullscreen Maximize / Minimize
      else if (type === 'FULLSCREEN') {
        if (action.enabled) {
          const target = action.target === '3d' ? '3d' : (viewLayout === 'quad' ? 'axial' : viewLayout);
          setMaximizedViewer(target);
        } else {
          setMaximizedViewer(null);
        }
      }

      // 9. Segmentation & Overlays
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
        setOpacity(0.58);
        setLayers((prev) => ({ ...prev, tumor: true, overlay: true }));
      }

      else if (type === 'SET_SEG_SOURCE') {
        setSegSource(action.value);
      }

      else if (type === 'COMPARE_MASKS') {
        handleOpenCompare();
      }

      else if (type === 'TOGGLE_SUBREGION') {
        if (action.enabled !== undefined) {
          setSubregions((prev) => ({ ...prev, [action.key]: action.enabled }));
        } else {
          toggleSubregion(action.key);
        }
      }

      // 10. Image Display Adjustments
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
        setActiveRightTab('coords');
        setInspectorOpen(true);
        if (updateViewerStatus) {
          updateViewerStatus({
            lastFeedback: `Voxel Coordinates: X=${sagittalSlice}, Y=${coronalSlice}, Z=${axialSlice}`,
          });
        }
      }
    });

    return unregister;
  }, [
    registerViewerHandler,
    updateViewerStatus,
    dimensions,
    viewLayout,
    maximizedViewer,
    sagittalSlice,
    coronalSlice,
    axialSlice,
    selectedPatientId,
    patients,
    activeMriModality,
    availableModalities,
    toggleSubregion,
    handleOpenCompare,
  ]);

  const dimensionsStr = `${dimensions.sagittal} × ${dimensions.coronal} × ${dimensions.axial} voxels`;

  // Color mappings for Annotation State using calibrated tokens
  const stateBadgeStyle = (status) => {
    switch (status) {
      case 'Prediction Generated':
        return 'bg-[#EBF8F6] text-[#103B5C] border-[#98D9CE]/60';
      case 'Correction In Progress':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'Draft Saved':
        return 'bg-purple-50 text-purple-900 border-purple-300';
      case 'Submitted for Review':
        return 'bg-[#F8FCFB] text-[#103B5C] border-[#98D9CE]/60';
      case 'Approved for Training':
        return 'bg-teal-50 text-teal-900 border-teal-300';
      case 'Rejected':
        return 'bg-rose-50 text-rose-900 border-rose-300';
      case 'Included in Training Dataset':
        return 'bg-[#EBF8F6] text-[#103B5C] border-[#98D9CE]/60';
      default:
        return 'bg-[#F8FCFB] text-[#103B5C] border-[#98D9CE]/60';
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-transparent text-[#111827]">
      {/* MAIN WORKSPACE LAYOUT — Two Columns (Desktop: ~72% Left, ~28% Right) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2.5 min-h-0 overflow-hidden p-2 sm:p-2.5 lg:p-3">
        
        {/* LEFT WORKSPACE (~72% width): Large Main Viewer + 3 Bottom Previews */}
        <div className="w-full lg:w-[72%] xl:w-[73%] flex flex-col min-h-0 h-full overflow-hidden self-stretch">
          <div 
            className={`w-full h-full min-h-0 grid gap-2.5 transition-all duration-200 ${
              viewLayout === 'quad' 
                ? 'grid-cols-1 sm:grid-cols-2 grid-rows-2' 
                : 'grid-cols-3'
            }`}
            style={
              viewLayout === 'quad'
                ? undefined
                : {
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gridTemplateRows: '1fr minmax(180px, 215px)',
                  }
            }
          >
            {/* View 1: 3D Brain Model */}
            {(() => {
              const isMain = viewLayout === '3d' || viewLayout === 'quad';
              return (
                <div
                  key="3d"
                  style={{
                    gridArea: getViewGridArea('3d', viewLayout),
                    transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onClick={!isMain ? () => setViewLayout('3d') : undefined}
                  className={cn(
                    "relative flex flex-col min-h-0 rounded-xl overflow-hidden border transition-all duration-200 select-none bg-[#060A12] medical-viewer-grid",
                    isMain
                      ? "border-[#111111] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                      : "border-[#98D9CE]/60 hover:border-[#103B5C] hover:shadow-lg cursor-pointer group hover:-translate-y-0.5"
                  )}
                  title={!isMain ? "Click to promote 3D Brain Model to Main Workspace" : undefined}
                >
                  {/* Header bar */}
                  <div className={cn(
                    "px-2.5 flex items-center justify-between shrink-0 z-20 backdrop-blur-sm border-b select-none",
                    isMain
                      ? "h-8 bg-[#101722]/95 border-[#1C2636]"
                      : "h-7 bg-[#101722]/90 border-[#1C2636] group-hover:bg-[#151E2B]"
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#4C8DFF] animate-pulse shrink-0" />
                      <span className="font-mono font-bold text-xs text-[#F4F7FC] truncate">
                        {isMain ? '3D Brain Model • Atlas Reference & Tumor Mesh' : '3D Brain Model'}
                      </span>
                      {isMain && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono hidden sm:inline">
                          {selectedPatientId} • {segSource === 'ground_truth' ? 'Ground Truth' : 'UNETR Pred'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isMain ? (
                        <div className="flex items-center gap-1 text-[#98D9CE] group-hover:text-white transition-colors">
                          <span className="text-[9px] font-mono uppercase tracking-wider hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
                            Swap
                          </span>
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handle3dReset}
                            className="p-1 rounded text-[#8496AC] hover:text-[#F4F7FC] hover:bg-[#151E2B] transition-colors cursor-pointer"
                            title="Reset Camera View"
                            aria-label="Reset Camera View"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMaximizedViewer('3d')}
                            className="p-1 rounded text-[#8496AC] hover:text-[#F4F7FC] hover:bg-[#151E2B] transition-colors cursor-pointer"
                            title="Maximize Whole Screen"
                            aria-label="Maximize 3D View"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Viewer content */}
                  <div className={cn("relative flex-1 w-full min-h-0", !isMain && "pointer-events-none")}>
                    <MedicalViewer
                      viewMode="3d"
                      patientId={selectedPatientId}
                      segSource={segSource}
                      confidenceThreshold={confidenceThreshold}
                      layers={layers}
                      opacity={opacity}
                      subregions={subregions}
                      brainAppearance={brainAppearance}
                      onBrainAppearanceChange={setBrainAppearance}
                      isMaximized={false}
                      onToggleMaximize={() => setMaximizedViewer('3d')}
                      viewerCommand={threeCommand}
                      isCompactPreview={!isMain}
                    />
                  </div>
                </div>
              );
            })()}

            {/* View 2: Axial MRI */}
            {(() => {
              const isMain = viewLayout === 'axial' || viewLayout === 'quad';
              return (
                <div
                  key="axial"
                  style={{
                    gridArea: getViewGridArea('axial', viewLayout),
                    transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onClick={!isMain ? () => setViewLayout('axial') : undefined}
                  className={cn(
                    "relative flex flex-col min-h-0 rounded-xl overflow-hidden border transition-all duration-200 select-none bg-[#060A12] medical-viewer-grid",
                    isMain
                      ? "border-[#111111] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                      : "border-[#98D9CE]/60 hover:border-[#103B5C] hover:shadow-lg cursor-pointer group hover:-translate-y-0.5"
                  )}
                  title={!isMain ? "Click to promote Axial MRI to Main Workspace" : undefined}
                >
                  {/* Header bar */}
                  <div className={cn(
                    "px-2.5 flex items-center justify-between shrink-0 z-20 backdrop-blur-sm border-b select-none",
                    isMain
                      ? "h-8 bg-[#101722]/95 border-[#1C2636]"
                      : "h-7 bg-[#101722]/90 border-[#1C2636] group-hover:bg-[#151E2B]"
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#35B982] animate-pulse shrink-0" />
                      <span className="font-mono font-bold text-xs text-[#F4F7FC] truncate">
                        {isMain ? `Axial MRI (Z) • Transverse Slice ${axialSlice + 1} / ${dimensions.axial}` : 'Axial MRI (Z)'}
                      </span>
                      {!isMain && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono">
                          {axialSlice + 1}/{dimensions.axial}
                        </span>
                      )}
                      {isMain && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono uppercase hidden sm:inline">
                          MOD: {activeMriModality}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isMain ? (
                        <div className="flex items-center gap-1 text-[#98D9CE] group-hover:text-white transition-colors">
                          <span className="text-[9px] font-mono uppercase tracking-wider hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
                            Swap
                          </span>
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setMaximizedViewer('axial')}
                            className="p-1 rounded text-[#8496AC] hover:text-[#F4F7FC] hover:bg-[#151E2B] transition-colors cursor-pointer"
                            title="Maximize Whole Screen"
                            aria-label="Maximize Axial View"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Viewer content */}
                  <div className={cn("relative flex-1 w-full min-h-0", !isMain && "pointer-events-none")}>
                    <OrthogonalSliceViewer
                      plane="axial"
                      title="Axial (Z)"
                      patientId={selectedPatientId}
                      sliceIndex={axialSlice}
                      totalSlices={dimensions.axial}
                      modality={activeMriModality}
                      segSource={segSource}
                      confidenceThreshold={confidenceThreshold}
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
                      showControls={isMain}
                    />
                  </div>
                </div>
              );
            })()}

            {/* View 3: Coronal MRI */}
            {(() => {
              const isMain = viewLayout === 'coronal' || viewLayout === 'quad';
              return (
                <div
                  key="coronal"
                  style={{
                    gridArea: getViewGridArea('coronal', viewLayout),
                    transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onClick={!isMain ? () => setViewLayout('coronal') : undefined}
                  className={cn(
                    "relative flex flex-col min-h-0 rounded-xl overflow-hidden border transition-all duration-200 select-none bg-[#060A12] medical-viewer-grid",
                    isMain
                      ? "border-[#111111] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                      : "border-[#98D9CE]/60 hover:border-[#103B5C] hover:shadow-lg cursor-pointer group hover:-translate-y-0.5"
                  )}
                  title={!isMain ? "Click to promote Coronal MRI to Main Workspace" : undefined}
                >
                  {/* Header bar */}
                  <div className={cn(
                    "px-2.5 flex items-center justify-between shrink-0 z-20 backdrop-blur-sm border-b select-none",
                    isMain
                      ? "h-8 bg-[#101722]/95 border-[#1C2636]"
                      : "h-7 bg-[#101722]/90 border-[#1C2636] group-hover:bg-[#151E2B]"
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#35C6B0] animate-pulse shrink-0" />
                      <span className="font-mono font-bold text-xs text-[#F4F7FC] truncate">
                        {isMain ? `Coronal MRI (Y) • Frontal Slice ${coronalSlice + 1} / ${dimensions.coronal}` : 'Coronal MRI (Y)'}
                      </span>
                      {!isMain && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono">
                          {coronalSlice + 1}/{dimensions.coronal}
                        </span>
                      )}
                      {isMain && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono uppercase hidden sm:inline">
                          MOD: {activeMriModality}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isMain ? (
                        <div className="flex items-center gap-1 text-[#98D9CE] group-hover:text-white transition-colors">
                          <span className="text-[9px] font-mono uppercase tracking-wider hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
                            Swap
                          </span>
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setMaximizedViewer('coronal')}
                            className="p-1 rounded text-[#8496AC] hover:text-[#F4F7FC] hover:bg-[#151E2B] transition-colors cursor-pointer"
                            title="Maximize Whole Screen"
                            aria-label="Maximize Coronal View"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Viewer content */}
                  <div className={cn("relative flex-1 w-full min-h-0", !isMain && "pointer-events-none")}>
                    <OrthogonalSliceViewer
                      plane="coronal"
                      title="Coronal (Y)"
                      patientId={selectedPatientId}
                      sliceIndex={coronalSlice}
                      totalSlices={dimensions.coronal}
                      modality={activeMriModality}
                      segSource={segSource}
                      confidenceThreshold={confidenceThreshold}
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
                      showControls={isMain}
                    />
                  </div>
                </div>
              );
            })()}

            {/* View 4: Sagittal MRI */}
            {(() => {
              const isMain = viewLayout === 'sagittal' || viewLayout === 'quad';
              return (
                <div
                  key="sagittal"
                  style={{
                    gridArea: getViewGridArea('sagittal', viewLayout),
                    transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onClick={!isMain ? () => setViewLayout('sagittal') : undefined}
                  className={cn(
                    "relative flex flex-col min-h-0 rounded-xl overflow-hidden border transition-all duration-200 select-none bg-[#060A12] medical-viewer-grid",
                    isMain
                      ? "border-[#111111] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                      : "border-[#98D9CE]/60 hover:border-[#103B5C] hover:shadow-lg cursor-pointer group hover:-translate-y-0.5"
                  )}
                  title={!isMain ? "Click to promote Sagittal MRI to Main Workspace" : undefined}
                >
                  {/* Header bar */}
                  <div className={cn(
                    "px-2.5 flex items-center justify-between shrink-0 z-20 backdrop-blur-sm border-b select-none",
                    isMain
                      ? "h-8 bg-[#101722]/95 border-[#1C2636]"
                      : "h-7 bg-[#101722]/90 border-[#1C2636] group-hover:bg-[#151E2B]"
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#4C8DFF] animate-pulse shrink-0" />
                      <span className="font-mono font-bold text-xs text-[#F4F7FC] truncate">
                        {isMain ? `Sagittal MRI (X) • Lateral Slice ${sagittalSlice + 1} / ${dimensions.sagittal}` : 'Sagittal MRI (X)'}
                      </span>
                      {!isMain && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono">
                          {sagittalSlice + 1}/{dimensions.sagittal}
                        </span>
                      )}
                      {isMain && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono uppercase hidden sm:inline">
                          MOD: {activeMriModality}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isMain ? (
                        <div className="flex items-center gap-1 text-[#98D9CE] group-hover:text-white transition-colors">
                          <span className="text-[9px] font-mono uppercase tracking-wider hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
                            Swap
                          </span>
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setMaximizedViewer('sagittal')}
                            className="p-1 rounded text-[#8496AC] hover:text-[#F4F7FC] hover:bg-[#151E2B] transition-colors cursor-pointer"
                            title="Maximize Whole Screen"
                            aria-label="Maximize Sagittal View"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Viewer content */}
                  <div className={cn("relative flex-1 w-full min-h-0", !isMain && "pointer-events-none")}>
                    <OrthogonalSliceViewer
                      plane="sagittal"
                      title="Sagittal (X)"
                      patientId={selectedPatientId}
                      sliceIndex={sagittalSlice}
                      totalSlices={dimensions.sagittal}
                      modality={activeMriModality}
                      segSource={segSource}
                      confidenceThreshold={confidenceThreshold}
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
                      showControls={isMain}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* RIGHT WORKSPACE (~28% width): Accordion 1 & Accordion 2 */}
        <div className="w-full lg:w-[28%] xl:w-[27%] flex flex-col min-h-0 h-full overflow-y-auto no-scrollbar gap-2.5 shrink-0">
          <WorkspaceAccordions
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
            currentResult={currentResult}
            annotationRecord={annotationRecord}
            activeMriModality={activeMriModality}
            onSelectModality={setActiveMriModality}
            availableModalities={availableModalities}
            activeView={viewLayout}
            onSelectView={setViewLayout}
            segSource={segSource}
            onSelectSegSource={setSegSource}
            confidenceThreshold={confidenceThreshold}
            onConfidenceChange={setConfidenceThreshold}
            subregions={subregions}
            onToggleSubregion={toggleSubregion}
            layers={layers}
            onToggleLayer={toggleLayer}
            opacity={opacity}
            onChangeOpacity={setOpacity}
            brainAppearance={brainAppearance}
            onChangeBrainAppearance={setBrainAppearance}
            isEditing={isEditing}
            onToggleEditing={() => setIsEditing((prev) => !prev)}
            onReset={handleReset}
            brushMode={brushMode}
            setBrushMode={setBrushMode}
            activeLabel={activeLabel}
            setActiveLabel={setActiveLabel}
            brushRadius={brushRadius}
            setBrushRadius={setBrushRadius}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClearEdits={handleClearEdits}
            onOpenCompare={handleOpenCompare}
            onOpenDraftModal={() => setShowDraftModal(true)}
            onOpenSubmitModal={() => setShowSubmitModal(true)}
            onRunPrediction={handleRunPrediction}
            predicting={predicting}
            axialSlice={axialSlice}
            coronalSlice={coronalSlice}
            sagittalSlice={sagittalSlice}
            dimensions={dimensions}
            onAxialChange={setAxialSlice}
            onCoronalChange={setCoronalSlice}
            onSagittalChange={setSagittalSlice}
            activeAnalysisTab={activeAnalysisTab}
            onActiveAnalysisTabChange={setActiveAnalysisTab}
          />
        </div>
      </div>

      {/* FULLSCREEN MAXIMIZED MODAL OVERLAY (With Volumetrics & Analysis Sidebar) */}
      {maximizedViewer && (
        <div 
          ref={fullscreenContainerRef}
          className="fixed inset-0 z-[100] bg-[#060A12] flex flex-col p-2.5 sm:p-3 overflow-hidden select-none animate-fadeIn"
        >
          {/* Fullscreen Top HUD */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101722]/95 border border-[#1C2636] px-4 py-2 rounded-xl shadow-medical-lg backdrop-blur-md mb-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#399DBA] animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F4F7FC]">
                {maximizedViewer === '3d' ? '3D BRAIN MODEL' : `${maximizedViewer.toUpperCase()} MRI VIEW`} • CASE: {selectedPatientId}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono uppercase hidden sm:inline">
                MOD: {activeMriModality}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#151E2B] border border-[#243348] text-[#8496AC] font-mono uppercase hidden md:inline">
                MASK: {segSource.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Exit Fullscreen */}
              <button
                type="button"
                onClick={() => setMaximizedViewer(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151E2B] hover:bg-[#1C2636] border border-[#1C2636] text-[#F4F7FC] text-xs font-mono font-semibold transition-colors cursor-pointer"
                title="Restore Normal View (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5 text-[#399DBA]" />
                <span>Exit Fullscreen (Esc)</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body Area: Main Viewer (left/fill) + Volumetrics (right) */}
          <div className="flex-1 w-full h-full min-h-0 flex gap-2.5 overflow-hidden">
            {/* Main Fullscreen Viewer */}
            <div className="flex-1 h-full min-w-0 relative rounded-xl overflow-hidden border border-[#1C2636] shadow-medical-lg bg-[#060A12] medical-viewer-grid flex flex-col">
              {maximizedViewer === '3d' && (
                <MedicalViewer
                  viewMode="3d"
                  patientId={selectedPatientId}
                  segSource={segSource}
                  confidenceThreshold={confidenceThreshold}
                  layers={layers}
                  opacity={opacity}
                  subregions={subregions}
                  brainAppearance={brainAppearance}
                  onBrainAppearanceChange={setBrainAppearance}
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
                  confidenceThreshold={confidenceThreshold}
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
                  showControls={true}
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
                  confidenceThreshold={confidenceThreshold}
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
                  showControls={true}
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
                  confidenceThreshold={confidenceThreshold}
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
                  showControls={true}
                />
              )}
            </div>

            {/* Right Side: Volumetrics & Analysis in Fullscreen (Always Visible - No Hide Option) */}
            <div className="w-[340px] sm:w-[380px] lg:w-[410px] xl:w-[430px] h-full flex flex-col shrink-0 overflow-hidden animate-fadeIn">
              <VolumetricsAnalysisPanel
                patientId={selectedPatientId}
                segSource={segSource}
                confidenceThreshold={confidenceThreshold}
                activeMriModality={activeMriModality}
                axialSlice={axialSlice}
                coronalSlice={coronalSlice}
                sagittalSlice={sagittalSlice}
                dimensions={dimensions}
                onAxialChange={setAxialSlice}
                onCoronalChange={setCoronalSlice}
                onSagittalChange={setSagittalSlice}
                subregions={subregions}
                onToggleSubregion={toggleSubregion}
                layers={layers}
                onToggleLayer={toggleLayer}
                opacity={opacity}
                onChangeOpacity={setOpacity}
                activeTab={activeAnalysisTab}
                onTabChange={setActiveAnalysisTab}
                isOpen={true}
                isFullscreen={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: MASK COMPARISON MODAL (AI Prediction vs Corrected) */}
      {showCompareModal && compareData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#98D9CE]/60 rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-4 animate-modal-enter">
            <div className="flex items-center justify-between border-b border-[#98D9CE]/60 pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-[#103B5C]" />
                <h3 className="font-bold text-[#103B5C] text-base">Mask Comparison Analysis</h3>
              </div>
              <button 
                onClick={() => setShowCompareModal(false)}
                className="text-[#6B7280] hover:text-[#103B5C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#475569]">
                Quantifying agreement between original UNETR model prediction and human clinical correction:
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-[#F8FCFB] border border-[#98D9CE]/60">
                  <span className="text-[#6B7280] block text-[10px] font-bold">Overall Dice Agreement</span>
                  <span className="text-lg font-bold text-[#103B5C]">
                    {compareData.dice_agreement !== undefined ? (compareData.dice_agreement * 100).toFixed(1) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FCFB] border border-[#98D9CE]/60">
                  <span className="text-[#6B7280] block text-[10px] font-bold">Modified Voxels</span>
                  <span className="text-lg font-bold text-[#111827]">
                    {compareData.voxels_changed || 0}
                  </span>
                </div>
              </div>

              {compareData.volume_comparison && (
                <div className="p-3 rounded-lg bg-[#F8FCFB] border border-[#98D9CE]/60 space-y-2">
                  <span className="font-bold text-[#103B5C] block">Volume Deltas:</span>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-[#B45309] block font-bold">WT (Whole Tumor)</span>
                      <span className="text-[#6B7280]">Pred: {compareData.volume_comparison.WT?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-[#111827] block font-bold">Corr: {compareData.volume_comparison.WT?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                    <div>
                      <span className="text-[#DC2626] block font-bold">TC (Core)</span>
                      <span className="text-[#6B7280]">Pred: {compareData.volume_comparison.TC?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-[#111827] block font-bold">Corr: {compareData.volume_comparison.TC?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                    <div>
                      <span className="text-[#0891B2] block font-bold">ET (Enhancing)</span>
                      <span className="text-[#6B7280]">Pred: {compareData.volume_comparison.ET?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-[#111827] block font-bold">Corr: {compareData.volume_comparison.ET?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 rounded-lg bg-[#399DBA] hover:bg-[#103B5C] hover:opacity-90 text-white font-bold text-xs shadow-sm"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SAVE DRAFT MODAL */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#98D9CE]/60 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 animate-modal-enter">
            <div className="flex items-center justify-between border-b border-[#98D9CE]/60 pb-3">
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5 text-[#103B5C]" />
                <h3 className="font-bold text-[#103B5C] text-base">Save Annotation Draft</h3>
              </div>
              <button onClick={() => setShowDraftModal(false)} className="text-[#6B7280] hover:text-[#103B5C]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#475569]">
                Save your in-progress voxel corrections without submitting to the training queue. You can resume editing later.
              </p>
              <div>
                <label className="text-[#103B5C] font-bold block mb-1">Clinical Notes (Optional):</label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="e.g., Extended enhancing tumor margin on axial slices 72-80..."
                  className="w-full h-24 p-2.5 rounded-lg bg-[#F8FCFB] border border-[#98D9CE]/60 text-[#111827] text-xs font-mono focus:outline-none focus:border-[#399DBA]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#98D9CE]/60 text-[#475569] text-xs hover:bg-[#F8FCFB]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSaveDraft}
                disabled={draftSaving}
                className="px-4 py-1.5 rounded-lg bg-[#399DBA] hover:bg-[#103B5C] hover:opacity-90 text-white font-bold text-xs shadow-sm"
              >
                {draftSaving ? 'Saving...' : 'Confirm Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SUBMIT FOR REVIEW MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#98D9CE]/60 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 animate-modal-enter">
            <div className="flex items-center justify-between border-b border-[#98D9CE]/60 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#103B5C]" />
                <h3 className="font-bold text-[#103B5C] text-base">Submit for Clinical Review</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-[#6B7280] hover:text-[#103B5C]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#EBF8F6] border border-[#98D9CE]/60 text-[#103B5C] space-y-1">
                <span className="font-bold block">Human-in-the-Loop Protocol:</span>
                <p className="text-[11px] text-[#103B5C]">
                  Submitting this correction marks it as <strong>Submitted for Review</strong>. A supervisory neuro-radiologist will review and approve the contour before it is admitted to the adaptive training dataset.
                </p>
              </div>

              <div>
                <label className="text-[#103B5C] font-bold block mb-1">Radiologist Review Notes:</label>
                <textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g., Confirmed enhancing tumor boundary on T1ce; reduced necrotic over-segmentation on coronal views."
                  className="w-full h-24 p-2.5 rounded-lg bg-[#F8FCFB] border border-[#98D9CE]/60 text-[#111827] text-xs font-mono focus:outline-none focus:border-[#399DBA]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#98D9CE]/60 text-[#475569] text-xs hover:bg-[#F8FCFB]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSubmitReview}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-[#399DBA] hover:bg-[#103B5C] hover:opacity-90 text-white font-bold text-xs shadow-sm"
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
