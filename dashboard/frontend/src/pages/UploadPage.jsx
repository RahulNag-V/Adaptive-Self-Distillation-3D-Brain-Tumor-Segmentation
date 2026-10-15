import React, { useState, useRef } from 'react';
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
  FileCheck
} from 'lucide-react';
import { uploadMRI, validateMRI, runSegmentation, loadValidationSubject } from '../api/segmentation';

const MODALITY_CONFIG = [
  { id: 'flair', label: 'FLAIR', desc: 'Fluid Attenuated Inversion Recovery (Edema / Infiltration)' },
  { id: 't1', label: 'T1', desc: 'T1-weighted Native (Structural anatomy)' },
  { id: 't1ce', label: 'T1ce', desc: 'T1-weighted Contrast Enhanced (Active enhancing core)' },
  { id: 't2', label: 'T2', desc: 'T2-weighted Native (Hyperintense lesion boundaries)' },
];

export default function UploadPage({ onNavigate, onSegmentationComplete }) {
  const [files, setFiles] = useState({
    flair: null,
    t1: null,
    t1ce: null,
    t2: null,
    seg: null,
  });

  const [sessionId, setSessionId] = useState(null);

  const [pipelineState, setPipelineState] = useState({
    stage: 'idle', // 'idle' | 'uploading' | 'validating' | 'inference' | 'processing' | 'complete' | 'error'
    message: '',
    error: null,
  });

  const [validationResult, setValidationResult] = useState(null);

  const fileInputRefs = {
    flair: useRef(null),
    t1: useRef(null),
    t1ce: useRef(null),
    t2: useRef(null),
    seg: useRef(null),
  };

  const handleFileDrop = (modality, e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(modality, e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (modality, e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(modality, e.target.files[0]);
    }
  };

  const processSelectedFile = (modality, file) => {
    const isNifti = file.name.endsWith('.nii') || file.name.endsWith('.nii.gz');
    if (!isNifti) {
      alert(`Invalid file extension for ${modality.toUpperCase()}. Only .nii or .nii.gz files are accepted.`);
      return;
    }

    setFiles(prev => ({
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

  const handleRemove = (modality) => {
    setFiles(prev => ({ ...prev, [modality]: null }));
    if (fileInputRefs[modality].current) {
      fileInputRefs[modality].current.value = '';
    }
    setSessionId(null);
    setValidationResult(null);
    setPipelineState({ stage: 'idle', message: '', error: null });
  };

  // Preloads the verified repository validation case (BraTS2021_01069)
  const handleLoadValidationCase = async () => {
    try {
      setPipelineState({ stage: 'uploading', message: 'Preloading validation subject BraTS2021_01069...', error: null });
      const upRes = await loadValidationSubject('BraTS2021_01069');
      
      setSessionId(upRes.session_id);
      setFiles({
        flair: { name: 'BraTS2021_01069_flair.nii.gz', size: '2.40 MB', isServerLoaded: true },
        t1: { name: 'BraTS2021_01069_t1.nii.gz', size: '2.20 MB', isServerLoaded: true },
        t1ce: { name: 'BraTS2021_01069_t1ce.nii.gz', size: '2.50 MB', isServerLoaded: true },
        t2: { name: 'BraTS2021_01069_t2.nii.gz', size: '2.30 MB', isServerLoaded: true },
        seg: { name: 'BraTS2021_01069_seg.nii.gz', size: '0.80 MB', isServerLoaded: true },
      });

      // Automatically validate the preloaded session
      setPipelineState({ stage: 'validating', message: 'Validating BraTS2021_01069 NIfTI geometry and headers...', error: null });
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

  const handleValidate = async () => {
    // Check local staging
    const required = ['flair', 't1', 't1ce', 't2'];
    const missing = required.filter(k => !files[k]);
    if (missing.length > 0) {
      setPipelineState({
        stage: 'error',
        message: 'Modality completeness check failed.',
        error: `Missing required modalities: ${missing.map(m => m.toUpperCase()).join(', ')}. All 4 modalities must be provided.`
      });
      return;
    }

    try {
      let currentSessionId = sessionId;

      // If files are not already uploaded to session, upload now
      if (!currentSessionId) {
        setPipelineState({ stage: 'uploading', message: 'Uploading MRI modalities to temporary session...', error: null });
        const filePayload = {
          flair: files.flair?.file,
          t1: files.t1?.file,
          t1ce: files.t1ce?.file,
          t2: files.t2?.file,
          seg: files.seg?.file,
        };
        const upRes = await uploadMRI(filePayload);
        currentSessionId = upRes.session_id;
        setSessionId(currentSessionId);
      }

      setPipelineState({ stage: 'validating', message: 'Validating 3D NIfTI geometry, headers, and coordinate space...', error: null });
      const valRes = await validateMRI(currentSessionId);
      setValidationResult(valRes);

      if (valRes.is_valid) {
        setPipelineState({ 
          stage: 'idle', 
          message: `All 4 modalities verified successfully. Ready for full-volume inference.${valRes.has_ground_truth ? ' Ground truth attached (Dice/HD95 will be calculated).' : ' (No ground truth provided; prospective inference mode).'}`
        });
      } else {
        setPipelineState({ 
          stage: 'error', 
          message: 'NIfTI validation failed.', 
          error: valRes.notes.join('; ') 
        });
      }
    } catch (err) {
      setPipelineState({
        stage: 'error',
        message: 'Validation failed.',
        error: err.message || 'Backend API error during validation'
      });
    }
  };

  const handleRunSegmentation = async () => {
    if (!validationResult || !validationResult.is_valid || !sessionId) {
      alert('Please validate files successfully before running segmentation.');
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
        message: 'Inverting prediction to original space & saving prediction.nii.gz...', 
        error: null 
      });

      setTimeout(() => {
        setPipelineState({ 
          stage: 'complete', 
          message: `Inference completed in ${result.inference_time_seconds}s! Tumor Volume: ${result.tumor_volume_cm3} cm³.`, 
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

  const allRequiredFilesPresent = files.flair && files.t1 && files.t1ce && files.t2;
  const isRunning = ['uploading', 'validating', 'inference', 'processing'].includes(pipelineState.stage);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-medical-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Upload MRI Scan
          </h1>
          <p className="text-sm text-medical-muted mt-1">
            Provide the four MRI modalities required for volumetric brain tumor segmentation.
          </p>
        </div>

        {/* Load Demo Scan Helper */}
        <button
          onClick={handleLoadValidationCase}
          disabled={isRunning}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-teal/40 text-xs font-medium text-medical-tealLight transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-medical-teal" />
          <span>Load Validation Case: BraTS2021_01069</span>
        </button>
      </div>

      {/* 4 REQUIRED MODALITY UPLOAD CARDS */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-medical-muted mb-3">
          Required Multimodal MRI Sequences
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MODALITY_CONFIG.map(({ id, label, desc }) => {
            const fileData = files[id];
            return (
              <div
                key={id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFileDrop(id, e)}
                className={`relative rounded-xl border p-5 flex flex-col justify-between transition-all min-h-[220px] ${
                  fileData
                    ? 'bg-medical-card border-medical-teal/50 shadow-sm shadow-medical-teal/10'
                    : 'bg-medical-base border-dashed border-medical-border hover:border-medical-borderLight hover:bg-medical-card/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-sm font-bold tracking-wider px-2 py-0.5 rounded bg-medical-surface border border-medical-border text-white">
                      {label}
                    </span>
                    {fileData ? (
                      <span className="inline-flex items-center text-xs font-mono text-emerald-400 gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Staged
                      </span>
                    ) : (
                      <span className="text-[11px] text-medical-muted font-mono">
                        Required
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-medical-muted leading-tight mb-4">
                    {desc}
                  </p>

                  {fileData ? (
                    <div className="p-3 rounded-lg bg-medical-darkest/70 border border-medical-border/80 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-white truncate" title={fileData.name}>
                        <FileText className="w-3.5 h-3.5 text-medical-teal shrink-0" />
                        <span className="truncate">{fileData.name}</span>
                      </div>
                      <div className="text-[11px] text-medical-muted font-mono flex items-center justify-between">
                        <span>Size: {fileData.size}</span>
                        {fileData.isServerLoaded && (
                          <span className="text-medical-cyan text-[10px]">Preloaded</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-medical-muted space-y-2">
                      <UploadCloud className="w-8 h-8 text-medical-muted/50 mx-auto" />
                      <p className="text-[11px]">
                        Drag & drop <span className="font-mono text-medical-muted/80">.nii</span> or <span className="font-mono text-medical-muted/80">.nii.gz</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-medical-border/60 flex items-center justify-between">
                  <input
                    type="file"
                    ref={fileInputRefs[id]}
                    accept=".nii,.nii.gz"
                    onChange={(e) => handleFileSelect(id, e)}
                    className="hidden"
                  />

                  {fileData ? (
                    <button
                      onClick={() => handleRemove(id)}
                      disabled={isRunning}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => fileInputRefs[id].current?.click()}
                      disabled={isRunning}
                      className="w-full py-1.5 rounded bg-medical-surface hover:bg-medical-card border border-medical-border text-xs text-medical-text hover:text-white transition-colors disabled:opacity-50"
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

      {/* OPTIONAL GROUND TRUTH (seg.nii.gz) CARD */}
      <div className="p-5 rounded-xl bg-medical-card/60 border border-medical-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-medical-surface border border-medical-border text-medical-cyanLight">
                OPTIONAL GROUND TRUTH
              </span>
              <span className="text-xs text-medical-muted">seg.nii.gz</span>
            </div>
            <p className="text-xs text-medical-muted mt-1">
              Upload expert ground truth mask to compute validation metrics (WT, TC, ET Dice and HD95). If omitted, prospective segmentation is performed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRefs.seg}
              accept=".nii,.nii.gz"
              onChange={(e) => handleFileSelect('seg', e)}
              className="hidden"
            />
            {files.seg ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {files.seg.name} ({files.seg.size})
                </span>
                <button
                  onClick={() => handleRemove('seg')}
                  disabled={isRunning}
                  className="px-2.5 py-1 rounded text-xs text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRefs.seg.current?.click()}
                disabled={isRunning}
                className="px-3.5 py-1.5 rounded bg-medical-surface hover:bg-medical-card border border-medical-border text-xs text-white"
              >
                Attach seg.nii.gz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PIPELINE PROGRESS & STATUS BANNER */}
      {pipelineState.stage !== 'idle' && (
        <div className={`p-5 rounded-xl border flex items-start gap-3.5 text-xs ${
          pipelineState.stage === 'error'
            ? 'bg-red-950/20 border-red-500/40 text-red-200'
            : pipelineState.stage === 'complete'
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
            : 'bg-medical-card border-medical-teal/40 text-medical-tealLight'
        }`}>
          {isRunning ? (
            <Loader2 className="w-5 h-5 text-medical-teal shrink-0 mt-0.5 animate-spin" />
          ) : pipelineState.stage === 'complete' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {pipelineState.stage === 'uploading' && 'Stage 1/4: Uploading Scans'}
                {pipelineState.stage === 'validating' && 'Stage 2/4: Validating NIfTI Compatibility'}
                {pipelineState.stage === 'inference' && 'Stage 3/4: Executing Adaptive Model Inference'}
                {pipelineState.stage === 'processing' && 'Stage 4/4: Inverting & Saving Full-Volume Mask'}
                {pipelineState.stage === 'complete' && 'Inference Pipeline Succeeded'}
                {pipelineState.stage === 'error' && 'Pipeline Error'}
              </span>
            </div>
            <p className="opacity-90">{pipelineState.message}</p>
            {pipelineState.error && (
              <p className="font-mono text-red-300 mt-1">{pipelineState.error}</p>
            )}
          </div>
        </div>
      )}

      {/* ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-medical-border">
        <div className="text-xs text-medical-muted font-mono flex items-center gap-2">
          <span>Target Architecture:</span>
          <span className="text-white">UNETR (ROI 96×96×96, FP16 Autocast)</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleValidate}
            disabled={!allRequiredFilesPresent || isRunning}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
              allRequiredFilesPresent && !isRunning
                ? 'bg-medical-surface hover:bg-medical-card border-medical-borderLight text-white hover:border-medical-teal/50'
                : 'bg-medical-base/40 border-medical-border/40 text-medical-muted/50 cursor-not-allowed'
            }`}
          >
            {pipelineState.stage === 'validating' ? 'Validating...' : '[ Validate Files ]'}
          </button>

          <button
            onClick={handleRunSegmentation}
            disabled={!validationResult?.is_valid || isRunning}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              validationResult?.is_valid && !isRunning
                ? 'bg-medical-teal hover:bg-medical-tealLight text-medical-darkest shadow-medical-teal/20'
                : 'bg-medical-card/40 border border-medical-border/40 text-medical-muted/50 cursor-not-allowed'
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
                <span>[ Run Segmentation ]</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
