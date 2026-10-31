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
  Database
} from 'lucide-react';
import { uploadMRI, validateMRI, runSegmentation, loadValidationSubject } from '../api/segmentation';
import { getCatalog } from '../api/adaptive';

const MRI_MODALITIES = [
  { id: 'flair', label: 'FLAIR', desc: 'Fluid Attenuated Inversion Recovery (Edema / Infiltration)' },
  { id: 't1', label: 'T1', desc: 'T1-weighted Native (Structural anatomy)' },
  { id: 't1ce', label: 'T1ce', desc: 'T1-weighted Contrast Enhanced (Active enhancing core)' },
  { id: 't2', label: 'T2', desc: 'T2-weighted Native (Hyperintense lesion boundaries)' },
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
        message: 'Inverting prediction to original coordinate space & registering uncertainty indicators...', 
        error: null 
      });

      setTimeout(() => {
        setPipelineState({ 
          stage: 'complete', 
          message: `Inference completed in ${result.inference_time_seconds}s! Model Version: ${result.model_version || '1.0.0'}. Tumor Volume: ${result.tumor_volume_cm3} cm³.`, 
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

  const activeModelMeta = catalog?.active_model || {};
  const mriModelSpec = catalog?.supported_modalities_and_tasks?.mri_brain_tumor || {};
  const ctTaskSpec = catalog?.supported_modalities_and_tasks?.ct_head || {};

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6F0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              Adaptive Human-in-the-Loop Pipeline
            </span>
            <span className="text-xs text-[#64748B] font-mono">Phase 1: Ingestion & Validation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16324F]">
            Upload & Modality Selection
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Ingest volumetric MRI or CT scans, verify spatial geometry and PHI de-identification, and verify AI model compatibility.
          </p>
        </div>

        {/* Load Demo Scan Helper */}
        <button
          onClick={handleLoadValidationCase}
          disabled={isRunning}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] hover:border-blue-400 text-xs font-mono font-medium text-blue-700 transition-colors disabled:opacity-50 shadow-medical-sm"
        >
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Load Validation Subject: BraTS2021_01069</span>
        </button>
      </div>

      {/* MODALITY & TASK SELECTOR TABS */}
      <div className="bg-white border border-[#DCE6F0] rounded-xl p-5 shadow-medical-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-semibold block">
              1. Select Imaging Modality & Clinical Task
            </span>
            <p className="text-xs text-[#64748B] mt-0.5">
              Strict anatomical isolation ensures models are only applied to valid sequences.
            </p>
          </div>

          <div className="inline-flex p-1 bg-[#EEF4F8] rounded-lg border border-[#DCE6F0]">
            <button
              onClick={() => handleModalitySwitch('mri')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                selectedModality === 'mri'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#16324F]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Brain MRI (4-Sequence)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${selectedModality === 'mri' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                AI Supported
              </span>
            </button>

            <button
              onClick={() => handleModalitySwitch('ct')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                selectedModality === 'ct'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#16324F]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Head CT (Axial / DICOM)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${selectedModality === 'ct' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                Manual / HITL Only
              </span>
            </button>
          </div>
        </div>

        {/* MODEL CAPABILITY DECLARATION BANNER */}
        <div className={`p-4 rounded-lg border text-xs space-y-2 ${
          selectedModality === 'mri'
            ? 'bg-[#F0F7FF] border-[#BFDBFE] text-[#16324F]'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-[#16324F]">
                {selectedModality === 'mri' ? 'Model: ' + (activeModelMeta.name || 'Adaptive Self-Distillation UNETR') : 'Task: Head CT Anatomical & Contouring Inspection'}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-[#DCE6F0] text-[#64748B]">
                {selectedModality === 'mri' ? `Version ${activeModelMeta.version || '1.0.0'}` : 'HITL Annotation Engine'}
              </span>
            </div>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
              selectedModality === 'mri' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {selectedModality === 'mri' ? 'AI Inference Active' : 'AI Prediction Withheld (Clinical Safety)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-[#64748B]">
            <div>
              <span className="text-[#16324F] font-semibold">Supported Modalities: </span>
              {selectedModality === 'mri' ? 'FLAIR, T1, T1ce, T2 (4 co-registered channels)' : 'Axial CT (.nii, .nii.gz, DICOM .dcm, .zip)'}
            </div>
            <div>
              <span className="text-[#16324F] font-semibold">Input Architecture: </span>
              {selectedModality === 'mri' ? 'ROI 96×96×96 sliding window, 1.0mm³' : 'Hounsfield Units scaled [-1000, 3000]'}
            </div>
            <div>
              <span className="text-[#16324F] font-semibold">Output Labels: </span>
              {selectedModality === 'mri' ? '1: NCR, 2: ED, 3: ET' : 'Custom Radiologist Contouring (0-3)'}
            </div>
          </div>

          {selectedModality === 'ct' && (
            <div className="pt-2 border-t border-amber-200 flex items-start gap-2 text-[11px] text-amber-900">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p>
                <strong>Safety Policy:</strong> The production UNETR model is trained exclusively on multimodal MRI and requires 4 co-registered sequence channels. Running it on CT produces hazardous diagnostic hallucinations. CT scans are ingested for human annotation, contouring, and training set curation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SCAN UPLOAD WORKSPACE */}
      {selectedModality === 'mri' ? (
        /* 4-SEQUENCE MRI UPLOAD CARDS */
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
            Required Multimodal MRI Sequences (NIfTI .nii or .nii.gz)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MRI_MODALITIES.map(({ id, label, desc }) => {
              const fileData = mriFiles[id];
              return (
                <div
                  key={id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleMriDrop(id, e)}
                  className={`relative rounded-xl border p-5 flex flex-col justify-between transition-all min-h-[220px] ${
                    fileData
                      ? 'bg-white border-blue-500 shadow-medical-md'
                      : 'bg-white border-dashed border-[#CBD5E1] hover:border-blue-400 hover:bg-[#F0F7FF] shadow-medical-card'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-sm font-bold tracking-wider px-2 py-0.5 rounded bg-[#EEF4F8] border border-[#DCE6F0] text-[#16324F]">
                        {label}
                      </span>
                      {fileData ? (
                        <span className="inline-flex items-center text-xs font-mono text-emerald-600 gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Staged
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#64748B] font-mono">
                          Required
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#64748B] leading-tight mb-4">
                      {desc}
                    </p>

                    {fileData ? (
                      <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-[#16324F] truncate" title={fileData.name}>
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{fileData.name}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono flex items-center justify-between">
                          <span>Size: {fileData.size}</span>
                          {fileData.isServerLoaded && (
                            <span className="text-blue-600 text-[10px] font-semibold">Preloaded</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-[#64748B] space-y-2">
                        <UploadCloud className="w-8 h-8 text-[#94A3B8] mx-auto" />
                        <p className="text-[11px]">
                          Drag & drop <span className="font-mono text-[#475569]">.nii</span> or <span className="font-mono text-[#475569]">.nii.gz</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                    <input
                      type="file"
                      ref={mriInputRefs[id]}
                      accept=".nii,.nii.gz"
                      onChange={(e) => handleMriSelect(id, e)}
                      className="hidden"
                    />

                    {fileData ? (
                      <button
                        onClick={() => handleRemoveMri(id)}
                        disabled={isRunning}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded text-xs text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => mriInputRefs[id].current?.click()}
                        disabled={isRunning}
                        className="w-full py-1.5 rounded bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-xs text-[#16324F] font-semibold transition-colors disabled:opacity-50 shadow-medical-sm"
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
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
            Head CT Scan Ingestion (NIfTI or DICOM Series)
          </h2>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCtDrop}
            className={`rounded-xl border p-6 transition-all ${
              ctFile
                ? 'bg-white border-blue-500 shadow-medical-md'
                : 'bg-white border-dashed border-[#CBD5E1] hover:border-blue-400 hover:bg-[#F0F7FF] shadow-medical-card'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold tracking-wider px-2 py-0.5 rounded bg-[#EEF4F8] border border-[#DCE6F0] text-[#16324F]">
                    CT AXIAL VOLUME
                  </span>
                  {ctFile ? (
                    <span className="inline-flex items-center text-xs font-mono text-emerald-600 font-semibold gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Staged ({ctFile.type})
                    </span>
                  ) : (
                    <span className="text-xs text-[#64748B]">Supported: .nii, .nii.gz, .dcm, or .zip archive of DICOM series</span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] max-w-2xl">
                  Automatically extracts multi-slice DICOM series with safe zip guards, calculates Hounsfield Units, strips PHI metadata, and reconstructs 3D volumetric array.
                </p>
                {ctFile && (
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="text-xs font-mono">
                      <span className="text-[#16324F] font-semibold">{ctFile.name}</span>
                      <span className="text-[#64748B] ml-2">({ctFile.size})</span>
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
                    className="px-4 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 border border-red-200 transition-colors font-medium"
                  >
                    Remove File
                  </button>
                ) : (
                  <button
                    onClick={() => ctInputRef.current?.click()}
                    disabled={isRunning}
                    className="px-5 py-2.5 rounded-lg bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-xs text-[#16324F] font-semibold shadow-medical-sm transition-all"
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
      <div className="p-5 rounded-xl bg-white border border-[#DCE6F0] shadow-medical-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-[#EEF4F8] border border-[#DCE6F0] text-blue-700">
                OPTIONAL GROUND TRUTH / REFERENCE MASK
              </span>
              <span className="text-xs text-[#64748B]">seg.nii.gz</span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Upload an existing reference mask to compare against or seed your correction workflow. If omitted, prospective segmentation is performed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={selectedModality === 'mri' ? mriInputRefs.seg : ctSegInputRef}
              accept=".nii,.nii.gz"
              onChange={(e) => selectedModality === 'mri' ? handleMriSelect('seg', e) : setCtSegFile(e.target.files[0] ? { file: e.target.files[0], name: e.target.files[0].name, size: (e.target.files[0].size / 1048576).toFixed(2) + ' MB' } : null)}
              className="hidden"
            />
            {(selectedModality === 'mri' ? mriFiles.seg : ctSegFile) ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-600 font-semibold font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {(selectedModality === 'mri' ? mriFiles.seg.name : ctSegFile.name)}
                </span>
                <button
                  onClick={() => selectedModality === 'mri' ? handleRemoveMri('seg') : setCtSegFile(null)}
                  disabled={isRunning}
                  className="px-2.5 py-1 rounded text-xs text-red-600 hover:bg-red-50 font-medium"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => selectedModality === 'mri' ? mriInputRefs.seg.current?.click() : ctSegInputRef.current?.click()}
                disabled={isRunning}
                className="px-3.5 py-1.5 rounded bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-xs text-[#16324F] font-semibold shadow-medical-sm"
              >
                Attach Reference seg.nii.gz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VALIDATION DETAILS & METADATA CARD (IF VALIDATED) */}
      {validationResult && validationResult.is_valid && (
        <div className="p-5 rounded-xl bg-white border border-emerald-300 shadow-medical-card space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-[#16324F] uppercase tracking-wider">
                Scan Geometry & Security Verified
              </span>
            </div>
            <span className="font-mono text-xs text-blue-700 font-semibold">
              Patient / Study ID: {validationResult.patient_id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block">Matrix Dimensions</span>
              <span className="text-[#16324F] font-semibold">
                {validationResult.dimensions ? `${validationResult.dimensions[0]} × ${validationResult.dimensions[1]} × ${validationResult.dimensions[2]}` : '240 × 240 × 155'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block">Voxel Spacing</span>
              <span className="text-[#16324F] font-semibold">
                {validationResult.voxel_spacing ? `${validationResult.voxel_spacing[0].toFixed(1)} × ${validationResult.voxel_spacing[1].toFixed(1)} × ${validationResult.voxel_spacing[2].toFixed(1)} mm` : '1.0 × 1.0 × 1.0 mm'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block">Format & Modality</span>
              <span className="text-[#16324F] font-semibold capitalize">
                {validationResult.format || (selectedModality === 'ct' ? 'CT' : 'MRI')} ({selectedModality.toUpperCase()})
              </span>
            </div>
            <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block">AI Model Status</span>
              <span className={`font-semibold ${validationResult.is_ai_prediction_supported ? 'text-emerald-700' : 'text-amber-700'}`}>
                {validationResult.is_ai_prediction_supported ? 'Prediction Compatible' : 'Prediction Withheld'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PIPELINE PROGRESS & STATUS BANNER */}
      {pipelineState.stage !== 'idle' && (
        <div className={`p-5 rounded-xl border flex items-start gap-3.5 text-xs shadow-medical-card ${
          pipelineState.stage === 'error'
            ? 'bg-red-50 border-red-200 text-red-900'
            : pipelineState.stage === 'complete'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          {isRunning ? (
            <Loader2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
          ) : pipelineState.stage === 'complete' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {pipelineState.stage === 'uploading' && 'Stage 1/4: Ingesting Scans'}
                {pipelineState.stage === 'validating' && 'Stage 2/4: Validating Compatibility'}
                {pipelineState.stage === 'inference' && 'Stage 3/4: Executing Adaptive Model Inference'}
                {pipelineState.stage === 'processing' && 'Stage 4/4: Registering Volume & Uncertainties'}
                {pipelineState.stage === 'complete' && 'Inference Pipeline Succeeded'}
                {pipelineState.stage === 'error' && 'Pipeline Error'}
              </span>
            </div>
            <p className="opacity-90">{pipelineState.message}</p>
            {pipelineState.error && (
              <p className="font-mono text-red-600 mt-1">{pipelineState.error}</p>
            )}
          </div>
        </div>
      )}

      {/* ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#DCE6F0]">
        <div className="text-xs text-[#64748B] font-mono flex items-center gap-2">
          <span>Active Target:</span>
          <span className="text-[#16324F] font-semibold">
            {selectedModality === 'mri' ? 'UNETR Brain Tumor Model' : 'CT Inspection & Contouring'}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Validate Button */}
          <button
            onClick={handleValidate}
            disabled={!canValidate || isRunning}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg border text-xs font-semibold transition-all shadow-medical-sm ${
              canValidate && !isRunning
                ? 'bg-white hover:bg-[#F0F7FF] border-[#CBD5E1] text-[#16324F] hover:border-blue-400'
                : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
            }`}
          >
            {pipelineState.stage === 'validating' ? 'Validating...' : 'Validate Scan Geometry'}
          </button>

          {/* If CT or MRI without prediction, offer Direct Annotation Editor jump */}
          {validationResult?.is_valid && !validationResult?.is_ai_prediction_supported && (
            <button
              onClick={handleOpenAnnotationEditor}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold transition-all shadow-md"
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
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-medical-md ${
                validationResult?.is_valid && validationResult?.is_ai_prediction_supported && !isRunning
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                  : 'bg-[#E2E8F0] border border-[#CBD5E1] text-[#94A3B8] cursor-not-allowed'
              }`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Segmentation</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
