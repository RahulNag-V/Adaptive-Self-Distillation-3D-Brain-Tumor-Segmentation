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
  HelpCircle,
  TrendingUp,
  Download,
  Eye,
  RotateCcw
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-medical-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Segmentation Results
            </h1>
            {isLive ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-medium">
                Live Case Result
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-medical-card border border-medical-border text-medical-muted text-xs font-mono">
                Demo Preview Mode
              </span>
            )}
          </div>
          <p className="text-sm text-medical-muted mt-1">
            Volumetric lesion analysis and validation performance metrics.
          </p>
        </div>

        {/* Live session controls or Demo toggle */}
        <div className="flex items-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('viewer')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-medical-teal hover:bg-medical-tealLight text-medical-darkest text-xs font-semibold transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open in 3D Viewer</span>
              </button>

              {currentResult.prediction_file && (
                <a
                  href={currentResult.prediction_file}
                  download="prediction.nii.gz"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-border text-xs text-white transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-medical-teal" />
                  <span>NIfTI</span>
                </a>
              )}

              <button
                onClick={onClearLiveResult}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-border text-xs text-medical-muted hover:text-white transition-all"
                title="Switch back to demo preview"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-1 rounded-lg bg-medical-card border border-medical-border text-xs">
              <span className="text-medical-muted text-[11px] px-2 font-mono uppercase">Case Mode:</span>
              <button
                onClick={() => setCaseType('benchmark')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  caseType === 'benchmark'
                    ? 'bg-medical-teal text-medical-darkest font-semibold'
                    : 'text-medical-muted hover:text-white'
                }`}
              >
                Benchmark (w/ Ground Truth)
              </button>
              <button
                onClick={() => setCaseType('unlabeled')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  caseType === 'unlabeled'
                    ? 'bg-medical-teal text-medical-darkest font-semibold'
                    : 'text-medical-muted hover:text-white'
                }`}
              >
                Prospective (Unlabeled)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: PREDICTION SUMMARY (5 PRIMARY CARDS) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold">
            Validation Metric Indicators
          </h2>
          {!displayData.groundTruthProvided && (
            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Ground truth not provided (Metrics shown as N/A)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Mean Dice */}
          <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-2">
            <span className="text-xs text-medical-muted font-mono uppercase tracking-wider block">
              Mean Dice
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-white">
              {displayData.groundTruthProvided && displayData.meanDice !== null ? (
                displayData.meanDice.toFixed(4)
              ) : (
                <span className="text-medical-muted text-lg">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-medical-muted leading-tight">
              {displayData.groundTruthProvided ? 'Average over WT, TC, ET' : 'Ground truth not provided'}
            </p>
          </div>

          {/* WT Dice */}
          <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-medical-muted font-mono uppercase tracking-wider">WT Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-tumor-wt"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-emerald-400">
              {displayData.groundTruthProvided && displayData.wtDice !== null ? (
                displayData.wtDice.toFixed(4)
              ) : (
                <span className="text-medical-muted text-lg">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-medical-muted leading-tight">
              {displayData.groundTruthProvided ? 'Whole Tumor boundary' : 'Ground truth not provided'}
            </p>
          </div>

          {/* TC Dice */}
          <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-medical-muted font-mono uppercase tracking-wider">TC Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-tumor-tc"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-amber-400">
              {displayData.groundTruthProvided && displayData.tcDice !== null ? (
                displayData.tcDice.toFixed(4)
              ) : (
                <span className="text-medical-muted text-lg">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-medical-muted leading-tight">
              {displayData.groundTruthProvided ? 'Tumor Core structure' : 'Ground truth not provided'}
            </p>
          </div>

          {/* ET Dice */}
          <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-medical-muted font-mono uppercase tracking-wider">ET Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-tumor-et"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-red-400">
              {displayData.groundTruthProvided && displayData.etDice !== null ? (
                displayData.etDice.toFixed(4)
              ) : (
                <span className="text-medical-muted text-lg">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-medical-muted leading-tight">
              {displayData.groundTruthProvided ? 'Enhancing active tissue' : 'Ground truth not provided'}
            </p>
          </div>

          {/* Mean HD95 */}
          <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-2 col-span-2 sm:col-span-1">
            <span className="text-xs text-medical-muted font-mono uppercase tracking-wider block">
              Mean HD95
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-medical-cyan">
              {displayData.groundTruthProvided && displayData.meanHd95 !== null ? (
                <span>{displayData.meanHd95.toFixed(2)} <span className="text-sm font-normal text-medical-muted font-sans">vx</span></span>
              ) : (
                <span className="text-medical-muted text-lg">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-medical-muted leading-tight">
              {displayData.groundTruthProvided ? '95th %ile Hausdorff error' : 'Ground truth not provided'}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: REGION ANALYSIS & VOLUMETRICS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl bg-medical-base border border-medical-border space-y-5">
          <div className="flex items-center justify-between border-b border-medical-border pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-medical-teal" />
              <span>Region Volumetric Analysis</span>
            </h3>
            <span className="text-[11px] font-mono text-medical-muted">Calculated from predicted voxel count</span>
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
                <div key={region.code} className="p-4 rounded-lg bg-medical-card border border-medical-border/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: region.color }} />
                      <span className="font-semibold text-white text-xs">{region.name} ({region.code})</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-white">
                      {vol.toFixed(2)} cm³ <span className="text-xs text-medical-muted">({percent}% WT)</span>
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-medical-surface overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, parseFloat(percent))}%`, backgroundColor: region.color }}
                    />
                  </div>
                  <p className="text-[11px] text-medical-muted leading-tight">
                    {region.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: MODEL INFORMATION & METADATA */}
        <div className="p-6 rounded-xl bg-medical-base border border-medical-border space-y-5">
          <div className="flex items-center justify-between border-b border-medical-border pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-medical-cyan" />
              <span>Model Execution Metadata</span>
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-medical-border/60">
              <span className="text-medical-muted">Model Framework</span>
              <span className="font-semibold text-white">{displayData.modelName}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-medical-border/60">
              <span className="text-medical-muted">Architecture</span>
              <span className="font-semibold text-white">UNETR (Transformer 3D)</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-medical-border/60">
              <span className="text-medical-muted">Inference Latency</span>
              <span className="font-mono text-emerald-400 font-semibold">{displayData.inferenceTime}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-medical-border/60">
              <span className="text-medical-muted">Device</span>
              <span className="font-mono text-medical-tealLight font-semibold">{displayData.device}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-medical-border/60">
              <span className="text-medical-muted">Input Modalities</span>
              <span className="font-mono text-white">FLAIR, T1, T1ce, T2 (4ch)</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-medical-border/60">
              <span className="text-medical-muted">Active Checkpoint</span>
              <span className="font-mono text-[11px] text-medical-tealLight truncate max-w-[160px]">
                checkpoints/adaptive/best.pth
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-medical-muted">Inference Precision</span>
              <span className="font-mono text-white">PyTorch FP16 AMP</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
