import React, { useState, useRef } from 'react';
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
  Activity
} from 'lucide-react';
import { classifyImage } from '../api/classification';

const CLASS_CONFIG = {
  glioma: { label: 'Glioma', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
  meningioma: { label: 'Meningioma', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.4)' },
  notumor: { label: 'No Tumor', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
  pituitary: { label: 'Pituitary', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.4)' }
};

export default function ClassificationPage({ onNavigate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingState, setLoadingState] = useState(null); // 'uploading' | 'classifying' | 'preparing' | 'complete' | null
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

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
        color: CLASS_CONFIG[cls]?.color || '#94a3b8'
      }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);
  };

  const top3 = getTop3();
  const predictedConfig = result ? CLASS_CONFIG[result.predicted_class] || { label: result.predicted_class, color: '#0ea5e9' } : null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
      {/* HEADER SECTION */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-teal/15 border border-medical-teal/30 text-medical-tealLight text-xs font-mono tracking-wide">
          <Activity className="w-3.5 h-3.5 text-medical-teal" />
          <span>SECONDARY CLASSIFICATION MODEL • EFFICIENTNET-B0</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          2D Brain Tumor Classification
        </h1>
        <p className="text-sm sm:text-base text-medical-muted">
          Upload a brain MRI image for research-oriented image-level classification.
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-red-200">Classification Notice</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* MAIN INTERACTIVE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: UPLOAD & PREVIEW */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-medical-card border border-medical-border space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-medical-muted font-mono flex items-center justify-between">
              <span>MRI Image Input</span>
              {selectedFile && (
                <button
                  onClick={handleClear}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 normal-case font-sans"
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
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging 
                    ? 'border-medical-teal bg-medical-teal/10 scale-[0.99]' 
                    : 'border-medical-border hover:border-medical-teal/60 hover:bg-medical-surface/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-medical-teal/15 border border-medical-teal/30 flex items-center justify-center text-medical-teal">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Click to select or drag and drop MRI image
                  </p>
                  <p className="text-xs text-medical-muted mt-1">
                    Accepts JPG, JPEG, or PNG brain MRI scans
                  </p>
                </div>
              </div>
            ) : (
              /* Selected Image Preview & File Meta */
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black/60 border border-medical-border flex items-center justify-center max-h-[380px]">
                  <img
                    src={previewUrl}
                    alt="Uploaded MRI scan"
                    className="max-h-[380px] w-auto object-contain"
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md text-[11px] font-mono text-medical-cyan">
                    2D Axial View
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-medical-surface border border-medical-border flex items-center justify-between text-xs font-mono">
                  <div className="truncate max-w-[220px] text-white">
                    {selectedFile.name}
                  </div>
                  <div className="text-medical-muted">
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
                className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                  !selectedFile || (loadingState && loadingState !== 'complete')
                    ? 'bg-medical-surface text-medical-muted/50 cursor-not-allowed border border-medical-border/40'
                    : 'bg-medical-teal hover:bg-medical-tealLight text-medical-darkest shadow-medical-teal/20 hover:shadow-medical-teal/30'
                }`}
              >
                {loadingState && loadingState !== 'complete' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-medical-darkest" />
                    <span>
                      {loadingState === 'uploading' && 'Uploading image...'}
                      {loadingState === 'classifying' && 'Running classification...'}
                      {loadingState === 'preparing' && 'Preparing result...'}
                    </span>
                  </>
                ) : result ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Classify Again</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span>Classify Image</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Model Limitation Panel */}
          <div className="p-5 rounded-xl bg-medical-base border border-medical-border/80 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-medical-muted font-mono uppercase tracking-wider font-semibold">
              <Info className="w-4 h-4 text-medical-cyan" />
              <span>Model Research Benchmarks & Limitations</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-medical-card border border-medical-border">
                <div className="text-[10px] text-medical-muted uppercase font-mono">Test Accuracy</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">95.00%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-medical-card border border-medical-border">
                <div className="text-[10px] text-medical-muted uppercase font-mono">Macro F1 Score</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">94.89%</div>
              </div>
            </div>
            <div className="space-y-1.5 text-medical-muted text-[11px] leading-relaxed pt-1">
              <p>
                <span className="text-amber-300/90 font-medium">• Known Subgroup Sensitivity:</span> Glioma recall on the project test set was 81.25%.
              </p>
              <p className="text-medical-muted/80">
                • This represents dataset-level research performance on the 1,600-image benchmark and must <strong className="text-white">NOT</strong> be presented as the certainty for the currently uploaded image.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLASSIFICATION RESULT PANEL */}
        <div className="space-y-6">
          {result ? (
            <div className="p-6 rounded-2xl bg-medical-card border border-medical-border space-y-6 animate-fadeIn">
              
              {/* Result Header */}
              <div className="flex items-start justify-between border-b border-medical-border pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-medical-muted block">
                    Classification Result
                  </span>
                  <div className="text-2xl font-bold text-white mt-1 flex items-center gap-3">
                    <span 
                      className="px-3 py-1 rounded-lg text-lg font-mono font-bold"
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
                  <span className="text-xs font-mono uppercase tracking-wider text-medical-muted block">
                    Confidence
                  </span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono font-tabular mt-1 block">
                    {(result.confidence * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Model & Runtime Meta Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-medical-surface border border-medical-border">
                  <div className="text-[10px] font-mono uppercase text-medical-muted">Model</div>
                  <div className="text-xs font-semibold text-white mt-0.5 truncate">
                    {result.model || 'EfficientNet-B0'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-medical-surface border border-medical-border">
                  <div className="text-[10px] font-mono uppercase text-medical-muted">Device</div>
                  <div className="text-xs font-semibold text-medical-cyan mt-0.5 truncate">
                    {result.device || 'CUDA'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-medical-surface border border-medical-border">
                  <div className="text-[10px] font-mono uppercase text-medical-muted">Inference</div>
                  <div className="text-xs font-semibold text-white mt-0.5 truncate">
                    {result.inference_time_ms ? `${result.inference_time_ms} ms` : `${(result.inference_time_seconds * 1000).toFixed(1)} ms`}
                  </div>
                </div>
              </div>

              {/* Horizontal Class Probability Distribution */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-medical-teal" />
                    <span>Probability Distribution</span>
                  </h3>
                  <span className="text-[11px] text-medical-muted font-mono">All Classes</span>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(result.probabilities || {}).map(([cls, prob]) => {
                    const cfg = CLASS_CONFIG[cls] || { label: cls, color: '#38bdf8' };
                    const pct = (prob * 100).toFixed(2);
                    const isWinner = cls === result.predicted_class;
                    return (
                      <div key={cls} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${isWinner ? 'text-white font-semibold' : 'text-medical-muted'}`}>
                            {cfg.label}
                          </span>
                          <span className="font-mono font-tabular text-xs text-medical-text font-semibold">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-medical-darkest overflow-hidden border border-medical-border/40">
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
                <h3 className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold">
                  Top-3 Ranked Classes
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {top3.map((item, idx) => (
                    <div 
                      key={item.key} 
                      className={`p-2.5 rounded-lg border ${
                        idx === 0 
                          ? 'bg-medical-teal/10 border-medical-teal/40 text-medical-tealLight' 
                          : 'bg-medical-surface border-medical-border text-medical-muted'
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase text-medical-muted">Rank {idx + 1}</div>
                      <div className="font-semibold text-white text-xs mt-0.5 truncate">{item.label}</div>
                      <div className="font-mono text-xs mt-1">{item.percent}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Control */}
              <div className="pt-2 flex items-center justify-between border-t border-medical-border/80">
                <span className="text-[11px] text-medical-muted">
                  Session data is non-persistent
                </span>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-border text-xs text-white font-medium transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-medical-cyan" />
                  <span>New Classification</span>
                </button>
              </div>

            </div>
          ) : (
            /* Empty State Guidance */
            <div className="p-10 rounded-2xl bg-medical-base border border-dashed border-medical-border text-center space-y-4 flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-16 h-16 rounded-full bg-medical-surface border border-medical-border flex items-center justify-center text-medical-muted">
                <ImageIcon className="w-8 h-8 text-medical-muted/60" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="text-base font-semibold text-white">
                  Awaiting Image Input
                </h3>
                <p className="text-xs text-medical-muted leading-relaxed">
                  Upload an axial brain MRI slice on the left panel and click "Classify Image" to generate model probabilities across glioma, meningioma, pituitary, and no tumor.
                </p>
              </div>
            </div>
          )}

          {/* Research Disclaimer */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-amber-200">Research and Educational Notice:</strong> For research and educational purposes only. This classifier is not a medical diagnostic tool and must not be used for clinical decision-making.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
