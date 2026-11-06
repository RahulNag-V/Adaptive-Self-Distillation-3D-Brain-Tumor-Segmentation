import React, { useState } from 'react';
import { 
  BarChart3, 
  Activity, 
  Clock, 
  Cpu, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  TrendingUp, 
  Download, 
  Eye, 
  RotateCcw,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { DEMO_CASE_METADATA, UNLABELED_SCAN_DEMO, REGION_LEGEND } from '../utils/mockData';
import { getSessionFileUrl } from '../api/segmentation';

export default function ResultsPage({ currentResult, onNavigate, onClearLiveResult }) {
  const [caseType, setCaseType] = useState('benchmark'); // 'benchmark' | 'unlabeled'

  // If liveResult exists, prioritize live results
  const isLive = Boolean(currentResult);

  // Compute metrics depending on whether live or mock
  let displayData = {};

  if (isLive) {
    const hasGT = currentResult.ground_truth_available && currentResult.metrics;
    displayData = {
      sessionId: currentResult.session_id,
      modelName: currentResult.model || 'Adaptive Self-Distillation',
      inferenceTime: `${currentResult.inference_time_seconds}s`,
      device: currentResult.device || 'cuda',
      groundTruthProvided: hasGT,
      meanDice: hasGT ? currentResult.metrics.mean_dice : null,
      wtDice: hasGT ? currentResult.metrics.WT_dice : null,
      tcDice: hasGT ? currentResult.metrics.TC_dice : null,
      etDice: hasGT ? currentResult.metrics.ET_dice : null,
      meanHd95: hasGT ? currentResult.metrics.mean_hd95 : null,
      wtVolumeCm3: currentResult.regions?.WT?.volume_cm3 ?? (currentResult.tumor_volume_cm3 || 0),
      tcVolumeCm3: currentResult.regions?.TC?.volume_cm3 ?? 0,
      etVolumeCm3: currentResult.regions?.ET?.volume_cm3 ?? 0,
      predictionFile: currentResult.prediction_file,
    };
  } else {
    const activeMock = caseType === 'benchmark' ? DEMO_CASE_METADATA : UNLABELED_SCAN_DEMO;
    displayData = {
      sessionId: 'demo_case_benchmark_001',
      modelName: activeMock.modelInfo.name,
      inferenceTime: activeMock.modelInfo.inferenceTime,
      device: 'cuda (RTX A1000)',
      groundTruthProvided: activeMock.benchmarkMetrics.groundTruthProvided,
      meanDice: activeMock.benchmarkMetrics.meanDice,
      wtDice: activeMock.benchmarkMetrics.wtDice,
      tcDice: activeMock.benchmarkMetrics.tcDice,
      etDice: activeMock.benchmarkMetrics.etDice,
      meanHd95: activeMock.benchmarkMetrics.meanHd95,
      wtVolumeCm3: activeMock.volumetrics.wholeTumorVolumeCm3,
      tcVolumeCm3: activeMock.volumetrics.tumorCoreVolumeCm3,
      etVolumeCm3: activeMock.volumetrics.enhancingTumorVolumeCm3,
      predictionFile: null,
    };
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 animate-fadeIn text-[#F4F7FC]">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2636] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F7FC]">
              Segmentation Results
            </h1>
            {isLive ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Case Result</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-[#151E2B] border border-[#1C2636] text-[#94A3B8] text-xs font-mono">
                {caseType === 'benchmark' ? 'Demo Preview Mode • BraTS Benchmark Case' : 'Demo Preview Mode • Prospective Unlabeled'}
              </span>
            )}
          </div>
          <p className="text-sm text-[#94A3B8] mt-1">
            Volumetric lesion analysis, quantitative sub-compartment burden, and validation performance indicators.
          </p>
        </div>

        {/* Live session controls or Demo toggle */}
        <div className="flex items-center gap-2.5">
          {isLive ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate && onNavigate('viewer')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4C8DFF] hover:bg-[#3B7AE8] text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open in 3D Viewer</span>
              </button>

              {currentResult.prediction_file && (
                <a
                  href={currentResult.prediction_file}
                  download="prediction.nii.gz"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#151E2B] hover:bg-[#1C2636] border border-[#2A384C] text-xs text-[#F4F7FC] transition-all shadow-medical-sm font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-[#4C8DFF]" />
                  <span>Download NIfTI</span>
                </a>
              )}

              <button
                onClick={onClearLiveResult}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#151E2B] hover:bg-[#1C2636] border border-[#2A384C] text-xs text-[#94A3B8] hover:text-[#F4F7FC] transition-all shadow-medical-sm"
                title="Switch back to demo preview"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#101722] border border-[#1C2636] text-xs shadow-medical-sm">
              <span className="text-[#627D98] text-[11px] px-2 font-mono uppercase">Case Mode:</span>
              <button
                onClick={() => setCaseType('benchmark')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  caseType === 'benchmark'
                    ? 'bg-[#4C8DFF] text-white font-semibold shadow-md shadow-blue-500/20'
                    : 'text-[#94A3B8] hover:text-[#F4F7FC]'
                }`}
              >
                Benchmark (w/ Ground Truth)
              </button>
              <button
                onClick={() => setCaseType('unlabeled')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  caseType === 'unlabeled'
                    ? 'bg-[#4C8DFF] text-white font-semibold shadow-md shadow-blue-500/20'
                    : 'text-[#94A3B8] hover:text-[#F4F7FC]'
                }`}
              >
                Prospective (Unlabeled)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: PREDICTION SUMMARY (5 PRIMARY METRIC CARDS) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-semibold">
            Validation Metric Indicators
          </h2>
          {!displayData.groundTruthProvided && (
            <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              Ground truth not provided (Metrics shown as N/A)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Mean Dice */}
          <div className="p-5 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-2">
            <span className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider block">
              Mean Dice
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-[#F4F7FC]">
              {displayData.groundTruthProvided && displayData.meanDice !== null ? (
                displayData.meanDice.toFixed(4)
              ) : (
                <span className="text-[#627D98] text-xl">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-tight font-sans">
              {displayData.groundTruthProvided ? 'Average over WT, TC, ET' : 'Ground truth not provided'}
            </p>
          </div>

          {/* WT Dice */}
          <div className="p-5 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider">WT Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#35B982]"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-emerald-400">
              {displayData.groundTruthProvided && displayData.wtDice !== null ? (
                displayData.wtDice.toFixed(4)
              ) : (
                <span className="text-[#627D98] text-xl">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-tight font-sans">
              {displayData.groundTruthProvided ? 'Whole Tumor boundary' : 'Ground truth not provided'}
            </p>
          </div>

          {/* TC Dice */}
          <div className="p-5 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider">TC Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#F4B860]"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-amber-400">
              {displayData.groundTruthProvided && displayData.tcDice !== null ? (
                displayData.tcDice.toFixed(4)
              ) : (
                <span className="text-[#627D98] text-xl">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-tight font-sans">
              {displayData.groundTruthProvided ? 'Tumor Core structure' : 'Ground truth not provided'}
            </p>
          </div>

          {/* ET Dice */}
          <div className="p-5 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider">ET Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-rose-400">
              {displayData.groundTruthProvided && displayData.etDice !== null ? (
                displayData.etDice.toFixed(4)
              ) : (
                <span className="text-[#627D98] text-xl">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-tight font-sans">
              {displayData.groundTruthProvided ? 'Enhancing active tissue' : 'Ground truth not provided'}
            </p>
          </div>

          {/* Mean HD95 */}
          <div className="p-5 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-2 col-span-2 sm:col-span-1">
            <span className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider block">
              Mean HD95
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-[#38BDF8]">
              {displayData.groundTruthProvided && displayData.meanHd95 !== null ? (
                <span>{displayData.meanHd95.toFixed(2)} <span className="text-xs font-normal text-[#94A3B8] font-sans">vx</span></span>
              ) : (
                <span className="text-[#627D98] text-xl">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-tight font-sans">
              {displayData.groundTruthProvided ? '95th %ile Hausdorff error' : 'Ground truth not provided'}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: REGION VOLUMETRICS & MODEL SPECIFICATIONS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* SUB-COMPARTMENT VOLUMETRIC ANALYSIS */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-5">
          <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
            <h3 className="text-sm font-semibold text-[#F4F7FC] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#4C8DFF]" />
              <span>Sub-Compartment Volumetric Breakdown</span>
            </h3>
            <span className="text-[11px] font-mono text-[#94A3B8]">Calculated from predicted voxel count</span>
          </div>

          <div className="space-y-4">
            {REGION_LEGEND.map((region) => {
              const vol = region.code === 'WT' 
                ? displayData.wtVolumeCm3 
                : region.code === 'TC' 
                ? displayData.tcVolumeCm3 
                : displayData.etVolumeCm3;

              const percent = displayData.wtVolumeCm3 > 0 
                ? ((vol / displayData.wtVolumeCm3) * 100).toFixed(1)
                : '0.0';

              return (
                <div key={region.code} className="p-4 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: region.color }} />
                      <span className="font-semibold text-[#F4F7FC] text-xs">{region.name} ({region.code})</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#F4F7FC]">
                      {vol.toFixed(2)} cm³ <span className="text-xs text-[#94A3B8] font-normal">({percent}% WT)</span>
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#0B1019] overflow-hidden border border-[#1C2636]">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, parseFloat(percent))}%`, backgroundColor: region.color }}
                    />
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-tight font-sans">
                    {region.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* VERIFIED MODEL EXECUTION SPECIFICATIONS */}
        <div className="p-6 rounded-xl bg-[#101722] border border-[#1C2636] shadow-medical-card space-y-5">
          <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
            <h3 className="text-sm font-semibold text-[#F4F7FC] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#4C8DFF]" />
              <span>Model Execution Metadata</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              Verified
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-[#1C2636]">
              <span className="text-[#94A3B8] font-sans">Model Framework:</span>
              <span className="font-semibold text-[#F4F7FC]">{displayData.modelName}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-[#1C2636]">
              <span className="text-[#94A3B8] font-sans">Architecture:</span>
              <span className="font-semibold text-[#38BDF8]">UNETR 3D (ViT-B/16)</span>
            </div>

            <div className="flex justify-between py-2 border-b border-[#1C2636]">
              <span className="text-[#94A3B8] font-sans">Inference Latency:</span>
              <span className="font-mono text-emerald-400 font-semibold">{displayData.inferenceTime}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-[#1C2636]">
              <span className="text-[#94A3B8] font-sans">Accelerator Device:</span>
              <span className="font-mono text-[#4C8DFF] font-semibold">{displayData.device}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-[#1C2636]">
              <span className="text-[#94A3B8] font-sans">Input Modalities:</span>
              <span className="font-mono text-[#F4F7FC]">FLAIR, T1, T1ce, T2</span>
            </div>

            <div className="flex justify-between py-2 border-b border-[#1C2636]">
              <span className="text-[#94A3B8] font-sans">Sliding Window:</span>
              <span className="font-mono text-[#F4F7FC]">96×96×96 (0.25 overlap)</span>
            </div>

            <div className="flex justify-between py-2 border-b border-[#1C2636]">
              <span className="text-[#94A3B8] font-sans">Active Checkpoint:</span>
              <span className="font-mono text-[11px] text-purple-400 truncate max-w-[160px]" title="checkpoints/adaptive/best.pth">
                checkpoints/adaptive/best.pth
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-[#94A3B8] font-sans">Inference Precision:</span>
              <span className="font-mono text-[#F4F7FC]">PyTorch FP16 AMP</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
