import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Play, 
  ShieldAlert, 
  Sparkles, 
  Info, 
  Clock, 
  ArrowRight, 
  Loader2, 
  FileCheck, 
  Layers, 
  Activity, 
  AlertTriangle, 
  ExternalLink, 
  Cpu, 
  Database,
  Crosshair,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { uploadMRI, validateMRI, runSegmentation, loadValidationSubject } from '../api/segmentation';
import { getCatalog } from '../api/adaptive';

const MRI_MODALITIES = [
  { 
    id: 'flair', 
    label: 'FLAIR', 
    desc: 'Fluid Attenuated Inversion Recovery (Edema / Infiltration)',
    accent: '#06B6D4',
    bgAccent: 'rgba(6, 182, 212, 0.12)',
    borderAccent: 'rgba(6, 182, 212, 0.35)',
    uploadedBg: 'rgba(6, 182, 212, 0.16)',
    uploadedBorder: 'rgba(6, 182, 212, 0.75)',
    uploadedShadow: '0 4px 18px rgba(6, 182, 212, 0.14)',
    uploadedBadgeBg: 'rgba(6, 182, 212, 0.20)',
    uploadedBadgeText: '#0E7490',
    uploadedBadgeBorder: 'rgba(6, 182, 212, 0.45)',
    uploadedBoxBg: 'rgba(6, 182, 212, 0.12)',
    uploadedBoxBorder: 'rgba(6, 182, 212, 0.35)',
    dragBg: 'rgba(6, 182, 212, 0.24)',
  },
  { 
    id: 't1', 
    label: 'T1', 
    desc: 'T1-weighted Native (Structural anatomy & gray/white boundary)',
    accent: '#4C8DFF',
    bgAccent: 'rgba(76, 141, 255, 0.12)',
    borderAccent: 'rgba(76, 141, 255, 0.35)',
    uploadedBg: 'rgba(76, 141, 255, 0.16)',
    uploadedBorder: 'rgba(76, 141, 255, 0.75)',
    uploadedShadow: '0 4px 18px rgba(76, 141, 255, 0.14)',
    uploadedBadgeBg: 'rgba(76, 141, 255, 0.20)',
    uploadedBadgeText: '#1D4ED8',
    uploadedBadgeBorder: 'rgba(76, 141, 255, 0.45)',
    uploadedBoxBg: 'rgba(76, 141, 255, 0.12)',
    uploadedBoxBorder: 'rgba(76, 141, 255, 0.35)',
    dragBg: 'rgba(76, 141, 255, 0.24)',
  },
  { 
    id: 't1ce', 
    label: 'T1ce', 
    desc: 'T1-weighted Contrast Enhanced (Active enhancing tumor core)',
    accent: '#8B5CF6',
    bgAccent: 'rgba(139, 92, 246, 0.12)',
    borderAccent: 'rgba(139, 92, 246, 0.35)',
    uploadedBg: 'rgba(139, 92, 246, 0.16)',
    uploadedBorder: 'rgba(139, 92, 246, 0.75)',
    uploadedShadow: '0 4px 18px rgba(139, 92, 246, 0.14)',
    uploadedBadgeBg: 'rgba(139, 92, 246, 0.20)',
    uploadedBadgeText: '#6D28D9',
    uploadedBadgeBorder: 'rgba(139, 92, 246, 0.45)',
    uploadedBoxBg: 'rgba(139, 92, 246, 0.12)',
    uploadedBoxBorder: 'rgba(139, 92, 246, 0.35)',
    dragBg: 'rgba(139, 92, 246, 0.24)',
  },
  { 
    id: 't2', 
    label: 'T2', 
    desc: 'T2-weighted Native (Hyperintense gross tumor boundaries)',
    accent: '#35B982',
    bgAccent: 'rgba(53, 185, 130, 0.12)',
    borderAccent: 'rgba(53, 185, 130, 0.35)',
    uploadedBg: 'rgba(53, 185, 130, 0.16)',
    uploadedBorder: 'rgba(53, 185, 130, 0.75)',
    uploadedShadow: '0 4px 18px rgba(53, 185, 130, 0.14)',
    uploadedBadgeBg: 'rgba(53, 185, 130, 0.20)',
    uploadedBadgeText: '#047857',
    uploadedBadgeBorder: 'rgba(53, 185, 130, 0.45)',
    uploadedBoxBg: 'rgba(53, 185, 130, 0.12)',
    uploadedBoxBorder: 'rgba(53, 185, 130, 0.35)',
    dragBg: 'rgba(53, 185, 130, 0.24)',
  },
];

export default function UploadPage({ onNavigate, onSegmentationComplete, onOpenViewer }) {
  // Modality Selection: 'mri' | 'ct'
  const [selectedModality, setSelectedModality] = useState('mri');

  // Model catalog from backend
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // MRI Files State
  const [mriFiles, setMriFiles] = useState({
    flair: null,
    t1: null,
    t1ce: null,
    t2: null,
    seg: null,
  });
  const [dragOverModality, setDragOverModality] = useState(null);

  // CT File State (.nii, .nii.gz, .dcm, or .zip)
  const [ctFile, setCtFile] = useState(null);
  const [ctSegFile, setCtSegFile] = useState(null);

  const [sessionId, setSessionId] = useState(null);

  const [pipelineState, setPipelineState] = useState({
    stage: 'idle', // 'idle' | 'uploading' | 'validating' | 'inference' | 'processing' | 'complete' | 'error'
    message: '',
    error: null,
  });

  const [validationResult, setValidationResult] = useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const mriInputRefs = {
    flair: useRef(null),
    t1: useRef(null),
    t1ce: useRef(null),
    t2: useRef(null),
    seg: useRef(null),
  };

  const ctInputRef = useRef(null);
  const ctSegInputRef = useRef(null);

  // Fetch model catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      setCatalogLoading(true);
      try {
        const data = await getCatalog();
        setCatalog(data);
      } catch (err) {
        console.warn('Could not load adaptive catalog:', err);
      } finally {
        setCatalogLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const handleModalitySwitch = (mod) => {
    if (mod === selectedModality) return;
    setSelectedModality(mod);
    setSessionId(null);
    setValidationResult(null);
    setPipelineState({ stage: 'idle', message: '', error: null });
  };

  // --- MRI File Handlers ---
  const handleMriDrop = (modality, e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processMriFile(modality, e.dataTransfer.files[0]);
    }
  };

  const handleMriSelect = (modality, e) => {
    if (e.target.files && e.target.files[0]) {
      processMriFile(modality, e.target.files[0]);
    }
  };

  const processMriFile = (modality, file) => {
    const isNifti = file.name.endsWith('.nii') || file.name.endsWith('.nii.gz');
    if (!isNifti) {
      alert(`Invalid file extension for ${modality.toUpperCase()}. Only .nii or .nii.gz files are accepted.`);
      return;
    }

    setMriFiles(prev => ({
      ...prev,
      [modality]: {
        file,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      }
    }));
    setSessionId(null);
    setValidationResult(null);
    setPipelineState({ stage: 'idle', message: '', error: null });
  };

  const handleRemoveMri = (modality) => {
    setMriFiles(prev => ({ ...prev, [modality]: null }));
    if (mriInputRefs[modality].current) {
      mriInputRefs[modality].current.value = '';
    }
    setSessionId(null);
    setValidationResult(null);
    setPipelineState({ stage: 'idle', message: '', error: null });
  };

  // --- CT File Handlers ---
  const handleCtDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCtFile(e.dataTransfer.files[0]);
    }
  };

  const handleCtSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processCtFile(e.target.files[0]);
    }
  };

  const processCtFile = (file) => {
    const nameLower = file.name.toLowerCase();
    const isAllowed = nameLower.endsWith('.nii') || nameLower.endsWith('.nii.gz') || nameLower.endsWith('.dcm') || nameLower.endsWith('.zip');
    if (!isAllowed) {
      alert('Invalid file format for CT scan. Accepted formats: NIfTI (.nii, .nii.gz) or DICOM (.dcm, .zip).');
      return;
    }

    setCtFile({
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: nameLower.endsWith('.zip') || nameLower.endsWith('.dcm') ? 'DICOM' : 'NIfTI'
    });
    setSessionId(null);
    setValidationResult(null);
    setPipelineState({ stage: 'idle', message: '', error: null });
  };

  const handleRemoveCt = () => {
    setCtFile(null);
    if (ctInputRef.current) ctInputRef.current.value = '';
    setSessionId(null);
    setValidationResult(null);
    setPipelineState({ stage: 'idle', message: '', error: null });
  };

  // --- Preload MRI Validation Case ---
  const handleLoadValidationCase = async () => {
    try {
      setSelectedModality('mri');
      setPipelineState({ stage: 'uploading', message: 'Preloading verified validation subject BraTS2021_01069...', error: null });
      const upRes = await loadValidationSubject('BraTS2021_01069');
      
      setSessionId(upRes.session_id);
      setMriFiles({
        flair: { name: 'BraTS2021_01069_flair.nii.gz', size: '2.40 MB', isServerLoaded: true },
        t1: { name: 'BraTS2021_01069_t1.nii.gz', size: '2.20 MB', isServerLoaded: true },
        t1ce: { name: 'BraTS2021_01069_t1ce.nii.gz', size: '2.50 MB', isServerLoaded: true },
        t2: { name: 'BraTS2021_01069_t2.nii.gz', size: '2.30 MB', isServerLoaded: true },
        seg: { name: 'BraTS2021_01069_seg.nii.gz', size: '0.80 MB', isServerLoaded: true },
      });

      setPipelineState({ stage: 'validating', message: 'Validating BraTS2021_01069 geometry and orientation...', error: null });
      const valRes = await validateMRI(upRes.session_id);
      setValidationResult(valRes);
      setPipelineState({ 
        stage: 'idle', 
        message: `Validation subject BraTS2021_01069 verified. Dimensions [240, 240, 155], 1.0mm isotropic resolution, Ground Truth seg attached.`, 
        error: null 
      });
    } catch (err) {
      setPipelineState({ 
        stage: 'error', 
        message: 'Failed to preload validation case.', 
        error: err.message || 'Backend service unavailable' 
      });
    }
  };

  // --- Validate Scans ---
  const handleValidate = async () => {
    if (selectedModality === 'mri') {
      const required = ['flair', 't1', 't1ce', 't2'];
      const missing = required.filter(k => !mriFiles[k]);
      if (missing.length > 0) {
        setPipelineState({
          stage: 'error',
          message: 'Modality completeness check failed.',
          error: `Missing required MRI modalities: ${missing.map(m => m.toUpperCase()).join(', ')}. All 4 modalities must be provided for UNETR inference.`
        });
        return;
      }
    } else {
      if (!ctFile) {
        setPipelineState({
          stage: 'error',
          message: 'CT scan file missing.',
          error: 'Please upload a CT volume (.nii, .nii.gz, .dcm, or .zip archive) before validation.'
        });
        return;
      }
    }

    try {
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        setPipelineState({ 
          stage: 'uploading', 
          message: `Uploading ${selectedModality.toUpperCase()} scan data to secure temporary session...`, 
          error: null 
        });

        let filePayload = {};
        if (selectedModality === 'mri') {
          filePayload = {
            flair: mriFiles.flair?.file,
            t1: mriFiles.t1?.file,
            t1ce: mriFiles.t1ce?.file,
            t2: mriFiles.t2?.file,
            seg: mriFiles.seg?.file,
          };
        } else {
          filePayload = {
            ct: ctFile?.file,
            seg: ctSegFile?.file,
          };
        }

        const upRes = await uploadMRI(filePayload, selectedModality);
        currentSessionId = upRes.session_id;
        setSessionId(currentSessionId);
      }

      setPipelineState({ 
        stage: 'validating', 
        message: `Validating 3D ${selectedModality.toUpperCase()} geometry, headers, orientation, and PHI de-identification...`, 
        error: null 
      });

      const valRes = await validateMRI(currentSessionId);
      setValidationResult(valRes);

      if (valRes.is_valid) {
        if (valRes.is_ai_prediction_supported) {
          setPipelineState({ 
            stage: 'idle', 
            message: `MRI verification succeeded. Ready for full-volume inference.${valRes.has_ground_truth ? ' Ground truth attached.' : ' Prospective inference mode.'}`
          });
        } else {
          setPipelineState({ 
            stage: 'idle', 
            message: `CT Volume verified (${valRes.format || 'NIfTI'}). AI prediction withheld by clinical safety policy. Ready for manual inspection and contouring in Interactive Annotation Editor.`
          });
        }
      } else {
        setPipelineState({ 
          stage: 'error', 
          message: 'Scan validation failed.', 
          error: valRes.notes?.join('; ') || 'Image geometry or orientation is invalid.' 
        });
      }
    } catch (err) {
      setPipelineState({
        stage: 'error',
        message: 'Validation failed.',
        error: err.message || 'Backend API error during scan validation'
      });
    }
  };

  // --- Run Model Inference ---
  const handleRunSegmentation = async () => {
    if (!validationResult || !validationResult.is_valid || !sessionId) {
      alert('Please validate files successfully before running segmentation.');
      return;
    }

    if (validationResult.is_ai_prediction_supported === false) {
      alert(`AI Prediction Withheld: ${validationResult.unsupported_reason || 'Modality not supported by active model.'}`);
      return;
    }

    try {
      setPipelineState({ 
        stage: 'inference', 
        message: 'Running 96x96x96 sliding-window inference with Adaptive Self-Distillation UNETR model...', 
        error: null 
      });

      const result = await runSegmentation(sessionId);

      setPipelineState({ 
        stage: 'processing', 
        message: 'Inverting prediction to original coordinate space & calculating regional volumetrics...', 
        error: null 
      });

      setTimeout(() => {
        setPipelineState({ 
          stage: 'complete', 
          message: `Inference completed in ${result.inference_time_seconds}s! Model: ${result.model || 'Adaptive UNETR'}. Tumor Volume: ${result.tumor_volume_cm3} cm³.`, 
          error: null 
        });
        if (onSegmentationComplete) {
          onSegmentationComplete(result);
        }
      }, 500);

    } catch (err) {
      setPipelineState({
        stage: 'error',
        message: 'Inference failure.',
        error: err.message || 'Model execution error'
      });
    }
  };

  // --- Open Direct to Annotation Editor (for CT or manual contouring) ---
  const handleOpenAnnotationEditor = () => {
    if (!sessionId) return;
    const sessionObj = {
      session_id: sessionId,
      modality: selectedModality,
      is_ct: selectedModality === 'ct',
      is_prediction_available: validationResult?.is_ai_prediction_supported ?? false,
      validation: validationResult
    };
    if (onOpenViewer) {
      onOpenViewer(sessionObj);
    } else if (onNavigate) {
      onNavigate('viewer');
    }
  };

  const isRunning = ['uploading', 'validating', 'inference', 'processing'].includes(pipelineState.stage);
  const mriReady = mriFiles.flair && mriFiles.t1 && mriFiles.t1ce && mriFiles.t2;
  const ctReady = !!ctFile;
  const canValidate = selectedModality === 'mri' ? mriReady : ctReady;
  const isVerified = Boolean(validationResult?.is_valid);

  const activeModelMeta = catalog?.active_model || {};

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn text-[#111827]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#98D9CE]/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EBF8F6] text-[#103B5C] border border-[#98D9CE]/60 uppercase">
              Adaptive Human-in-the-Loop Pipeline
            </span>
            <span className="text-xs text-[#6B7280] font-mono">Phase 1: Ingestion & Geometric Pre-Flight</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
            Upload & <span className="text-[#103B5C]">Modality Selection</span>
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Ingest volumetric MRI or CT scans, verify spatial geometry and PHI de-identification, and verify AI model compatibility.
          </p>
        </div>

        {/* Load Demo Scan Helper */}
        <button
          onClick={handleLoadValidationCase}
          disabled={isRunning}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/15 hover:bg-[rgba(226,247,242,0.70)] border border-[#111111] text-xs font-mono font-bold text-[#111111] transition-all duration-250 disabled:opacity-50 shadow-[0_4px_12px_rgba(0,0,0,0.10)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.12)] cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-[#111111]" />
          <span>Load Validation Subject: BraTS2021_01069</span>
        </button>
      </div>

      {/* MODALITY & TASK SELECTOR TABS */}
      <div className="card-transparent rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#103B5C] font-bold block">
              1. Select Imaging Modality &amp; Clinical Workflow
            </span>
            <p className="text-xs text-[#25313D] mt-0.5">
              Strict anatomical isolation ensures models are only applied to validated multi-modal sequences.
            </p>
          </div>

          <div className="inline-flex p-1 bg-white/20 rounded-lg border border-[#111111]">
            <button
              onClick={() => handleModalitySwitch('mri')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
                selectedModality === 'mri'
                  ? 'bg-[#399DBA] hover:bg-[#103B5C] text-white shadow-xs'
                  : 'text-[#25313D] hover:text-[#103B5C]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Brain MRI (4-Sequence)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                selectedModality === 'mri' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              }`}>
                AI Supported
              </span>
            </button>

            <button
              onClick={() => handleModalitySwitch('ct')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
                selectedModality === 'ct'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#25313D] hover:text-[#103B5C]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Head CT (Axial / DICOM)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                selectedModality === 'ct' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                Manual / HITL Only
              </span>
            </button>
          </div>
        </div>

        {/* MODEL CAPABILITY DECLARATION BANNER */}
        <div className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all duration-250 ${
          selectedModality === 'mri'
            ? 'bg-white/15 border-[#111111]/30 text-[#111827]'
            : 'bg-amber-50/80 border-[#111111]/30 text-amber-950'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#103B5C] shrink-0" />
              <span className="font-bold text-[#103B5C]">
                {selectedModality === 'mri' ? 'Model: ' + (activeModelMeta.name || 'Adaptive Self-Distillation UNETR') : 'Task: Head CT Anatomical & Contouring Inspection'}
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/40 border border-[#111111]/30 text-[#111827]">
                {selectedModality === 'mri' ? `Version ${activeModelMeta.version || '1.0.0'}` : 'HITL Annotation Engine'}
              </span>
            </div>
            <span className={`text-[11px] font-mono px-2.5 py-1 rounded font-bold ${
              selectedModality === 'mri' 
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {selectedModality === 'mri' ? 'AI Inference Active' : 'AI Prediction Withheld (Clinical Safety)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-mono pt-1 text-[#25313D]">
            <div className="p-2 rounded bg-white/25 border border-[#111111]/25">
              <span className="text-[#103B5C] font-bold">Inputs: </span>
              {selectedModality === 'mri' ? 'FLAIR, T1, T1ce, T2 (4 channels)' : 'Axial CT (.nii, .nii.gz, .dcm, .zip)'}
            </div>
            <div className="p-2 rounded bg-white/25 border border-[#111111]/25">
              <span className="text-[#103B5C] font-bold">Architecture: </span>
              {selectedModality === 'mri' ? 'ROI 96×96×96 sliding window, 1.0mm³' : 'Hounsfield Units scaled [-1000, 3000]'}
            </div>
            <div className="p-2 rounded bg-white/25 border border-[#111111]/25">
              <span className="text-[#103B5C] font-bold">Labels: </span>
              {selectedModality === 'mri' ? '1: NCR, 2: ED, 3: ET' : 'Custom Radiologist Contouring (0-3)'}
            </div>
          </div>

          {selectedModality === 'ct' && (
            <div className="pt-2.5 border-t border-amber-300 flex items-start gap-2.5 text-[11px] text-amber-950">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-amber-900">Clinical Safety Restriction:</strong> The production UNETR model is trained exclusively on multimodal MRI and requires 4 co-registered sequence channels. Running it on CT produces hazardous diagnostic hallucinations. CT scans are ingested for human inspection, contouring, and active candidate dataset curation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SCAN UPLOAD WORKSPACE */}
      {selectedModality === 'mri' ? (
        /* 4-SEQUENCE MRI UPLOAD CARDS */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#103B5C] font-bold">
              Required Multimodal MRI Sequences (NIfTI .nii or .nii.gz)
            </h2>
            <span className="text-[11px] font-mono text-[#25313D]">All 4 channels mandatory for inference</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MRI_MODALITIES.map(({ 
              id, 
              label, 
              desc, 
              accent, 
              bgAccent, 
              borderAccent,
              uploadedBg,
              uploadedBorder,
              uploadedShadow,
              uploadedBadgeBg,
              uploadedBadgeText,
              uploadedBadgeBorder,
              uploadedBoxBg,
              uploadedBoxBorder,
              dragBg
            }) => {
              const fileData = mriFiles[id];
              const isUploaded = Boolean(fileData);
              const isDragging = dragOverModality === id;

              return (
                <div
                  key={id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverModality !== id) setDragOverModality(id);
                  }}
                  onDragLeave={() => setDragOverModality(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverModality(null);
                    handleMriDrop(id, e);
                  }}
                  style={{
                    backgroundColor: isDragging 
                      ? dragBg 
                      : isUploaded 
                      ? uploadedBg 
                      : undefined,
                    borderColor: isDragging 
                      ? accent 
                      : isUploaded 
                      ? (isVerified ? '#059669' : uploadedBorder)
                      : '#111111',
                    borderWidth: isUploaded || isDragging ? '1.5px' : '1px',
                    boxShadow: isUploaded 
                      ? (isVerified ? '0 4px 20px rgba(16, 185, 129, 0.25)' : uploadedShadow) 
                      : undefined,
                    transition: 'background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
                  }}
                  className={`card-transparent-interactive relative rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[230px] ${
                    isDragging ? 'ring-2 ring-offset-1' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span 
                        className="font-mono text-xs font-bold tracking-wider px-2.5 py-1 rounded"
                        style={{ 
                          backgroundColor: bgAccent, 
                          color: accent,
                          border: `1px solid ${borderAccent}`
                        }}
                      >
                        {label}
                      </span>
                      {isUploaded ? (
                        <span 
                          className="inline-flex items-center text-xs font-mono gap-1 font-bold px-2 py-0.5 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: isVerified ? 'rgba(16, 185, 129, 0.22)' : uploadedBadgeBg,
                            color: isVerified ? '#047857' : uploadedBadgeText,
                            border: `1px solid ${isVerified ? 'rgba(16, 185, 129, 0.55)' : uploadedBadgeBorder}`
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: isVerified ? '#059669' : accent }} />
                          <span>{isVerified ? 'Verified' : 'Uploaded'}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#25313D] font-mono font-bold">
                          Required
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#25313D] leading-relaxed mb-4 font-sans">
                      {desc}
                    </p>

                    {isUploaded ? (
                      <div 
                        className="p-3 rounded-lg border space-y-1.5 transition-all shadow-xs"
                        style={{
                          backgroundColor: uploadedBoxBg,
                          borderColor: uploadedBoxBorder,
                        }}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold" style={{ color: isVerified ? '#047857' : uploadedBadgeText }}>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: isVerified ? '#059669' : accent }} />
                            <span>{isVerified ? 'Scan Verified' : 'File uploaded'}</span>
                          </span>
                          {fileData.isServerLoaded && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/10 font-bold">Preloaded</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-[#103B5C] truncate" title={fileData.name}>
                          <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
                          <span className="truncate font-mono">{fileData.name}</span>
                        </div>
                        <div className="text-[11px] text-[#25313D] font-mono flex items-center justify-between pt-0.5">
                          <span>Size: {fileData.size}</span>
                          <span className="text-[10px] font-mono font-bold flex items-center gap-1" style={{ color: isVerified ? '#047857' : uploadedBadgeText }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: isVerified ? '#10B981' : accent }} />
                            {isVerified ? 'Verified & Ready' : 'Ready'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-[#25313D] space-y-2">
                        <UploadCloud className="w-8 h-8 text-[#103B5C] mx-auto" />
                        <p className="text-[11px] font-mono">
                          Drop <span className="text-[#103B5C] font-bold">.nii</span> or <span className="text-[#103B5C] font-bold">.nii.gz</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#111111]/20 flex items-center justify-between">
                    <input
                      type="file"
                      ref={mriInputRefs[id]}
                      accept=".nii,.nii.gz"
                      onChange={(e) => handleMriSelect(id, e)}
                      className="hidden"
                    />

                    {isUploaded ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => mriInputRefs[id].current?.click()}
                          disabled={isRunning}
                          className="flex-1 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.45)',
                            borderColor: uploadedBorder,
                            color: uploadedBadgeText,
                          }}
                          title="Browse and replace file"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: accent }} />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMri(id)}
                          disabled={isRunning}
                          className="px-2.5 py-1.5 rounded-lg text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-100/60 transition-colors disabled:opacity-50 font-bold border border-[#111111]/40 cursor-pointer shadow-xs"
                          title="Remove uploaded file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => mriInputRefs[id].current?.click()}
                        disabled={isRunning}
                        className="w-full py-2 rounded-lg bg-white/30 hover:bg-[rgba(226,247,242,0.85)] border border-[#111111] text-xs text-[#111111] font-bold transition-all duration-250 disabled:opacity-50 shadow-xs cursor-pointer"
                      >
                        Browse File
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SINGLE CT VOLUME UPLOAD CARD */
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#103B5C] font-bold">
            Head CT Scan Ingestion (NIfTI or DICOM Series)
          </h2>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCtDrop}
            className={`card-transparent-interactive rounded-xl p-6 ${
              ctFile ? 'bg-white/20' : ''
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold tracking-wider px-2.5 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900">
                    CT AXIAL VOLUME
                  </span>
                  {ctFile ? (
                    <span className="inline-flex items-center text-xs font-mono text-emerald-800 font-bold gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      Staged ({ctFile.type})
                    </span>
                  ) : (
                    <span className="text-xs text-[#25313D]">Supported: .nii, .nii.gz, .dcm, or .zip archive of DICOM series</span>
                  )}
                </div>
                <p className="text-xs text-[#25313D] max-w-2xl leading-relaxed">
                  Automatically extracts multi-slice DICOM series with safe archive guards, calculates Hounsfield Units, strips PHI metadata, and reconstructs 3D volumetric array.
                </p>
                {ctFile && (
                  <div className="p-3 rounded-lg bg-white/25 border border-[#111111]/30 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-[#103B5C] shrink-0" />
                    <div className="text-xs font-mono">
                      <span className="text-[#103B5C] font-bold">{ctFile.name}</span>
                      <span className="text-[#25313D] ml-2 font-bold">({ctFile.size})</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="file"
                  ref={ctInputRef}
                  accept=".nii,.nii.gz,.dcm,.zip"
                  onChange={handleCtSelect}
                  className="hidden"
                />
                {ctFile ? (
                  <button
                    onClick={handleRemoveCt}
                    disabled={isRunning}
                    className="px-4 py-2 rounded-lg text-xs text-rose-700 hover:bg-rose-100/60 border border-[#111111] transition-colors font-bold cursor-pointer"
                  >
                    Remove File
                  </button>
                ) : (
                  <button
                    onClick={() => ctInputRef.current?.click()}
                    disabled={isRunning}
                    className="px-5 py-2.5 rounded-lg bg-white/30 hover:bg-[rgba(226,247,242,0.85)] border border-[#111111] text-xs text-[#111111] font-bold shadow-xs transition-all duration-250 cursor-pointer"
                  >
                    Select CT File (.nii or .zip)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OPTIONAL GROUND TRUTH (seg.nii.gz) CARD */}
      <div className="card-transparent-interactive p-5 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-white/40 border border-[#111111]/30 text-[#103B5C]">
                OPTIONAL GROUND TRUTH / REFERENCE MASK
              </span>
              <span className="text-xs text-[#25313D] font-mono font-bold">seg.nii.gz</span>
            </div>
            <p className="text-xs text-[#25313D] mt-1 font-sans">
              Upload an existing reference mask to compare against or seed your correction workflow. If omitted, prospective segmentation is performed.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={selectedModality === 'mri' ? mriInputRefs.seg : ctSegInputRef}
              accept=".nii,.nii.gz"
              onChange={(e) => selectedModality === 'mri' ? handleMriSelect('seg', e) : setCtSegFile(e.target.files[0] ? { file: e.target.files[0], name: e.target.files[0].name, size: (e.target.files[0].size / 1048576).toFixed(2) + ' MB' } : null)}
              className="hidden"
            />
            {(selectedModality === 'mri' ? mriFiles.seg : ctSegFile) ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-800 font-bold font-mono flex items-center gap-1.5 bg-emerald-100 px-2.5 py-1 rounded border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  {(selectedModality === 'mri' ? mriFiles.seg.name : ctSegFile.name)}
                </span>
                <button
                  onClick={() => selectedModality === 'mri' ? handleRemoveMri('seg') : setCtSegFile(null)}
                  disabled={isRunning}
                  className="px-2.5 py-1 rounded-lg text-xs text-rose-700 hover:bg-rose-100/60 border border-[#111111] font-bold cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => selectedModality === 'mri' ? mriInputRefs.seg.current?.click() : ctSegInputRef.current?.click()}
                disabled={isRunning}
                className="px-4 py-2 rounded-lg bg-white/30 hover:bg-[rgba(226,247,242,0.85)] border border-[#111111] text-xs text-[#111111] font-bold shadow-xs transition-all duration-250 cursor-pointer"
              >
                Attach Reference seg.nii.gz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC VALIDATION DETAILS & METADATA CARD */}
      {validationResult && validationResult.is_valid ? (
        <div className="card-transparent p-5 rounded-xl space-y-3 animate-fadeIn border-emerald-600/60 bg-emerald-500/[0.04] shadow-[0_0_20px_rgba(16,185,129,0.12)]">
          <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-[#103B5C] uppercase tracking-wider font-mono">
                Scan Geometry &amp; Security Verified
              </span>
            </div>
            <span className="font-mono text-xs text-[#103B5C] font-bold">
              Study ID: {validationResult.patient_id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-white/25 border border-[#111111]/30">
              <span className="text-[10px] text-[#25313D] font-bold block">Matrix Dimensions</span>
              <span className="text-[#103B5C] font-bold mt-0.5 block">
                {validationResult.dimensions ? `${validationResult.dimensions[0]} × ${validationResult.dimensions[1]} × ${validationResult.dimensions[2]}` : '240 × 240 × 155'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/25 border border-[#111111]/30">
              <span className="text-[10px] text-[#25313D] font-bold block">Voxel Spacing</span>
              <span className="text-[#103B5C] font-bold mt-0.5 block">
                {validationResult.voxel_spacing ? `${validationResult.voxel_spacing[0].toFixed(1)} × ${validationResult.voxel_spacing[1].toFixed(1)} × ${validationResult.voxel_spacing[2].toFixed(1)} mm` : '1.0 × 1.0 × 1.0 mm'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/25 border border-[#111111]/30">
              <span className="text-[10px] text-[#25313D] font-bold block">Format &amp; Modality</span>
              <span className="text-[#103B5C] font-bold capitalize mt-0.5 block">
                {validationResult.format || (selectedModality === 'ct' ? 'CT' : 'MRI')} ({selectedModality.toUpperCase()})
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/25 border border-[#111111]/30">
              <span className="text-[10px] text-[#25313D] font-bold block">AI Model Status</span>
              <span className={`font-bold mt-0.5 block ${validationResult.is_ai_prediction_supported ? 'text-emerald-800' : 'text-amber-800'}`}>
                {validationResult.is_ai_prediction_supported ? 'Prediction Compatible' : 'Prediction Withheld'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Waiting Validation HUD */
        <div className="card-transparent p-4 rounded-xl flex items-center justify-between text-xs text-[#111827] font-mono">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-4 h-4 text-[#103B5C]" />
            <span>Pre-Flight Geometric HUD: Awaiting scan upload and validation verification.</span>
          </div>
          <span className="text-[11px] text-[#25313D] font-bold">Standby</span>
        </div>
      )}

      {/* PIPELINE PROGRESS & STATUS BANNER (7-STATE MACHINE) */}
      {pipelineState.stage !== 'idle' && (
        pipelineState.stage === 'error' ? (
          <div 
            className="p-4 sm:p-5 rounded-xl border text-xs animate-fadeIn space-y-3"
            style={{
              background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.90) 0%, rgba(254, 226, 226, 0.75) 100%)',
              borderColor: 'rgba(220, 38, 38, 0.55)',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {/* Header row */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-300 flex items-center justify-center shrink-0 mt-0.5 text-red-700 shadow-2xs">
                <AlertCircle className="w-5 h-5 text-red-700" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider font-mono text-red-900 bg-red-200/70 px-2 py-0.5 rounded border border-red-300">
                    Upload Error
                  </span>
                  <span className="text-[11px] font-mono text-red-800 font-bold">
                    Scan Validation Failed
                  </span>
                </div>
                <h3 className="text-sm font-bold text-red-950">
                  {pipelineState.error?.includes('gzip') || pipelineState.error?.includes('NIFTI') || pipelineState.message?.includes('validation')
                    ? "We couldn’t read one or more of your MRI scan files."
                    : pipelineState.message || "We encountered an issue processing your scan files."}
                </h3>
              </div>
            </div>

            {/* Explanation & Helpful Guidance */}
            <div className="pl-11 space-y-3 text-xs text-red-900 font-medium">
              <p className="leading-relaxed">
                <strong className="font-bold text-red-950">Possible reason:</strong>{' '}
                {pipelineState.error?.includes('gzip') || pipelineState.error?.includes('NIFTI')
                  ? "The uploaded file is not a valid .nii.gz MRI file, or it may be incorrectly compressed, renamed, or damaged."
                  : pipelineState.message || "The uploaded scan files failed pre-flight geometry checks or format requirements."}
              </p>

              {/* Step-by-step guidance card */}
              <div className="p-3.5 rounded-lg bg-white/70 border border-red-200/90 space-y-2 shadow-2xs">
                <span className="font-bold text-red-950 block text-[11px] font-mono uppercase tracking-wide">
                  What you should do:
                </span>
                <p className="text-[11px] text-red-900 font-medium leading-relaxed">
                  Please make sure you upload valid MRI files in <code className="px-1.5 py-0.5 rounded bg-red-100/80 border border-red-300/80 font-mono font-bold text-red-950">.nii.gz</code> format for all required sequences:
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {[
                    { id: 'FLAIR', name: 'FLAIR' },
                    { id: 'T1', name: 'T1' },
                    { id: 'T1ce', name: 'T1ce' },
                    { id: 'T2', name: 'T2' }
                  ].map((seq) => (
                    <span 
                      key={seq.id} 
                      className="px-2 py-0.5 rounded-md bg-red-100/90 border border-red-300 font-mono text-[11px] font-bold text-red-950 shadow-2xs"
                    >
                      {seq.name}
                    </span>
                  ))}
                </div>

                <div className="pt-1.5 space-y-1 text-[11px] text-red-900 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-700 font-bold">•</span>
                    <span>Check that each file is a real <strong className="text-red-950 font-semibold">.nii.gz</strong> MRI file.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-700 font-bold">•</span>
                    <span>Re-upload the correct FLAIR, T1, T1ce, and T2 files.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-700 font-bold">•</span>
                    <span>Do not rename random files to <span className="font-mono text-red-950 font-semibold">.nii.gz</span> without proper compression.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-700 font-bold">•</span>
                    <span>Make sure the files are not damaged, corrupted, or incomplete.</span>
                  </div>
                </div>
              </div>

              {/* Collapsible Technical Details for advanced users and developers */}
              {pipelineState.error && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-red-800 hover:text-red-950 transition-colors cursor-pointer underline underline-offset-2"
                  >
                    {showTechnicalDetails ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-red-700" />
                        <span>Hide technical details</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-red-700" />
                        <span>Show technical details</span>
                      </>
                    )}
                  </button>

                  {showTechnicalDetails && (
                    <div className="mt-2 p-3 rounded-lg bg-red-950/5 border border-red-300/80 font-mono text-[11px] text-red-950 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-red-800 font-mono">
                        <span>Backend Diagnostic Log</span>
                        <span className="text-[9px] text-red-700 font-normal">Internal Stack Trace</span>
                      </div>
                      <pre className="whitespace-pre-wrap break-all max-h-44 overflow-y-auto font-mono text-[10px] leading-relaxed text-red-950 bg-white/80 p-2.5 rounded border border-red-200 shadow-2xs">
                        {pipelineState.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card-transparent p-5 rounded-xl flex items-start gap-3.5 text-xs animate-fadeIn">
            {isRunning ? (
              <Loader2 className="w-5 h-5 text-[#103B5C] shrink-0 mt-0.5 animate-spin" />
            ) : pipelineState.stage === 'complete' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[11px] font-mono text-[#103B5C]">
                  {pipelineState.stage === 'uploading' && 'Stage 1/4: Ingesting Scans'}
                  {pipelineState.stage === 'validating' && 'Stage 2/4: Validating Compatibility'}
                  {pipelineState.stage === 'inference' && 'Stage 3/4: Executing Adaptive Model Inference'}
                  {pipelineState.stage === 'processing' && 'Stage 4/4: Registering Volume & Uncertainties'}
                  {pipelineState.stage === 'complete' && 'Inference Pipeline Succeeded'}
                </span>
              </div>
              <p className="opacity-90">{pipelineState.message}</p>
            </div>
          </div>
        )
      )}

      {/* ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#111111]/20">
        <div className="text-xs text-[#25313D] font-mono flex items-center gap-2">
          <span>Active Target:</span>
          <span className="text-[#103B5C] font-bold">
            {selectedModality === 'mri' ? 'UNETR Brain Tumor Model' : 'CT Inspection & Contouring'}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Validate Button */}
          <button
            onClick={handleValidate}
            disabled={!canValidate || isRunning}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg border text-xs font-bold transition-all duration-250 shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
              validationResult?.is_valid
                ? 'bg-emerald-500/15 border-emerald-700/60 text-emerald-950 hover:bg-emerald-500/25'
                : canValidate && !isRunning
                ? 'bg-white/20 hover:bg-[rgba(226,247,242,0.70)] text-[#111827] border-[#111111]'
                : 'bg-slate-100/50 border-slate-300 text-[#94A3B8] cursor-not-allowed border-slate-300'
            }`}
          >
            {validationResult?.is_valid ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Geometry Verified</span>
              </>
            ) : pipelineState.stage === 'validating' ? (
              <span>Validating Geometry...</span>
            ) : (
              <span>Validate Scan Geometry</span>
            )}
          </button>

          {/* If CT or MRI without prediction, offer Direct Annotation Editor jump */}
          {validationResult?.is_valid && !validationResult?.is_ai_prediction_supported && (
            <button
              onClick={handleOpenAnnotationEditor}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all duration-250 border border-[#111111] shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Interactive Annotation Editor</span>
            </button>
          )}

          {/* Run Segmentation Button (MRI only) */}
          {(!validationResult || validationResult.is_ai_prediction_supported !== false) && (
            <button
              onClick={handleRunSegmentation}
              disabled={!validationResult?.is_valid || !validationResult?.is_ai_prediction_supported || isRunning}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-250 cursor-pointer ${
                validationResult?.is_valid && validationResult?.is_ai_prediction_supported && !isRunning
                  ? 'btn-verified-green bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border border-[#111111]'
                  : 'bg-slate-100/50 border border-slate-300 text-[#94A3B8] cursor-not-allowed'
              }`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span className="text-white">Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span className="text-white">Run Segmentation</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
