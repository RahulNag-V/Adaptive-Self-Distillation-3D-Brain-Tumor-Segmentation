import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Cpu, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  RefreshCw,
  BarChart2,
  Info,
  Activity,
  Layers,
  ZoomIn
} from 'lucide-react';
import { classifyImage } from '../api/classification';

const CLASS_CONFIG = {
  glioma: { 
    label: 'Glioma', 
    color: '#D97706', 
    bg: '#FEF3C7', 
    border: '#FCD34D' 
  },
  meningioma: { 
    label: 'Meningioma', 
    color: '#0284C7', 
    bg: '#E0F2FE', 
    border: '#BAE6FD' 
  },
  notumor: { 
    label: 'No Tumor', 
    color: '#059669', 
    bg: '#D1FAE5', 
    border: '#A7F3D0' 
  },
  pituitary: { 
    label: 'Pituitary', 
    color: '#7C3AED', 
    bg: '#EDE9FE', 
    border: '#DDD6FE' 
  }
};

export default function ClassificationPage({ onNavigate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingState, setLoadingState] = useState(null); // 'uploading' | 'classifying' | 'preparing' | 'complete' | null
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  // Keep previewUrlRef synced for safe unmount cleanup
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  // Cleanup object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setError(null);
    setResult(null);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const ext = file.name.toLowerCase().split('.').pop();
    if (!validTypes.includes(file.type) && !['jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Unsupported file type. Please upload a JPG, JPEG, or PNG brain MRI image.');
      return;
    }

    // Revoke previous URL if exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setLoadingState(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClassify = async () => {
    if (!selectedFile) return;

    setError(null);
    setResult(null);

    try {
      setLoadingState('uploading');
      await new Promise((r) => setTimeout(r, 200));

      setLoadingState('classifying');
      const response = await classifyImage(selectedFile);

      setLoadingState('preparing');
      await new Promise((r) => setTimeout(r, 200));

      setResult(response);
      setLoadingState('complete');
    } catch (err) {
      console.error('Classification error:', err);
      setError(err.message || 'Classification failed. Please check the backend connection.');
      setLoadingState(null);
    }
  };

  // Compute Top-3 predictions from result probabilities
  const getTop3 = () => {
    if (!result || !result.probabilities) return [];
    return Object.entries(result.probabilities)
      .map(([cls, prob]) => ({
        key: cls,
        label: CLASS_CONFIG[cls]?.label || cls,
        prob: prob,
        percent: (prob * 100).toFixed(2),
        color: CLASS_CONFIG[cls]?.color || '#103B5C'
      }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);
  };

  const top3 = getTop3();
  const predictedConfig = result ? CLASS_CONFIG[result.predicted_class] || { label: result.predicted_class, color: '#103B5C', bg: '#EBF8F6', border: '#399DBA' } : null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn text-[#111827]">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#98D9CE]/60 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EBF8F6] text-[#103B5C] border border-[#98D9CE]/60 uppercase tracking-wider">
            <Activity className="w-3 h-3 text-[#103B5C]" />
            <span>Secondary 2D Screening Pipeline • EfficientNet-B0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#103B5C] tracking-tight">
            2D Histopathology &amp; Slice Classification
          </h1>
          <p className="text-sm text-[#475569]">
            Investigational 2D image-level tumor classification across glioma, meningioma, pituitary adenoma, and normal tissue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-white border border-[#98D9CE]/60 text-xs font-mono text-[#103B5C] font-bold shadow-xs">
            2D Image Inference
          </span>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm animate-fadeIn shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-rose-900">Classification Notice</div>
            <div className="text-rose-700 text-xs font-mono font-bold">{error}</div>
          </div>
        </div>
      )}

      {/* MAIN 50/50 SPLIT-VIEW DIAGNOSTIC WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: UPLOAD & PREVIEW */}
        <div className="space-y-5">
          <div className="card-transparent p-5 sm:p-6 rounded-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#103B5C] font-mono flex items-center justify-between">
              <span>Single 2D Slice Input</span>
              {selectedFile && (
                <button
                  onClick={handleClear}
                  className="text-xs text-rose-700 hover:text-rose-900 flex items-center gap-1 normal-case font-sans font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Image</span>
                </button>
              )}
            </h2>

            {/* Drag & Drop Upload Zone */}
            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3.5 ${
                  isDragging 
                    ? 'border-[#399DBA] bg-[rgba(226,247,242,0.65)] scale-[0.99]' 
                    : 'border-[#111111] hover:border-[#111111] hover:bg-[rgba(226,247,242,0.65)] bg-white/10'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-white/20 border border-[#111111] flex items-center justify-center text-[#103B5C]">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#103B5C]">
                    Click to browse or drag and drop 2D image
                  </p>
                  <p className="text-xs text-[#25313D] mt-1 font-mono">
                    Accepts standard JPG, JPEG, or PNG brain MRI slices
                  </p>
                </div>
              </div>
            ) : (
              /* Selected Image Preview & File Meta */
              <div className="space-y-3.5">
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-[#111111] flex items-center justify-center min-h-[280px] max-h-[360px]">
                  <img
                    src={previewUrl}
                    alt="Uploaded MRI scan"
                    className="max-h-[360px] w-auto object-contain"
                  />
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs text-[11px] font-mono text-[#103B5C] font-bold border border-[#111111]/30 shadow-xs">
                    2D Axial Plane
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/25 border border-[#111111]/30 flex items-center justify-between text-xs font-mono">
                  <div className="truncate max-w-[240px] text-[#103B5C] font-bold" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <div className="text-[#25313D] font-bold">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              </div>
            )}

            {/* Action Button & Loading Status */}
            <div className="pt-2">
              <button
                onClick={handleClassify}
                disabled={!selectedFile || (loadingState && loadingState !== 'complete')}
                className={`w-full py-2.5 px-5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-[#111111] cursor-pointer ${
                  !selectedFile || (loadingState && loadingState !== 'complete')
                    ? 'bg-slate-100/50 text-[#94A3B8] cursor-not-allowed border-slate-300'
                    : 'bg-[#399DBA] hover:bg-[#103B5C] text-white hover:shadow-[0_6px_18px_rgba(0,0,0,0.12)]'
                }`}
              >
                {loadingState && loadingState !== 'complete' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="font-mono text-xs">
                      {loadingState === 'uploading' && 'Uploading image...'}
                      {loadingState === 'classifying' && 'Executing EfficientNet-B0 inference...'}
                      {loadingState === 'preparing' && 'Normalizing class probabilities...'}
                    </span>
                  </>
                ) : result ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Run New Classification</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span>Classify 2D Image</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Model Benchmark & Research Limitations Panel */}
          <div className="card-transparent p-5 rounded-xl space-y-3 text-xs">
            <div className="flex items-center gap-2 text-[#103B5C] font-mono uppercase tracking-wider font-bold">
              <Info className="w-4 h-4 text-[#103B5C]" />
              <span>Model Research Benchmarks &amp; Parameters</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
                <div className="text-[10px] text-[#25313D] uppercase font-mono font-bold">Test Accuracy</div>
                <div className="text-base font-bold text-[#103B5C] font-mono mt-0.5">95.00%</div>
              </div>
              <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
                <div className="text-[10px] text-[#25313D] uppercase font-mono font-bold">Macro F1 Score</div>
                <div className="text-base font-bold text-[#103B5C] font-mono mt-0.5">94.89%</div>
              </div>
            </div>
            <div className="space-y-1 text-[#25313D] text-[11px] leading-relaxed pt-1">
              <p>
                <span className="text-[#103B5C] font-bold">• Subgroup Sensitivity:</span> Glioma recall on the evaluation test set was 81.25%.
              </p>
              <p className="text-[#25313D]">
                • This represents benchmark cohort performance on a 1,600-image evaluation set and is <strong className="text-[#103B5C]">NOT</strong> a guarantee of single-patient diagnostic certainty.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLASSIFICATION RESULT INSPECTOR */}
        <div className="space-y-5">
          {result ? (
            <div className="card-transparent p-5 sm:p-6 rounded-xl space-y-5 animate-fadeIn">
              
              {/* Result Header */}
              <div className="flex items-start justify-between border-b border-[#111111]/20 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#25313D] block font-bold">
                    Predicted Histological Category
                  </span>
                  <div className="text-2xl font-bold text-[#103B5C] mt-2 flex items-center gap-3">
                    <span 
                      className="px-3.5 py-1 rounded-lg text-lg font-mono font-bold shadow-xs border border-[#111111]"
                      style={{ 
                        backgroundColor: predictedConfig.bg, 
                        color: predictedConfig.color,
                      }}
                    >
                      {predictedConfig.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#25313D] block font-bold">
                    Model Confidence
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-[#103B5C] font-mono font-tabular mt-1 block">
                    {(result.confidence * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Model & Runtime Meta Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
                  <div className="text-[10px] font-mono uppercase text-[#25313D] font-bold">Architecture</div>
                  <div className="text-xs font-bold text-[#103B5C] mt-0.5 truncate">
                    {result.model || 'EfficientNet-B0'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
                  <div className="text-[10px] font-mono uppercase text-[#25313D] font-bold">Hardware</div>
                  <div className="text-xs font-bold text-[#103B5C] mt-0.5 truncate">
                    {result.device || 'CUDA'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
                  <div className="text-[10px] font-mono uppercase text-[#25313D] font-bold">Latency</div>
                  <div className="text-xs font-bold text-[#103B5C] mt-0.5 truncate font-mono">
                    {result.inference_time_ms ? `${result.inference_time_ms} ms` : `${(result.inference_time_seconds * 1000).toFixed(1)} ms`}
                  </div>
                </div>
              </div>

              {/* Horizontal Class Probability Distribution */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#103B5C] font-bold flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-[#103B5C]" />
                    <span>Full Probability Distribution</span>
                  </h3>
                  <span className="text-[11px] text-[#25313D] font-mono font-bold">All 4 Classes</span>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(result.probabilities || {}).map(([cls, prob]) => {
                    const cfg = CLASS_CONFIG[cls] || { label: cls, color: '#103B5C' };
                    const pct = (prob * 100).toFixed(2);
                    const isWinner = cls === result.predicted_class;
                    return (
                      <div key={cls} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-bold ${isWinner ? 'text-[#103B5C]' : 'text-[#25313D]'}`}>
                            {cfg.label}
                          </span>
                          <span className="font-mono font-tabular text-xs text-[#111827] font-bold">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.max(prob * 100, 1)}%`,
                              backgroundColor: cfg.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top-3 Predictions */}
              <div className="space-y-2.5 pt-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#103B5C] font-bold">
                  Top-3 Ranked Classes
                </h3>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  {top3.map((item, idx) => (
                    <div 
                      key={item.key} 
                      className={`p-3 rounded-lg border ${
                        idx === 0 
                          ? 'bg-white/30 border-[#111111]/40 text-[#103B5C] shadow-xs' 
                          : 'bg-white/15 border-[#111111]/25 text-[#25313D]'
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase text-[#25313D] font-bold">Rank {idx + 1}</div>
                      <div className="font-bold text-[#103B5C] text-xs mt-0.5 truncate">{item.label}</div>
                      <div className="font-mono text-xs mt-1 font-bold text-[#103B5C]">{item.percent}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Control */}
              <div className="pt-3 flex items-center justify-between border-t border-[#111111]/20">
                <span className="text-[11px] text-[#25313D] font-mono font-bold">
                  Session data is non-persistent
                </span>
                <button
                  onClick={handleClear}
                  className="px-3.5 py-1.5 rounded-lg bg-white/30 hover:bg-[rgba(226,247,242,0.85)] border border-[#111111] text-xs text-[#111111] font-bold transition-all duration-250 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#103B5C]" />
                  <span>New Classification</span>
                </button>
              </div>

            </div>
          ) : (
            /* Empty State Guidance */
            <div className="card-transparent p-10 rounded-xl text-center space-y-4 flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-14 h-14 rounded-full bg-white/20 border border-[#111111] flex items-center justify-center text-[#103B5C]">
                <ImageIcon className="w-7 h-7 text-[#103B5C]" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="text-base font-bold text-[#103B5C]">
                  Awaiting 2D Slice Input
                </h3>
                <p className="text-xs text-[#25313D] leading-relaxed">
                  Upload an axial brain MRI slice on the left panel and click &quot;Classify 2D Image&quot; to execute model inference across glioma, meningioma, pituitary, and normal tissue.
                </p>
              </div>
            </div>
          )}

          {/* Clinical Research Disclaimer */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-[#111111] flex items-start gap-3 text-amber-950 text-xs shadow-[0_4px_12px_rgba(0,0,0,0.10)]">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-amber-950 font-bold">Investigational Screening Notice:</strong> For research and educational purposes only. This 2D classifier is an algorithmic exploratory screening tool and does not substitute for histopathological biopsy or clinical oncological consultation.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
