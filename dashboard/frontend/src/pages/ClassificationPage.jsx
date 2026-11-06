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
    color: '#F59E0B', 
    bg: 'rgba(245, 158, 11, 0.15)', 
    border: 'rgba(245, 158, 11, 0.35)' 
  },
  meningioma: { 
    label: 'Meningioma', 
    color: '#38BDF8', 
    bg: 'rgba(56, 189, 248, 0.15)', 
    border: 'rgba(56, 189, 248, 0.35)' 
  },
  notumor: { 
    label: 'No Tumor', 
    color: '#10B981', 
    bg: 'rgba(16, 185, 129, 0.15)', 
    border: 'rgba(16, 185, 129, 0.35)' 
  },
  pituitary: { 
    label: 'Pituitary', 
    color: '#A855F7', 
    bg: 'rgba(168, 85, 247, 0.15)', 
    border: 'rgba(168, 85, 247, 0.35)' 
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
        color: CLASS_CONFIG[cls]?.color || '#94A3B8'
      }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);
  };

  const top3 = getTop3();
  const predictedConfig = result ? CLASS_CONFIG[result.predicted_class] || { label: result.predicted_class, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' } : null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 animate-fadeIn text-[#F4F7FC]">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2636] pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#4C8DFF] text-xs font-mono tracking-wide">
            <Activity className="w-3.5 h-3.5 text-[#4C8DFF]" />
            <span>SECONDARY 2D SCREENING PIPELINE • EFFICIENTNET-B0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F7FC] tracking-tight">
            2D Histopathology & Slice Classification
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Investigational 2D image-level tumor classification across glioma, meningioma, pituitary adenoma, and normal tissue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-[#151E2B] border border-[#1C2636] text-[11px] font-mono text-[#94A3B8]">
            2D Image Inference
          </span>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm animate-fadeIn shadow-medical-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-200">Classification Notice</div>
            <div className="text-rose-300/90 text-xs font-mono">{error}</div>
          </div>
        </div>
      )}

      {/* MAIN 50/50 SPLIT-VIEW DIAGNOSTIC WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: UPLOAD & PREVIEW */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] font-mono flex items-center justify-between">
              <span>Single 2D Slice Input</span>
              {selectedFile && (
                <button
                  onClick={handleClear}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 normal-case font-sans font-medium transition-colors"
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
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3.5 ${
                  isDragging 
                    ? 'border-[#4C8DFF] bg-blue-500/10 scale-[0.99]' 
                    : 'border-[#1C2636] hover:border-[#4C8DFF]/60 hover:bg-[#151E2B]/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#4C8DFF]">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F4F7FC]">
                    Click to browse or drag and drop 2D image
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1 font-mono">
                    Accepts standard JPG, JPEG, or PNG brain MRI slices
                  </p>
                </div>
              </div>
            ) : (
              /* Selected Image Preview & File Meta */
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-[#080B12] border border-[#1C2636] flex items-center justify-center min-h-[300px] max-h-[380px]">
                  <img
                    src={previewUrl}
                    alt="Uploaded MRI scan"
                    className="max-h-[380px] w-auto object-contain"
                  />
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-[#101722]/85 backdrop-blur-md text-[11px] font-mono text-cyan-300 border border-[#1C2636]">
                    2D Axial Plane
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] flex items-center justify-between text-xs font-mono">
                  <div className="truncate max-w-[240px] text-[#F4F7FC] font-medium" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <div className="text-[#94A3B8]">
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
                className={`w-full py-3 px-5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                  !selectedFile || (loadingState && loadingState !== 'complete')
                    ? 'bg-[#151E2B]/50 text-[#627D98] cursor-not-allowed border border-[#1C2636]'
                    : 'bg-[#4C8DFF] hover:bg-[#3B7AE8] text-white shadow-blue-500/20'
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
          <div className="p-5 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-3 text-xs">
            <div className="flex items-center gap-2 text-[#94A3B8] font-mono uppercase tracking-wider font-semibold">
              <Info className="w-4 h-4 text-[#4C8DFF]" />
              <span>Model Research Benchmarks & Parameters</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636]">
                <div className="text-[10px] text-[#94A3B8] uppercase font-mono">Test Accuracy</div>
                <div className="text-base font-bold text-[#F4F7FC] font-mono mt-0.5">95.00%</div>
              </div>
              <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636]">
                <div className="text-[10px] text-[#94A3B8] uppercase font-mono">Macro F1 Score</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">94.89%</div>
              </div>
            </div>
            <div className="space-y-1.5 text-[#94A3B8] text-[11px] leading-relaxed pt-1">
              <p>
                <span className="text-amber-400 font-semibold">• Subgroup Sensitivity:</span> Glioma recall on the evaluation test set was 81.25%.
              </p>
              <p className="text-[#94A3B8]">
                • This represents benchmark cohort performance on a 1,600-image evaluation set and is <strong className="text-[#F4F7FC]">NOT</strong> a guarantee of single-patient diagnostic certainty.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLASSIFICATION RESULT INSPECTOR */}
        <div className="space-y-6">
          {result ? (
            <div className="p-6 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-6 animate-fadeIn">
              
              {/* Result Header */}
              <div className="flex items-start justify-between border-b border-[#1C2636] pb-5">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] block">
                    Predicted Histological Category
                  </span>
                  <div className="text-2xl font-bold text-[#F4F7FC] mt-2 flex items-center gap-3">
                    <span 
                      className="px-3.5 py-1 rounded-lg text-lg font-mono font-bold"
                      style={{ 
                        backgroundColor: predictedConfig.bg, 
                        color: predictedConfig.color,
                        borderColor: predictedConfig.border,
                        borderWidth: 1
                      }}
                    >
                      {predictedConfig.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] block">
                    Model Confidence
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono font-tabular mt-1 block">
                    {(result.confidence * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Model & Runtime Meta Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636]">
                  <div className="text-[10px] font-mono uppercase text-[#94A3B8]">Architecture</div>
                  <div className="text-xs font-semibold text-[#F4F7FC] mt-0.5 truncate">
                    {result.model || 'EfficientNet-B0'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636]">
                  <div className="text-[10px] font-mono uppercase text-[#94A3B8]">Hardware</div>
                  <div className="text-xs font-semibold text-[#38BDF8] mt-0.5 truncate">
                    {result.device || 'CUDA'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636]">
                  <div className="text-[10px] font-mono uppercase text-[#94A3B8]">Latency</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5 truncate font-mono">
                    {result.inference_time_ms ? `${result.inference_time_ms} ms` : `${(result.inference_time_seconds * 1000).toFixed(1)} ms`}
                  </div>
                </div>
              </div>

              {/* Horizontal Class Probability Distribution */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-semibold flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-[#4C8DFF]" />
                    <span>Full Probability Distribution</span>
                  </h3>
                  <span className="text-[11px] text-[#627D98] font-mono">All 4 Classes</span>
                </div>

                <div className="space-y-3">
                  {Object.entries(result.probabilities || {}).map(([cls, prob]) => {
                    const cfg = CLASS_CONFIG[cls] || { label: cls, color: '#4C8DFF' };
                    const pct = (prob * 100).toFixed(2);
                    const isWinner = cls === result.predicted_class;
                    return (
                      <div key={cls} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${isWinner ? 'text-[#F4F7FC] font-bold' : 'text-[#94A3B8]'}`}>
                            {cfg.label}
                          </span>
                          <span className="font-mono font-tabular text-xs text-[#F4F7FC] font-semibold">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#0B1019] overflow-hidden border border-[#1C2636]">
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
              <div className="space-y-2.5 pt-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-semibold">
                  Top-3 Ranked Classes
                </h3>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  {top3.map((item, idx) => (
                    <div 
                      key={item.key} 
                      className={`p-3 rounded-lg border ${
                        idx === 0 
                          ? 'bg-blue-500/15 border-blue-500/30 text-[#4C8DFF]' 
                          : 'bg-[#151E2B]/80 border-[#1C2636] text-[#94A3B8]'
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase text-[#627D98]">Rank {idx + 1}</div>
                      <div className="font-semibold text-[#F4F7FC] text-xs mt-0.5 truncate">{item.label}</div>
                      <div className="font-mono text-xs mt-1 font-bold text-emerald-400">{item.percent}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Control */}
              <div className="pt-3 flex items-center justify-between border-t border-[#1C2636]">
                <span className="text-[11px] text-[#627D98] font-mono">
                  Session data is non-persistent
                </span>
                <button
                  onClick={handleClear}
                  className="px-3.5 py-1.5 rounded-lg bg-[#151E2B] hover:bg-[#1C2636] border border-[#2A384C] text-xs text-[#F4F7FC] font-medium transition-all flex items-center gap-1.5 shadow-medical-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#4C8DFF]" />
                  <span>New Classification</span>
                </button>
              </div>

            </div>
          ) : (
            /* Empty State Guidance */
            <div className="p-10 rounded-xl bg-[#101722] border border-dashed border-[#1C2636] text-center space-y-4 flex flex-col items-center justify-center min-h-[380px] shadow-medical-card">
              <div className="w-16 h-16 rounded-full bg-[#151E2B] border border-[#1C2636] flex items-center justify-center text-[#94A3B8]">
                <ImageIcon className="w-8 h-8 text-[#4C8DFF]" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="text-base font-semibold text-[#F4F7FC]">
                  Awaiting 2D Slice Input
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Upload an axial brain MRI slice on the left panel and click "Classify 2D Image" to execute model inference across glioma, meningioma, pituitary, and normal tissue.
                </p>
              </div>
            </div>
          )}

          {/* Clinical Research Disclaimer */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs shadow-medical-sm">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-amber-300 font-semibold">Investigational Screening Notice:</strong> For research and educational purposes only. This 2D classifier is an algorithmic exploratory screening tool and does not substitute for histopathological biopsy or clinical oncological consultation.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
