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
  glioma: { label: 'Glioma', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  meningioma: { label: 'Meningioma', color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' },
  notumor: { label: 'No Tumor', color: '#047857', bg: '#d1fae5', border: '#a7f3d0' },
  pituitary: { label: 'Pituitary', color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe' }
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 animate-fadeIn text-[#16324F]">
      {/* HEADER SECTION */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono tracking-wide">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>SECONDARY CLASSIFICATION MODEL • EFFICIENTNET-B0</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#16324F] tracking-tight">
          2D Brain Tumor Classification
        </h1>
        <p className="text-sm sm:text-base text-[#64748B]">
          Upload a brain MRI image for research-oriented image-level classification.
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm animate-fadeIn shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-900">Classification Notice</div>
            <div className="text-rose-700">{error}</div>
          </div>
        </div>
      )}

      {/* MAIN INTERACTIVE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: UPLOAD & PREVIEW */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-[#DCE6F0] shadow-sm space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748B] font-mono flex items-center justify-between">
              <span>MRI Image Input</span>
              {selectedFile && (
                <button
                  onClick={handleClear}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 normal-case font-sans font-medium"
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
                    ? 'border-blue-600 bg-blue-50 scale-[0.99]' 
                    : 'border-[#CBD5E1] hover:border-blue-500 hover:bg-[#F8FAFC]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#16324F]">
                    Click to select or drag and drop MRI image
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    Accepts JPG, JPEG, or PNG brain MRI scans
                  </p>
                </div>
              </div>
            ) : (
              /* Selected Image Preview & File Meta */
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-[#DCE6F0] flex items-center justify-center max-h-[380px]">
                  <img
                    src={previewUrl}
                    alt="Uploaded MRI scan"
                    className="max-h-[380px] w-auto object-contain"
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-slate-900/80 backdrop-blur-md text-[11px] font-mono text-sky-300 border border-slate-700">
                    2D Axial View
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#DCE6F0] flex items-center justify-between text-xs font-mono">
                  <div className="truncate max-w-[220px] text-[#16324F] font-medium">
                    {selectedFile.name}
                  </div>
                  <div className="text-[#64748B]">
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
                className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                  !selectedFile || (loadingState && loadingState !== 'complete')
                    ? 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed border border-[#E2E8F0]'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loadingState && loadingState !== 'complete' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
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
          <div className="p-5 rounded-xl bg-white border border-[#DCE6F0] shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2 text-[#64748B] font-mono uppercase tracking-wider font-semibold">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Model Research Benchmarks & Limitations</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] uppercase font-mono">Test Accuracy</div>
                <div className="text-base font-bold text-[#16324F] font-mono mt-0.5">95.00%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] uppercase font-mono">Macro F1 Score</div>
                <div className="text-base font-bold text-[#16324F] font-mono mt-0.5">94.89%</div>
              </div>
            </div>
            <div className="space-y-1.5 text-[#64748B] text-[11px] leading-relaxed pt-1">
              <p>
                <span className="text-amber-800 font-semibold">• Known Subgroup Sensitivity:</span> Glioma recall on the project test set was 81.25%.
              </p>
              <p className="text-[#64748B]">
                • This represents dataset-level research performance on the 1,600-image benchmark and must <strong className="text-[#16324F]">NOT</strong> be presented as the certainty for the currently uploaded image.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLASSIFICATION RESULT PANEL */}
        <div className="space-y-6">
          {result ? (
            <div className="p-6 rounded-2xl bg-white border border-[#DCE6F0] shadow-sm space-y-6 animate-fadeIn">
              
              {/* Result Header */}
              <div className="flex items-start justify-between border-b border-[#DCE6F0] pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#64748B] block">
                    Classification Result
                  </span>
                  <div className="text-2xl font-bold text-[#16324F] mt-1 flex items-center gap-3">
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
                  <span className="text-xs font-mono uppercase tracking-wider text-[#64748B] block">
                    Confidence
                  </span>
                  <span className="text-2xl font-bold text-emerald-600 font-mono font-tabular mt-1 block">
                    {(result.confidence * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Model & Runtime Meta Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[10px] font-mono uppercase text-[#64748B]">Model</div>
                  <div className="text-xs font-semibold text-[#16324F] mt-0.5 truncate">
                    {result.model || 'EfficientNet-B0'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[10px] font-mono uppercase text-[#64748B]">Device</div>
                  <div className="text-xs font-semibold text-blue-700 mt-0.5 truncate">
                    {result.device || 'CUDA'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[10px] font-mono uppercase text-[#64748B]">Inference</div>
                  <div className="text-xs font-semibold text-[#16324F] mt-0.5 truncate">
                    {result.inference_time_ms ? `${result.inference_time_ms} ms` : `${(result.inference_time_seconds * 1000).toFixed(1)} ms`}
                  </div>
                </div>
              </div>

              {/* Horizontal Class Probability Distribution */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-semibold flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Probability Distribution</span>
                  </h3>
                  <span className="text-[11px] text-[#64748B] font-mono">All Classes</span>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(result.probabilities || {}).map(([cls, prob]) => {
                    const cfg = CLASS_CONFIG[cls] || { label: cls, color: '#2563eb' };
                    const pct = (prob * 100).toFixed(2);
                    const isWinner = cls === result.predicted_class;
                    return (
                      <div key={cls} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${isWinner ? 'text-[#16324F] font-bold' : 'text-[#64748B]'}`}>
                            {cfg.label}
                          </span>
                          <span className="font-mono font-tabular text-xs text-[#16324F] font-semibold">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
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
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-semibold">
                  Top-3 Ranked Classes
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {top3.map((item, idx) => (
                    <div 
                      key={item.key} 
                      className={`p-2.5 rounded-lg border ${
                        idx === 0 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase text-[#64748B]">Rank {idx + 1}</div>
                      <div className="font-semibold text-[#16324F] text-xs mt-0.5 truncate">{item.label}</div>
                      <div className="font-mono text-xs mt-1 font-medium">{item.percent}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Control */}
              <div className="pt-2 flex items-center justify-between border-t border-[#DCE6F0]">
                <span className="text-[11px] text-[#64748B]">
                  Session data is non-persistent
                </span>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#DCE6F0] text-xs text-[#16324F] font-medium transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>New Classification</span>
                </button>
              </div>

            </div>
          ) : (
            /* Empty State Guidance */
            <div className="p-10 rounded-2xl bg-white border border-dashed border-[#DCE6F0] text-center space-y-4 flex flex-col items-center justify-center min-h-[380px] shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#F8FAFC] border border-[#DCE6F0] flex items-center justify-center text-[#64748B]">
                <ImageIcon className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="text-base font-semibold text-[#16324F]">
                  Awaiting Image Input
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Upload an axial brain MRI slice on the left panel and click "Classify Image" to generate model probabilities across glioma, meningioma, pituitary, and no tumor.
                </p>
              </div>
            </div>
          )}

          {/* Research Disclaimer */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs shadow-sm">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-amber-800">
              <strong className="text-amber-900 font-semibold">Research and Educational Notice:</strong> For research and educational purposes only. This classifier is not a medical diagnostic tool and must not be used for clinical decision-making.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
