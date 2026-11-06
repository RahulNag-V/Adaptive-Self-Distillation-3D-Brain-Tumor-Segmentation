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
  ChevronRight
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
import { useVoice } from '../voice/VoiceContext';
import { prefersReducedMotion } from '../utils/motion';

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

  const handleReset = () => {
    setAxialSlice(Math.floor(dimensions.axial / 2));
    setCoronalSlice(Math.floor(dimensions.coronal / 2));
    setSagittalSlice(Math.floor(dimensions.sagittal / 2));
    setOpacity(0.75);
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
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'Correction In Progress':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Draft Saved':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Submitted for Review':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'Approved for Training':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Rejected':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'Included in Training Dataset':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-[#151E2B] text-[#8496AC] border-[#1C2636]';
    }
  };

  return (
    <div className="h-full flex flex-col p-2.5 sm:p-3 lg:p-3.5 space-y-2 overflow-hidden bg-[#080B12]">
      {/* 1. TOP CLINICAL WORKSTATION COMMAND STRIP (Single Unified 44px Ribbon) */}
      <header className="flex flex-wrap items-center justify-between gap-2 bg-[#101722] border border-[#1C2636] px-3 py-1.5 rounded-xl shadow-medical-sm shrink-0">
        
        {/* Left Section: Case Selector, Split Badge, Mask Source */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* CASE SELECTOR */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4C8DFF] animate-pulse shrink-0" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8496AC] hidden sm:inline">
              Case:
            </span>

            {/* Custom Clinical Patient Dropdown */}
            <div className="relative" ref={caseDropdownRef}>
              <button
                type="button"
                onClick={toggleCaseDropdown}
                className="flex items-center gap-2 bg-[#151E2B] hover:bg-[#1C2636] border border-[#1C2636] hover:border-[#4C8DFF]/60 text-[#F4F7FC] text-xs font-mono font-semibold px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4C8DFF] cursor-pointer shadow-xs transition-colors"
                aria-haspopup="listbox"
                aria-expanded={caseDropdownState === 'open'}
              >
                <span className="truncate max-w-[130px] sm:max-w-[170px]">
                  {currentResult && selectedPatientId === currentResult.session_id
                    ? `Live: ${currentResult.session_id.substring(0, 12)}...`
                    : selectedPatientId}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#4C8DFF]/15 text-[#4C8DFF] border border-[#4C8DFF]/30 font-medium">
                  {patients.find(p => p.id === selectedPatientId)?.is_validation ? 'Val' : 'Train'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#8496AC] transition-transform duration-200 ${
                    caseDropdownState === 'open' ? 'rotate-180 text-[#4C8DFF]' : ''
                  }`}
                />
              </button>

              {/* Animated Clinical Popover */}
              {caseDropdownState !== 'closed' && (
                <div 
                  className={`absolute top-full left-0 mt-2 z-[100] w-72 max-h-80 flex flex-col bg-[#151E2B] border border-[#1C2636] rounded-xl shadow-medical-lg p-2 ring-1 ring-[#4C8DFF]/30 text-xs font-mono ${
                    caseDropdownState === 'closing' ? 'animate-dropdown-exit' : 'animate-dropdown-down'
                  }`}
                >
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#101722] border border-[#1C2636] flex items-center justify-between text-[11px] font-bold text-[#F4F7FC] mb-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#4C8DFF] animate-pulse" />
                      <span>Select BraTS Case</span>
                    </div>
                    <span className="text-[#4C8DFF] text-[10px]">{patients.length || 1} available</span>
                  </div>

                  {/* Filter Search Input */}
                  <div className="relative mb-2 shrink-0">
                    <Search className="w-3.5 h-3.5 text-[#8496AC] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                      placeholder="Filter case ID..."
                      className="w-full bg-[#101722] border border-[#1C2636] focus:border-[#4C8DFF] rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-[#F4F7FC] placeholder-[#8496AC] focus:outline-none transition-colors"
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
                          closeCaseDropdown();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          selectedPatientId === currentResult.session_id
                            ? 'bg-[#4C8DFF]/15 text-[#4C8DFF] font-bold border border-[#4C8DFF]/40'
                            : 'text-[#F4F7FC] hover:bg-[#1C2636] border border-transparent'
                        }`}
                      >
                        <div className="truncate min-w-0">
                          <span className="block truncate font-semibold">Live: {currentResult.session_id.substring(0, 14)}...</span>
                          <span className="text-[10px] text-[#8496AC]">Prospective Upload</span>
                        </div>
                        {selectedPatientId === currentResult.session_id && (
                          <Check className="w-3.5 h-3.5 text-[#4C8DFF] shrink-0 ml-1.5" />
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
                                closeCaseDropdown();
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#4C8DFF]/15 text-[#4C8DFF] font-bold border border-[#4C8DFF]/40'
                                  : 'text-[#F4F7FC] hover:bg-[#1C2636] border border-transparent'
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
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#4C8DFF]" />}
                              </div>
                            </button>
                          );
                        })
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId('BraTS2021_01017');
                          closeCaseDropdown();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left bg-[#4C8DFF]/15 text-[#4C8DFF] font-bold border border-[#4C8DFF]/40"
                      >
                        <span>BraTS2021_01017</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/40 text-blue-300 border border-blue-500/30">Train</span>
                      </button>
                    )}

                    {patients.length > 0 && patients.filter((p) => p.id.toLowerCase().includes(caseSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-3 text-center text-[#8496AC] text-[11px]">
                        No matching BraTS cases
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dataset split badge */}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151E2B] border border-[#1C2636] text-[#8496AC] hidden md:inline">
              BraTS 2021
            </span>

            {/* Annotation Lifecycle State Badge */}
            {annotationRecord && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${stateBadgeStyle(annotationRecord.status)} hidden lg:inline`}>
                {annotationRecord.status} (v{annotationRecord.version || 1})
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-[#1C2636] hidden sm:block" />

          {/* MASK SOURCE SELECTOR */}
          <div className="flex items-center gap-0.5 bg-[#080B12] border border-[#1C2636] p-0.5 rounded-lg text-xs font-mono">
            <span className="text-[10px] text-[#8496AC] px-1.5 hidden xl:inline">Mask:</span>
            {[
              { id: 'prediction', label: 'AI Pred' },
              { id: 'corrected', label: 'Corrected' },
              { id: 'ground_truth', label: 'Ground Truth' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSegSource(id)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  segSource === id
                    ? 'bg-[#4C8DFF] text-white shadow-xs'
                    : 'text-[#8496AC] hover:text-[#F4F7FC]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Section: Modalities, Layout Modes, Legend, HITL Toggle, Inspector Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* MRI MODALITY SELECTOR */}
          <div className="flex items-center gap-0.5 bg-[#080B12] border border-[#1C2636] p-0.5 rounded-lg text-xs font-mono">
            {availableModalities.map((mod) => (
              <button
                key={mod}
                onClick={() => setActiveMriModality(mod)}
                className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold transition-colors ${
                  activeMriModality === mod
                    ? 'bg-[#4C8DFF] text-white shadow-xs'
                    : 'text-[#8496AC] hover:text-[#F4F7FC]'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#1C2636] hidden md:block" />

          {/* VIEW LAYOUT SELECTOR */}
          <div className="flex items-center gap-0.5 bg-[#080B12] border border-[#1C2636] p-0.5 rounded-lg text-xs font-mono">
            {[
              { id: 'quad', label: 'Quad', icon: Grid },
              { id: '3d', label: '3D', icon: Box },
              { id: 'axial', label: 'Axial (Z)' },
              { id: 'coronal', label: 'Coronal (Y)' },
              { id: 'sagittal', label: 'Sagittal (X)' },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setViewLayout(id);
                  if (maximizedViewer) setMaximizedViewer(null);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  viewLayout === id
                    ? 'bg-[#4C8DFF] text-white shadow-xs'
                    : 'text-[#8496AC] hover:text-[#F4F7FC]'
                }`}
                title={`Switch layout to ${label}`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span className={id === 'quad' || id === '3d' ? '' : 'hidden xl:inline'}>
                  {id === 'quad' || id === '3d' ? label : label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#1C2636] hidden lg:block" />

          {/* PERSISTENT BRA-TS COMPACT LEGEND */}
          <div className="hidden xl:flex items-center gap-2 px-2 py-0.5 rounded-lg bg-[#080B12] border border-[#1C2636] text-[10px] font-mono">
            <div className="flex items-center gap-1" title="Whole Tumor (Edema + Core + Enhancing)">
              <span className="w-2 h-2 rounded-xs bg-[#EAB308]" />
              <span className="text-[#EAB308] font-semibold">WT</span>
            </div>
            <div className="flex items-center gap-1" title="Tumor Core (Necrotic + Enhancing)">
              <span className="w-2 h-2 rounded-xs bg-[#F43F5E]" />
              <span className="text-[#F43F5E] font-semibold">TC</span>
            </div>
            <div className="flex items-center gap-1" title="Enhancing Tumor">
              <span className="w-2 h-2 rounded-xs bg-[#06B6D4]" />
              <span className="text-[#06B6D4] font-semibold">ET</span>
            </div>
          </div>

          {/* HITL ANNOTATION / CORRECTION TOGGLE BUTTON */}
          <button
            onClick={() => setIsEditing(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all shadow-xs ${
              isEditing
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-[#151E2B] text-amber-300 border-amber-400/40 hover:bg-amber-400/10'
            }`}
            title="Toggle Human-In-The-Loop Contour Correction Mode"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Exit Editor' : 'Correct'}</span>
          </button>

          {/* RESET VIEW BUTTON */}
          <button
            onClick={handleReset}
            className="p-1 rounded-lg bg-[#151E2B] hover:bg-[#1C2636] border border-[#1C2636] text-[#8496AC] hover:text-[#F4F7FC] transition-colors"
            title="Reset Pan, Zoom, Rotation and Coordinates"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* TOGGLE INSPECTOR SIDEBAR BUTTON */}
          <button
            onClick={() => setInspectorOpen(prev => !prev)}
            className={`p-1 rounded-lg border text-xs font-mono transition-colors ${
              inspectorOpen 
                ? 'bg-[#151E2B] text-[#4C8DFF] border-[#4C8DFF]/40' 
                : 'bg-[#151E2B] text-[#8496AC] border-[#1C2636] hover:text-[#F4F7FC]'
            }`}
            title={inspectorOpen ? 'Collapse Diagnostic Inspector for maximum canvas' : 'Expand Diagnostic Inspector'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. DOCKED HITL CORRECTION RIBBON (VISIBLE WHEN isEditing IS TRUE) */}
      {isEditing && (
        <div className="bg-[#101722] border border-amber-400/40 rounded-xl px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2.5 shadow-medical-md animate-fadeIn shrink-0">
          {/* Mode (Paint vs Erase) & Label Selection */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5" />
              HITL Editor:
            </span>

            {/* Brush vs Eraser Toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#080B12] border border-[#1C2636]">
              <button
                onClick={() => setBrushMode('paint')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold transition-colors ${
                  brushMode === 'paint'
                    ? 'bg-[#4C8DFF] text-white shadow-xs'
                    : 'text-[#8496AC] hover:text-white'
                }`}
              >
                <Paintbrush className="w-3 h-3" />
                <span>Brush</span>
              </button>
              <button
                onClick={() => setBrushMode('erase')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold transition-colors ${
                  brushMode === 'erase'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-[#8496AC] hover:text-white'
                }`}
              >
                <Eraser className="w-3 h-3" />
                <span>Eraser</span>
              </button>
            </div>

            {/* Subregion Label Selection */}
            {brushMode === 'paint' && (
              <div className="flex items-center gap-1 text-xs font-mono">
                <span className="text-[10px] text-[#8496AC] hidden sm:inline">Label:</span>
                {[
                  { id: 1, name: 'TC (Core)', color: '#F43F5E', desc: 'Tumor Core / Necrotic' },
                  { id: 2, name: 'WT (Edema)', color: '#EAB308', desc: 'Peritumoral Edema' },
                  { id: 3, name: 'ET (Enhancing)', color: '#06B6D4', desc: 'Enhancing Active Tumor' },
                ].map(({ id, name, color, desc }) => (
                  <button
                    key={id}
                    onClick={() => setActiveLabel(id)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
                      activeLabel === id
                        ? 'border-white text-slate-950 font-bold shadow-xs'
                        : 'border-transparent text-[#8496AC] hover:text-white bg-[#080B12]'
                    }`}
                    style={{
                      backgroundColor: activeLabel === id ? color : undefined,
                    }}
                    title={desc}
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: activeLabel === id ? '#000' : color }}
                    />
                    <span className="text-[11px]">{name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Brush Radius Slider & Presets */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#1C2636] text-xs font-mono">
              <span className="text-[#8496AC] text-[10px]">Radius: {brushRadius}px</span>
              <input
                type="range"
                min="1"
                max="25"
                value={brushRadius}
                onChange={(e) => setBrushRadius(Number(e.target.value))}
                className="w-16 accent-[#4C8DFF] cursor-pointer"
              />
              <div className="flex items-center gap-0.5">
                {[2, 4, 8, 16].map((r) => (
                  <button
                    key={r}
                    onClick={() => setBrushRadius(r)}
                    className={`px-1.5 py-0.2 rounded text-[10px] ${brushRadius === r ? 'bg-[#4C8DFF] text-white font-bold' : 'text-[#8496AC] hover:text-white bg-[#080B12]'}`}
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
              className="p-1 rounded bg-[#080B12] hover:bg-[#151E2B] border border-[#1C2636] text-[#F4F7FC] disabled:opacity-30 transition-colors"
              title="Undo Last Stroke (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            {/* Redo */}
            <button
              onClick={handleRedo}
              className="p-1 rounded bg-[#080B12] hover:bg-[#151E2B] border border-[#1C2636] text-[#F4F7FC] transition-colors"
              title="Redo Stroke (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            {/* Clear All Human Edits */}
            <button
              onClick={handleClearEdits}
              disabled={!annotationRecord?.edit_history?.length}
              className="px-2 py-0.5 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-[10px] disabled:opacity-30 transition-colors"
              title="Reset all edits"
            >
              Clear
            </button>

            {/* Compare Masks */}
            <button
              onClick={handleOpenCompare}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#080B12] hover:bg-[#151E2B] border border-[#4C8DFF]/40 text-[#4C8DFF] text-[10px] transition-colors"
              title="Compare Original AI vs Corrected Mask"
            >
              <GitCompare className="w-3 h-3 text-[#4C8DFF]" />
              <span>Compare</span>
            </button>

            {/* Save Draft */}
            <button
              onClick={() => setShowDraftModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-purple-300 text-[10px] transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>Save Draft</span>
            </button>

            {/* Confirm & Submit for Review */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] shadow-xs transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>Submit Review</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CLINICAL WORKSPACE: MAXIMIZED 4-UP MPR VIEWPORTS (CENTER) + COMPACT RIGHT INSPECTOR */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2.5 min-h-0 overflow-hidden">
        
        {/* CENTER VIEWPORT CANVAS (Fills maximum space) */}
        <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden">
          {viewLayout === 'quad' ? (
            /* QUAD MPR VIEW: 2x2 Synchronized Workstation Grid (3D + Axial + Coronal + Sagittal) */
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

        {/* RIGHT CLINICAL DIAGNOSTIC INSPECTOR (Toggleable, Compact, 3-Tab Architecture) */}
        {inspectorOpen && (
          <aside className="w-full lg:w-[310px] xl:w-[330px] shrink-0 bg-[#101722] border border-[#1C2636] rounded-xl p-3 flex flex-col justify-between space-y-3 overflow-y-auto overflow-x-hidden shadow-medical-sm animate-fadeIn">
            <div className="space-y-3">
              {/* Header Tabs: Volumetrics | Coordinates | Display Layers */}
              <div className="flex items-center gap-0.5 p-0.5 bg-[#080B12] rounded-lg border border-[#1C2636] text-xs">
                <button
                  onClick={() => setActiveRightTab('burden')}
                  className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                    activeRightTab === 'burden'
                      ? 'bg-[#4C8DFF] text-white font-semibold shadow-xs'
                      : 'text-[#8496AC] hover:text-[#F4F7FC]'
                  }`}
                >
                  Volumetrics
                </button>
                <button
                  onClick={() => setActiveRightTab('coords')}
                  className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                    activeRightTab === 'coords'
                      ? 'bg-[#4C8DFF] text-white font-semibold shadow-xs'
                      : 'text-[#8496AC] hover:text-[#F4F7FC]'
                  }`}
                >
                  Coords
                </button>
                <button
                  onClick={() => setActiveRightTab('layers')}
                  className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                    activeRightTab === 'layers'
                      ? 'bg-[#4C8DFF] text-white font-semibold shadow-xs'
                      : 'text-[#8496AC] hover:text-[#F4F7FC]'
                  }`}
                >
                  Layers
                </button>
              </div>

              {/* TAB 1: Volumetric Analysis Panel */}
              {activeRightTab === 'burden' && (
                <TumorBurdenPanel
                  patientId={selectedPatientId}
                  segSource={segSource}
                  onSliceSelect={(sliceIdx) => setAxialSlice(sliceIdx)}
                />
              )}

              {/* TAB 2: Slice Coordinates Stepper & Tumor Focus */}
              {activeRightTab === 'coords' && (
                <SliceCoordinatesPanel
                  axialSlice={axialSlice}
                  coronalSlice={coronalSlice}
                  sagittalSlice={sagittalSlice}
                  dimensions={dimensions}
                  onAxialChange={setAxialSlice}
                  onCoronalChange={setCoronalSlice}
                  onSagittalChange={setSagittalSlice}
                />
              )}

              {/* TAB 3: Layers, Opacity & 3D Shading Controls */}
              {activeRightTab === 'layers' && (
                <div className="space-y-3 text-xs">
                  {/* Segmentation Overlays */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8496AC] font-semibold block">
                      Segmentation Layers
                    </span>
                    {[
                      { key: 'wt', label: 'Whole Tumor (WT)', color: '#EAB308', desc: 'Labels {1, 2, 3}' },
                      { key: 'tc', label: 'Tumor Core (TC)', color: '#F43F5E', desc: 'Labels {1, 3}' },
                      { key: 'et', label: 'Enhancing Tumor (ET)', color: '#06B6D4', desc: 'Label {3}' },
                    ].map(({ key, label, color, desc }) => (
                      <label key={key} className="flex items-center justify-between p-2 rounded-lg bg-[#080B12] border border-[#1C2636] text-xs cursor-pointer hover:bg-[#151E2B] transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                          <div className="min-w-0">
                            <span className="text-[#F4F7FC] font-medium block truncate">{label}</span>
                            <span className="text-[10px] text-[#8496AC] font-mono">{desc}</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={subregions[key]}
                          onChange={() => toggleSubregion(key)}
                          className="accent-[#4C8DFF] rounded cursor-pointer shrink-0"
                        />
                      </label>
                    ))}
                  </div>

                  {/* MRI Background Toggle */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8496AC] font-semibold block">
                      Anatomy Background
                    </span>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-[#080B12] border border-[#1C2636] text-xs cursor-pointer hover:bg-[#151E2B] transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded bg-slate-400 shrink-0" />
                        <div>
                          <span className="text-[#F4F7FC] font-medium block">MRI Anatomy</span>
                          <span className="text-[10px] text-[#8496AC] font-mono">Atlas & Scan Background</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={layers.mri}
                        onChange={() => setLayers(prev => ({ ...prev, mri: !prev.mri }))}
                        className="accent-[#4C8DFF] rounded cursor-pointer shrink-0"
                      />
                    </label>
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-1.5 p-2.5 rounded-lg bg-[#080B12] border border-[#1C2636] text-xs">
                    <div className="flex items-center justify-between text-[#8496AC] font-mono">
                      <span>Segmentation Opacity</span>
                      <span className="text-[#F4F7FC] font-bold">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#4C8DFF] cursor-pointer"
                    />
                  </div>

                  {/* Brain Appearance Selector */}
                  <div className="space-y-1.5 p-2.5 rounded-lg bg-[#080B12] border border-[#1C2636] text-xs relative" ref={appearanceDropdownRef}>
                    <span className="text-[11px] text-[#8496AC] font-mono block">3D Brain Appearance:</span>
                    
                    <button
                      type="button"
                      onClick={toggleAppearanceDropdown}
                      className="w-full flex items-center justify-between gap-2 bg-[#151E2B] hover:bg-[#1C2636] border border-[#1C2636] hover:border-[#4C8DFF] text-[#F4F7FC] text-xs font-mono rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4C8DFF] transition-colors shadow-xs"
                      aria-haspopup="listbox"
                      aria-expanded={appearanceDropdownState === 'open'}
                    >
                      {(() => {
                        const curOpt = BRAIN_APPEARANCE_OPTIONS.find(o => o.id === brainAppearance) || BRAIN_APPEARANCE_OPTIONS[0];
                        return (
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <span className="font-semibold truncate">{curOpt.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#4C8DFF]/15 text-[#4C8DFF] border border-[#4C8DFF]/30 shrink-0">
                              {curOpt.badge}
                            </span>
                          </div>
                        );
                      })()}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#8496AC] transition-transform duration-200 shrink-0 ${
                          appearanceDropdownState === 'open' ? 'rotate-180 text-[#4C8DFF]' : ''
                        }`}
                      />
                    </button>

                    {/* Popover Dropdown */}
                    {appearanceDropdownState !== 'closed' && (
                      <div 
                        className={`absolute bottom-full left-0 mb-2 z-[100] w-full bg-[#151E2B] border border-[#1C2636] rounded-xl shadow-medical-lg p-2 ring-1 ring-[#4C8DFF]/30 text-xs font-mono space-y-1 ${
                          appearanceDropdownState === 'closing' ? 'animate-dropdown-exit' : 'animate-dropdown-up'
                        }`}
                      >
                        <div className="px-2.5 py-1.5 rounded-lg bg-[#101722] border border-[#1C2636] flex items-center justify-between text-[11px] font-bold text-[#F4F7FC] mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#4C8DFF] animate-pulse" />
                            <span>3D Shading Mode</span>
                          </div>
                          <span className="text-[#4C8DFF] text-[10px]">{BRAIN_APPEARANCE_OPTIONS.length} modes</span>
                        </div>

                        {BRAIN_APPEARANCE_OPTIONS.map((opt) => {
                          const isSelected = brainAppearance === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setBrainAppearance(opt.id);
                                closeAppearanceDropdown();
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#4C8DFF]/15 text-[#4C8DFF] font-bold border border-[#4C8DFF]/40'
                                  : 'text-[#F4F7FC] hover:bg-[#1C2636] border border-transparent'
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="block font-semibold truncate text-xs">{opt.name}</span>
                                <span className="text-[10px] text-[#8496AC] block">{opt.badge}</span>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#4C8DFF] shrink-0 ml-1.5" />
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
            <div className="pt-2 border-t border-[#1C2636]">
              <button
                onClick={handleRunPrediction}
                disabled={predicting}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#4C8DFF] hover:bg-[#3B7BE8] text-white font-semibold text-xs transition-colors shadow-medical-sm disabled:opacity-50 cursor-pointer"
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
          </aside>
        )}
      </div>

      {/* FULLSCREEN MAXIMIZED MODAL OVERLAY */}
      {maximizedViewer && (
        <div className="fixed inset-0 z-50 bg-[#080B12] flex flex-col p-2.5 sm:p-3 overflow-hidden select-none animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101722]/95 border border-[#1C2636] px-4 py-2 rounded-xl shadow-medical-lg backdrop-blur-md mb-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4C8DFF] animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F4F7FC]">
                {maximizedViewer.toUpperCase()} VIEW • CASE: {selectedPatientId}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMaximizedViewer(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151E2B] hover:bg-[#1C2636] border border-[#1C2636] text-[#F4F7FC] text-xs font-mono font-semibold transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5 text-[#4C8DFF]" />
                <span>Exit Fullscreen (Esc)</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-0 relative rounded-xl overflow-hidden border border-[#1C2636] shadow-medical-lg bg-[#080B12]">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#101722] border border-[#1C2636] rounded-2xl p-6 max-w-xl w-full shadow-medical-lg space-y-4 animate-modal-enter">
            <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-[#4C8DFF]" />
                <h3 className="font-bold text-[#F4F7FC] text-base">Mask Comparison Analysis</h3>
              </div>
              <button 
                onClick={() => setShowCompareModal(false)}
                className="text-[#8496AC] hover:text-[#F4F7FC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#8496AC]">
                Quantifying agreement between original UNETR model prediction and human clinical correction:
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-[#080B12] border border-[#1C2636]">
                  <span className="text-[#8496AC] block text-[10px]">Overall Dice Agreement</span>
                  <span className="text-lg font-bold text-[#4C8DFF]">
                    {compareData.dice_agreement !== undefined ? (compareData.dice_agreement * 100).toFixed(1) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#080B12] border border-[#1C2636]">
                  <span className="text-[#8496AC] block text-[10px]">Modified Voxels</span>
                  <span className="text-lg font-bold text-[#F4F7FC]">
                    {compareData.voxels_changed || 0}
                  </span>
                </div>
              </div>

              {compareData.volume_comparison && (
                <div className="p-3 rounded-lg bg-[#080B12] border border-[#1C2636] space-y-2">
                  <span className="font-semibold text-[#F4F7FC] block">Volume Deltas:</span>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-[#EAB308] block font-bold">WT (Whole Tumor)</span>
                      <span className="text-[#8496AC]">Pred: {compareData.volume_comparison.WT?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-white block font-semibold">Corr: {compareData.volume_comparison.WT?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                    <div>
                      <span className="text-[#F43F5E] block font-bold">TC (Core)</span>
                      <span className="text-[#8496AC]">Pred: {compareData.volume_comparison.TC?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-white block font-semibold">Corr: {compareData.volume_comparison.TC?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                    <div>
                      <span className="text-[#06B6D4] block font-bold">ET (Enhancing)</span>
                      <span className="text-[#8496AC]">Pred: {compareData.volume_comparison.ET?.original_cm3?.toFixed(1) || 0} cm³</span>
                      <span className="text-white block font-semibold">Corr: {compareData.volume_comparison.ET?.corrected_cm3?.toFixed(1) || 0} cm³</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 rounded-lg bg-[#4C8DFF] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-medical-sm"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SAVE DRAFT MODAL */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#101722] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-medical-lg space-y-4 animate-modal-enter">
            <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-[#F4F7FC] text-base">Save Annotation Draft</h3>
              </div>
              <button onClick={() => setShowDraftModal(false)} className="text-[#8496AC] hover:text-[#F4F7FC]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#8496AC]">
                Save your in-progress voxel corrections without submitting to the training queue. You can resume editing later.
              </p>
              <div>
                <label className="text-[#F4F7FC] font-semibold block mb-1">Clinical Notes (Optional):</label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="e.g., Extended enhancing tumor margin on axial slices 72-80..."
                  className="w-full h-24 p-2.5 rounded-lg bg-[#080B12] border border-[#1C2636] text-[#F4F7FC] text-xs font-mono focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#1C2636] text-[#8496AC] text-xs hover:text-[#F4F7FC]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSaveDraft}
                disabled={draftSaving}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-medical-sm"
              >
                {draftSaving ? 'Saving...' : 'Confirm Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SUBMIT FOR REVIEW MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#101722] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-medical-lg space-y-4 animate-modal-enter">
            <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-[#F4F7FC] text-base">Submit for Clinical Review</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-[#8496AC] hover:text-[#F4F7FC]">
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
                <label className="text-[#F4F7FC] font-semibold block mb-1">Radiologist Review Notes:</label>
                <textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g., Confirmed enhancing tumor boundary on T1ce; reduced necrotic over-segmentation on coronal views."
                  className="w-full h-24 p-2.5 rounded-lg bg-[#080B12] border border-[#1C2636] text-[#F4F7FC] text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#1C2636] text-[#8496AC] text-xs hover:text-[#F4F7FC]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSubmitReview}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-medical-sm"
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
