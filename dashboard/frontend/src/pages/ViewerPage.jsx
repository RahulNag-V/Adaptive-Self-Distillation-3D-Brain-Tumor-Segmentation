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
  Search
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
import { useGestureContext } from '../context/GestureControlContext';

export default function ViewerPage({ currentResult, onNavigate }) {
  // Patient and Dataset State
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    currentResult?.session_id || 'BraTS2021_01017'
  );
  const [patientMeta, setPatientMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);

  // Dimensions derived from real metadata or fallback
  const dimensions = patientMeta?.dimensions || { axial: 155, coronal: 240, sagittal: 240 };

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

  // Interactive Animated Dropdown States & Refs
  const [isCaseDropdownOpen, setIsCaseDropdownOpen] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const [isAppearanceDropdownOpen, setIsAppearanceDropdownOpen] = useState(false);
  const caseDropdownRef = useRef(null);
  const appearanceDropdownRef = useRef(null);

  // Click-outside listener for dropdown menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (caseDropdownRef.current && !caseDropdownRef.current.contains(e.target)) {
        setIsCaseDropdownOpen(false);
      }
      if (appearanceDropdownRef.current && !appearanceDropdownRef.current.contains(e.target)) {
        setIsAppearanceDropdownOpen(false);
      }
    };
    if (isCaseDropdownOpen || isAppearanceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCaseDropdownOpen, isAppearanceDropdownOpen]);

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

  // Voice Control Integration
  const { registerViewerHandler, updateViewerStatus } = useVoiceContext();
  
  // Touchless Hand Gesture Integration
  const { registerHandler: registerGestureHandler } = useGestureContext();

  useEffect(() => {
    if (!registerGestureHandler) return;
    const unregister = registerGestureHandler(({ type, gesture }) => {
      if (type === 'GESTURE_ACTION') {
        if (gesture === 'SWIPE_LEFT') {
          setAxialSlice((prev) => Math.max(0, prev - 5));
        } else if (gesture === 'SWIPE_RIGHT') {
          setAxialSlice((prev) => Math.min(dimensions.axial - 1, prev + 5));
        } else if (gesture === 'SWIPE_UP') {
          setAxialSlice((prev) => Math.min(dimensions.axial - 1, prev + 10));
        } else if (gesture === 'SWIPE_DOWN') {
          setAxialSlice((prev) => Math.max(0, prev - 10));
        } else if (gesture === 'FIST') {
          setAxialSlice(Math.floor(dimensions.axial / 2));
          setCoronalSlice(Math.floor(dimensions.coronal / 2));
          setSagittalSlice(Math.floor(dimensions.sagittal / 2));
        }
      }
    });
    return unregister;
  }, [registerGestureHandler, dimensions]);

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
        const MODALITIES = ['flair', 't1ce', 't1', 't2', 'ct'];
        const nextMod = MODALITIES[(MODALITIES.indexOf(activeMriModality) + 1) % MODALITIES.length];
        setActiveMriModality(nextMod);
      }

      // 2. Anatomical Plane / Layout
      else if (type === 'SET_LAYOUT') {
        setViewLayout(action.value);
        if (maximizedViewer) setMaximizedViewer(null);
      }

      // 3. Multi-Axis and Single-Axis Coordinate Controls (Sections 4 & 5)
      else if (type === 'SET_COORDINATES') {
        if (action.coordinates.x !== undefined) {
          setSagittalSlice(Math.max(0, Math.min(dimensions.sagittal - 1, action.coordinates.x)));
        }
        if (action.coordinates.y !== undefined) {
          setCoronalSlice(Math.max(0, Math.min(dimensions.coronal - 1, action.coordinates.y)));
        }
        if (action.coordinates.z !== undefined) {
          setAxialSlice(Math.max(0, Math.min(dimensions.axial - 1, action.coordinates.z)));
        }
        if (updateViewerStatus && action.feedback) {
          updateViewerStatus({ lastFeedback: action.feedback });
        }
      }

      else if (type === 'SET_AXIS_COORDINATE') {
        if (action.axis === 'z') {
          setAxialSlice(Math.max(0, Math.min(dimensions.axial - 1, action.value)));
        } else if (action.axis === 'y') {
          setCoronalSlice(Math.max(0, Math.min(dimensions.coronal - 1, action.value)));
        } else if (action.axis === 'x') {
          setSagittalSlice(Math.max(0, Math.min(dimensions.sagittal - 1, action.value)));
        }
        if (updateViewerStatus && action.feedback) {
          updateViewerStatus({ lastFeedback: action.feedback });
        }
      }

      // 4. Case Selection & Patient Dataset Controls (Section 6)
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
          const found = patients.find((p) => {
            const pid = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
            return pid === q || pid.endsWith(q) || pid.includes(q);
          });
          if (found) {
            setSelectedPatientId(found.id);
            if (updateViewerStatus) updateViewerStatus({ lastFeedback: `Selected case ${found.id}` });
          } else {
            // Explicit requirement: Preserve current case if not found & display informative message
            if (updateViewerStatus) {
              updateViewerStatus({ lastFeedback: `Case not found. The current case has not changed.` });
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

      // 6. Rotation Controls - One-Shot vs Continuous (Section 9)
      else if (type === 'ROTATE' || type === 'ROTATE_ONCE') {
        // Apply 2D Slice rotation (90° increments) once
        setSliceRotation((prev) => {
          if (action.direction === '180') return (prev + 180) % 360;
          if (action.direction === 'left') return (prev - (action.degrees || 90) + 360) % 360;
          return (prev + (action.degrees || 90)) % 360;
        });
        // Dispatch to 3D Three.js camera (one-shot action)
        setThreeCommand({
          type: 'ROTATE_ONCE',
          direction: action.direction,
          degrees: action.degrees || 15,
          id: Date.now(),
        });
      }

      else if (type === 'START_CONTINUOUS_ROTATION') {
        // Continuous rotation on 3D view
        setThreeCommand({
          type: 'START_CONTINUOUS_ROTATION',
          direction: action.direction || 'right',
          id: Date.now(),
        });
      }

      else if (type === 'STOP_ROTATION') {
        // Halts all continuous movement
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

      // 7. 3D Mesh, Layers & Appearance (Section 3)
      else if (type === 'TOGGLE_MESH') {
        setLayers((prev) => ({ ...prev, mri: action.visible }));
      }

      else if (type === 'SET_BRAIN_APPEARANCE') {
        setBrainAppearance(action.mode);
        setThreeCommand({ type: 'SET_BRAIN_APPEARANCE', mode: action.mode, id: Date.now() });
      }

      else if (type === 'SHOW_LAYERS_PANEL') {
        setActiveRightTab('layers');
      }

      else if (type === 'HIDE_LAYERS_PANEL') {
        setActiveRightTab('burden');
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
    toggleSubregion,
    handleOpenCompare,
  ]);

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
        return 'bg-mri-bg text-mri-muted border-mri-border';
    }
  };

  return (
    <div className="h-full flex flex-col p-3 lg:p-4 space-y-2.5 overflow-hidden">
      {/* 1. TOP TOOLBAR: THREE LOGICAL GROUPS + PERSISTENT COMPACT LEGEND */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-mri-surface border border-mri-border px-3.5 py-2 rounded-xl shadow-md shrink-0">
        {/* Left: Group 1 (Case) & Group 2 (Mask Source) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* GROUP 1: CASE */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs text-mri-muted uppercase font-mono font-semibold">Case:</span>
            </div>

            {/* Custom Animated Patient Selector Dropdown */}
            <div className="relative" ref={caseDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsCaseDropdownOpen(!isCaseDropdownOpen);
                  setCaseSearch('');
                }}
                style={{ backgroundColor: '#101B2D' }}
                className="flex items-center gap-2 bg-[#101B2D] hover:bg-[#18263B] border border-[#30445E] hover:border-cyan-400/60 text-slate-100 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer shadow-xs transition-all"
                aria-haspopup="listbox"
                aria-expanded={isCaseDropdownOpen}
              >
                <span className="truncate max-w-[140px] sm:max-w-[180px]">
                  {currentResult && selectedPatientId === currentResult.session_id
                    ? `Live: ${currentResult.session_id.substring(0, 12)}...`
                    : selectedPatientId}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                  {patients.find(p => p.id === selectedPatientId)?.is_validation ? 'Val' : 'Train'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isCaseDropdownOpen ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {/* Animated Popover */}
              {isCaseDropdownOpen && (
                <div 
                  style={{ backgroundColor: '#18263B' }}
                  className="absolute top-full left-0 mt-2 z-[100] w-72 max-h-80 flex flex-col bg-[#18263B] border border-[#30445E] rounded-xl shadow-2xl p-2 ring-1 ring-cyan-500/30 animate-dropdown-down text-xs font-mono"
                >
                  {/* Popover Header */}
                  <div 
                    style={{ backgroundColor: '#101B2D' }}
                    className="px-2.5 py-1.5 rounded-lg border border-[#30445E]/80 flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1.5 shrink-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Select BraTS Case</span>
                    </div>
                    <span className="text-cyan-400 text-[10px]">{patients.length || 1} available</span>
                  </div>

                  {/* Filter Search Input */}
                  <div className="relative mb-2 shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                      placeholder="Filter case ID..."
                      style={{ backgroundColor: '#101B2D' }}
                      className="w-full bg-[#101B2D] border border-[#30445E] focus:border-cyan-400 rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>

                  {/* Scrollable Cases List */}
                  <div className="overflow-y-auto space-y-1 max-h-56 pr-0.5">
                    {currentResult && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(currentResult.session_id);
                          setIsCaseDropdownOpen(false);
                        }}
                        style={{
                          backgroundColor: selectedPatientId === currentResult.session_id ? 'rgba(6, 182, 212, 0.15)' : '#18263B'
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          selectedPatientId === currentResult.session_id
                            ? 'text-cyan-300 font-bold border border-cyan-500/40'
                            : 'text-slate-200 hover:bg-[#22354D] hover:text-cyan-200 border border-transparent'
                        }`}
                      >
                        <div className="truncate min-w-0">
                          <span className="block truncate font-semibold">Live: {currentResult.session_id.substring(0, 14)}...</span>
                          <span className="text-[10px] text-slate-400">Prospective Upload</span>
                        </div>
                        {selectedPatientId === currentResult.session_id && (
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1.5" />
                        )}
                      </button>
                    )}

                    {patients.length > 0 ? (
                      patients
                        .filter((p) => p.id.toLowerCase().includes(caseSearch.toLowerCase()))
                        .map((p) => {
                          const isSelected = selectedPatientId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatientId(p.id);
                                setIsCaseDropdownOpen(false);
                              }}
                              style={{
                                backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.15)' : '#18263B'
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? 'text-cyan-300 font-bold border border-cyan-500/40'
                                  : 'text-slate-200 hover:bg-[#22354D] hover:text-cyan-200 border border-transparent'
                              }`}
                            >
                              <span className="truncate">{p.id}</span>
                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                                  p.is_validation
                                    ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                                    : 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                                }`}>
                                  {p.is_validation ? 'Val' : 'Train'}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                              </div>
                            </button>
                          );
                        })
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId('BraTS2021_01017');
                          setIsCaseDropdownOpen(false);
                        }}
                        style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-cyan-300 font-bold border border-cyan-500/40"
                      >
                        <span>BraTS2021_01017</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/40 text-blue-300 border border-blue-500/30">Train</span>
                      </button>
                    )}

                    {patients.length > 0 && patients.filter((p) => p.id.toLowerCase().includes(caseSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-3 text-center text-slate-400 text-[11px]">
                        No matching BraTS cases
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dataset split badge */}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-mri-bg border border-mri-border text-mri-muted hidden sm:inline">
              BraTS 2021
            </span>

            {/* Annotation Lifecycle State Badge */}
            {annotationRecord && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${stateBadgeStyle(annotationRecord.status)} hidden md:inline`}>
                {annotationRecord.status} (v{annotationRecord.version || 1})
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-mri-border/80 hidden sm:block" />

          {/* GROUP 2: MASK SOURCE */}
          <div className="flex items-center gap-1 bg-mri-bg border border-mri-border p-0.5 rounded-lg text-xs font-mono">
            <span className="text-[10px] text-mri-muted px-1.5">Mask:</span>
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
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-mri-muted hover:text-white'
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
          <div className="hidden lg:flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-mri-bg/80 border border-mri-border text-[11px] font-mono shadow-sm">
            <span className="text-mri-muted uppercase text-[9px] font-bold tracking-wider">Legend:</span>
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

          <div className="h-4 w-px bg-mri-border/80 hidden lg:block" />

          {/* GROUP 3: IMAGE & EDITING */}
          <div className="flex items-center gap-2">
            {/* Modality Selector Buttons */}
            <div className="flex items-center gap-1 bg-mri-bg border border-mri-border p-0.5 rounded-lg text-xs font-mono">
              {['flair', 't1', 't1ce', 't2'].map((mod) => (
                <button
                  key={mod}
                  onClick={() => setActiveMriModality(mod)}
                  className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold transition-all ${
                    activeMriModality === mod
                      ? 'bg-blue-600 text-white'
                      : 'text-mri-muted hover:text-white'
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
                  ? 'bg-amber-400 text-slate-900 border-amber-300'
                  : 'bg-mri-bg text-amber-300 border-amber-400/50 hover:bg-amber-400/10'
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
        <div className="bg-mri-surface border border-amber-400/40 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fadeIn">
          {/* Left: Mode (Paint vs Erase) & Label Selection */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5" />
              HITL Editor:
            </span>

            {/* Brush vs Eraser Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-mri-bg border border-mri-border">
              <button
                onClick={() => setBrushMode('paint')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  brushMode === 'paint'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-mri-muted hover:text-white'
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
                    : 'text-mri-muted hover:text-white'
                }`}
              >
                <Eraser className="w-3 h-3" />
                <span>Eraser</span>
              </button>
            </div>

            {/* Subregion Label Selection (only active when paint mode is on) */}
            {brushMode === 'paint' && (
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-[11px] text-mri-muted">Label:</span>
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
                        : 'border-transparent text-mri-muted hover:text-white bg-mri-bg'
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
            <div className="flex items-center gap-2 pl-2 border-l border-mri-border text-xs font-mono">
              <span className="text-mri-muted text-[11px]">Radius: {brushRadius}px</span>
              <input
                type="range"
                min="1"
                max="25"
                value={brushRadius}
                onChange={(e) => setBrushRadius(Number(e.target.value))}
                className="w-20 accent-blue-500 cursor-pointer"
              />
              <div className="flex items-center gap-0.5">
                {[2, 4, 8, 16].map((r) => (
                  <button
                    key={r}
                    onClick={() => setBrushRadius(r)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${brushRadius === r ? 'bg-blue-600 text-white font-bold' : 'text-mri-muted hover:text-white bg-mri-bg'}`}
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
              className="p-1.5 rounded bg-mri-bg hover:bg-mri-surface border border-mri-border text-mri-text disabled:opacity-40 transition-colors"
              title="Undo Last Stroke (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            {/* Redo */}
            <button
              onClick={handleRedo}
              className="p-1.5 rounded bg-mri-bg hover:bg-mri-surface border border-mri-border text-mri-text transition-colors"
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
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-mri-bg hover:bg-mri-surface border border-cyan-400/40 text-cyan-300 text-[11px] transition-colors"
              title="Compare Original AI vs Corrected Mask"
            >
              <GitCompare className="w-3 h-3 text-cyan-400" />
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
              className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] shadow-sm transition-all"
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
        <div className="w-full lg:w-[210px] xl:w-[220px] shrink-0 bg-mri-surface border border-mri-border rounded-xl p-3 flex flex-col justify-between space-y-3 overflow-y-auto">
          <div className="space-y-3">
            {/* Projection / Layout Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-mri-muted font-semibold block">
                Projection Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-mri-bg border border-mri-border">
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
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-mri-muted hover:text-white hover:bg-mri-surface'
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
          <div className="pt-2 border-t border-mri-border/70 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-mri-muted block">
              Quick Actions
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-mri-bg hover:bg-mri-surface border border-mri-border text-mri-text transition-all shadow-sm"
              >
                <RotateCcw className="w-3 h-3 text-mri-muted" />
                <span>Reset View</span>
              </button>
              <button
                onClick={() => setViewLayout('quad')}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-mri-bg hover:bg-mri-surface border border-mri-border text-mri-text transition-all shadow-sm"
              >
                <Grid className="w-3 h-3 text-cyan-400" />
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
        <div className="w-full lg:w-[290px] xl:w-[315px] 2xl:w-[330px] shrink-0 bg-mri-surface border border-mri-border rounded-xl p-3 flex flex-col justify-between space-y-3 overflow-y-auto overflow-x-hidden">
          <div className="space-y-3">
            {/* Header Tabs */}
            <div className="flex items-center gap-1 p-1 bg-mri-bg rounded-lg border border-mri-border text-xs">
              <button
                onClick={() => setActiveRightTab('burden')}
                className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                  activeRightTab === 'burden'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-mri-muted hover:text-white'
                }`}
              >
                Volumetrics
              </button>
              <button
                onClick={() => setActiveRightTab('layers')}
                className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                  activeRightTab === 'layers'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-mri-muted hover:text-white'
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
                  <span className="text-[11px] font-mono uppercase tracking-wider text-mri-muted font-semibold block">
                    Segmentation Layers
                  </span>
                  {[
                    { key: 'wt', label: 'Whole Tumor (WT)', color: '#EAB308', desc: 'Labels {1, 2, 3}' },
                    { key: 'tc', label: 'Tumor Core (TC)', color: '#F43F5E', desc: 'Labels {1, 3}' },
                    { key: 'et', label: 'Enhancing Tumor (ET)', color: '#06B6D4', desc: 'Label {3}' },
                  ].map(({ key, label, color, desc }) => (
                    <label key={key} className="flex items-center justify-between p-2 rounded-lg bg-mri-bg border border-mri-border text-xs cursor-pointer hover:bg-mri-surface transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <span className="text-mri-text font-medium block truncate">{label}</span>
                          <span className="text-[10px] text-mri-muted font-mono">{desc}</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={subregions[key]}
                        onChange={() => toggleSubregion(key)}
                        className="accent-blue-500 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>

                {/* MRI Background Toggle */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-mri-muted font-semibold block">
                    Anatomy Background
                  </span>
                  <label className="flex items-center justify-between p-2 rounded-lg bg-mri-bg border border-mri-border text-xs cursor-pointer hover:bg-mri-surface transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-slate-400 shrink-0" />
                      <div>
                        <span className="text-mri-text font-medium block">MRI Anatomy</span>
                        <span className="text-[10px] text-mri-muted font-mono">Atlas & Scan Background</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={layers.mri}
                      onChange={() => setLayers(prev => ({ ...prev, mri: !prev.mri }))}
                      className="accent-blue-500 rounded cursor-pointer shrink-0"
                    />
                  </label>
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-mri-bg border border-mri-border text-xs">
                  <div className="flex items-center justify-between text-mri-muted font-mono">
                    <span>Segmentation Opacity</span>
                    <span className="text-mri-text font-bold">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Brain Appearance Selector */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-mri-bg border border-mri-border text-xs relative" ref={appearanceDropdownRef}>
                  <span className="text-[11px] text-mri-muted font-mono block">3D Brain Appearance:</span>
                  
                  {/* Custom Animated Appearance Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsAppearanceDropdownOpen(!isAppearanceDropdownOpen)}
                    style={{ backgroundColor: '#101B2D' }}
                    className="w-full flex items-center justify-between gap-2 bg-[#101B2D] hover:bg-[#18263B] border border-[#30445E] hover:border-blue-400 text-slate-100 text-xs font-mono rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
                    aria-haspopup="listbox"
                    aria-expanded={isAppearanceDropdownOpen}
                  >
                    {(() => {
                      const curOpt = BRAIN_APPEARANCE_OPTIONS.find(o => o.id === brainAppearance) || BRAIN_APPEARANCE_OPTIONS[0];
                      return (
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <span className="font-semibold truncate">{curOpt.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/50 text-blue-300 border border-blue-500/30 shrink-0">
                            {curOpt.badge}
                          </span>
                        </div>
                      );
                    })()}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isAppearanceDropdownOpen ? 'rotate-180 text-blue-400' : ''
                      }`}
                    />
                  </button>

                  {/* Animated Popover Dropdown (Opens upward with 100% solid background so it never clips or bleeds) */}
                  {isAppearanceDropdownOpen && (
                    <div 
                      style={{ backgroundColor: '#18263B' }}
                      className="absolute bottom-full left-0 mb-2 z-[100] w-full bg-[#18263B] border border-[#30445E] rounded-xl shadow-2xl p-2 ring-1 ring-blue-500/30 animate-dropdown-up text-xs font-mono space-y-1"
                    >
                      <div 
                        style={{ backgroundColor: '#101B2D' }}
                        className="px-2.5 py-1.5 rounded-lg border border-[#30445E]/80 flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span>3D Shading Mode</span>
                        </div>
                        <span className="text-blue-400 text-[10px]">{BRAIN_APPEARANCE_OPTIONS.length} modes</span>
                      </div>

                      {BRAIN_APPEARANCE_OPTIONS.map((opt) => {
                        const isSelected = brainAppearance === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setBrainAppearance(opt.id);
                              setIsAppearanceDropdownOpen(false);
                            }}
                            style={{
                              backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.2)' : '#18263B'
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'text-blue-300 font-bold border border-blue-500/40'
                                : 'text-slate-200 hover:bg-[#22354D] hover:text-white border border-transparent'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="block font-semibold truncate text-xs">{opt.name}</span>
                              <span className="text-[10px] text-slate-400 block">{opt.badge}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-blue-400 shrink-0 ml-1.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Run Prediction / Pipeline Trigger */}
          <div className="pt-2 border-t border-mri-border/70">
            <button
              onClick={handleRunPrediction}
              disabled={predicting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50"
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-mri-surface/95 border border-mri-border/80 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md mb-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-mri-text">
                {maximizedViewer.toUpperCase()} VIEW • CASE: {selectedPatientId}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMaximizedViewer(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mri-bg hover:bg-mri-surface border border-mri-border text-mri-text text-xs font-mono font-semibold"
              >
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exit Fullscreen (Esc)</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-0 relative rounded-xl overflow-hidden border border-mri-border shadow-2xl bg-mri-bg">
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
          <div className="bg-mri-surface border border-cyan-400/50 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-mri-border pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-mri-text text-base">Mask Comparison Analysis</h3>
              </div>
              <button 
                onClick={() => setShowCompareModal(false)}
                className="text-mri-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-mri-muted">
                Quantifying agreement between original UNETR model prediction and human clinical correction:
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-mri-bg border border-mri-border">
                  <span className="text-mri-muted block text-[10px]">Overall Dice Agreement</span>
                  <span className="text-lg font-bold text-cyan-400">
                    {compareData.dice_agreement !== undefined ? (compareData.dice_agreement * 100).toFixed(1) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-mri-bg border border-mri-border">
                  <span className="text-mri-muted block text-[10px]">Modified Voxels</span>
                  <span className="text-lg font-bold text-mri-text">
                    {compareData.voxels_changed || 0}
                  </span>
                </div>
              </div>

              {compareData.volume_comparison && (
                <div className="p-3 rounded-lg bg-mri-bg border border-mri-border space-y-2">
                  <span className="font-semibold text-mri-text block">Volume Deltas:</span>
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
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
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
          <div className="bg-mri-surface border border-purple-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-mri-border pb-3">
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-mri-text text-base">Save Annotation Draft</h3>
              </div>
              <button onClick={() => setShowDraftModal(false)} className="text-mri-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-mri-muted">
                Save your in-progress voxel corrections without submitting to the training queue. You can resume editing later.
              </p>
              <div>
                <label className="text-mri-text font-semibold block mb-1">Clinical Notes (Optional):</label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="e.g., Extended enhancing tumor margin on axial slices 72-80..."
                  className="w-full h-24 p-2.5 rounded-lg bg-mri-bg border border-mri-border text-mri-text text-xs font-mono focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-3 py-1.5 rounded-lg border border-mri-border text-mri-muted text-xs hover:text-white"
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
          <div className="bg-mri-surface border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-mri-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-mri-text text-base">Submit for Clinical Review</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-mri-muted hover:text-white">
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
                <label className="text-mri-text font-semibold block mb-1">Radiologist Review Notes:</label>
                <textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g., Confirmed enhancing tumor boundary on T1ce; reduced necrotic over-segmentation on coronal views."
                  className="w-full h-24 p-2.5 rounded-lg bg-mri-bg border border-mri-border text-mri-text text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-3 py-1.5 rounded-lg border border-mri-border text-mri-muted text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSubmitReview}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
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
