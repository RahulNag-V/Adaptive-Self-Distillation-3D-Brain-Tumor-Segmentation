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
  HardDrive,
  Brain
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn text-[#111827]">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#98D9CE]/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EBF8F6] text-[#103B5C] border border-[#98D9CE]/60 uppercase">
              Quantitative Volumetric Assessment
            </span>
            <span className="text-xs text-[#6B7280] font-mono">Phase 2: Post-Inference Metrics</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              Segmentation <span className="text-[#103B5C]">Results</span>
            </h1>
            {isLive ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Case Result</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-[#F8FCFB] border border-[#98D9CE]/60 text-[#103B5C] text-xs font-mono font-bold">
                {caseType === 'benchmark' ? 'Demo Benchmark • BraTS Reference' : 'Demo Mode • Prospective Unlabeled'}
              </span>
            )}
          </div>
          <p className="text-sm text-[#475569] mt-1">
            Volumetric lesion analysis, quantitative sub-compartment burden, and validation performance indicators.
          </p>
        </div>

        {/* Live session controls or Demo toggle */}
        <div className="flex items-center gap-2.5">
          {isLive ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate && onNavigate('viewer')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#399DBA] hover:bg-[#103B5C] hover:opacity-90 text-white text-xs font-bold transition-opacity shadow-sm cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open in 3D Viewer</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('adaptive')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#103B5C] hover:bg-[#0c2c45] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Proceed to Adaptive Review</span>
              </button>

              {currentResult.prediction_file && (
                <a
                  href={currentResult.prediction_file}
                  download="prediction.nii.gz"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-[#F8FCFB] border border-[#98D9CE]/60 text-xs text-[#103B5C] transition-all shadow-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5 text-[#103B5C]" />
                  <span>Download NIfTI</span>
                </a>
              )}

              <button
                onClick={onClearLiveResult}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#F8FCFB] border border-[#98D9CE]/60 text-xs text-[#6B7280] hover:text-[#103B5C] transition-all shadow-xs cursor-pointer font-bold"
                title="Switch back to demo preview"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F8FCFB] border border-[#98D9CE]/60 text-xs shadow-xs">
              <span className="text-[#6B7280] text-[10px] px-2 font-mono uppercase font-bold">Case:</span>
              <button
                onClick={() => setCaseType('benchmark')}
                className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                  caseType === 'benchmark'
                    ? 'bg-[#399DBA] hover:bg-[#103B5C] text-white font-bold shadow-xs'
                    : 'text-[#475569] hover:text-[#103B5C]'
                }`}
              >
                Benchmark (w/ Ground Truth)
              </button>
              <button
                onClick={() => setCaseType('unlabeled')}
                className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                  caseType === 'unlabeled'
                    ? 'bg-[#399DBA] hover:bg-[#103B5C] text-white font-bold shadow-xs'
                    : 'text-[#475569] hover:text-[#103B5C]'
                }`}
              >
                Prospective (Unlabeled)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: PREDICTION SUMMARY (5 PRIMARY METRIC CARDS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#103B5C] font-bold">
            Validation Metric Indicators
          </h2>
          {!displayData.groundTruthProvided && (
            <span className="text-[11px] font-mono text-amber-800 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Ground truth not provided (Dice & HD95 non-calculable)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Mean Dice */}
          <div className="card-transparent-interactive p-4 sm:p-5 rounded-xl space-y-1.5">
            <span className="text-xs text-[#25313D] font-mono uppercase tracking-wider block font-bold">
              Mean Dice
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-[#103B5C]">
              {displayData.groundTruthProvided && displayData.meanDice !== null ? (
                displayData.meanDice.toFixed(4)
              ) : (
                <span className="text-[#94A3B8] text-xl font-mono">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#25313D] leading-tight font-sans">
              {displayData.groundTruthProvided ? 'Average across WT, TC, ET' : 'Reference ground truth missing'}
            </p>
          </div>

          {/* WT Dice */}
          <div className="card-transparent-interactive p-4 sm:p-5 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#25313D] font-mono uppercase tracking-wider font-bold">WT Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308]"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-[#B45309]">
              {displayData.groundTruthProvided && displayData.wtDice !== null ? (
                displayData.wtDice.toFixed(4)
              ) : (
                <span className="text-[#94A3B8] text-xl font-mono">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#25313D] leading-tight font-sans">
              {displayData.groundTruthProvided ? 'Whole Tumor boundary overlap' : 'Reference ground truth missing'}
            </p>
          </div>

          {/* TC Dice */}
          <div className="card-transparent-interactive p-4 sm:p-5 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#25313D] font-mono uppercase tracking-wider font-bold">TC Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-[#DC2626]">
              {displayData.groundTruthProvided && displayData.tcDice !== null ? (
                displayData.tcDice.toFixed(4)
              ) : (
                <span className="text-[#94A3B8] text-xl font-mono">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#25313D] leading-tight font-sans">
              {displayData.groundTruthProvided ? 'Tumor Core structure overlap' : 'Reference ground truth missing'}
            </p>
          </div>

          {/* ET Dice */}
          <div className="card-transparent-interactive p-4 sm:p-5 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#25313D] font-mono uppercase tracking-wider font-bold">ET Dice</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-[#0891B2]">
              {displayData.groundTruthProvided && displayData.etDice !== null ? (
                displayData.etDice.toFixed(4)
              ) : (
                <span className="text-[#94A3B8] text-xl font-mono">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#25313D] leading-tight font-sans">
              {displayData.groundTruthProvided ? 'Enhancing active tissue overlap' : 'Reference ground truth missing'}
            </p>
          </div>

          {/* Mean HD95 */}
          <div className="card-transparent-interactive p-4 sm:p-5 rounded-xl space-y-1.5 col-span-2 sm:col-span-1">
            <span className="text-xs text-[#25313D] font-mono uppercase tracking-wider block font-bold">
              Mean HD95
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono font-tabular text-[#103B5C]">
              {displayData.groundTruthProvided && displayData.meanHd95 !== null ? (
                <span>{displayData.meanHd95.toFixed(2)} <span className="text-xs font-normal text-[#25313D] font-sans">mm</span></span>
              ) : (
                <span className="text-[#94A3B8] text-xl font-mono">N/A</span>
              )}
            </div>
            <p className="text-[11px] text-[#25313D] leading-tight font-sans">
              {displayData.groundTruthProvided ? '95th %ile Hausdorff distance' : 'Reference ground truth missing'}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: REGION VOLUMETRICS & MODEL SPECIFICATIONS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* SUB-COMPARTMENT VOLUMETRIC ANALYSIS */}
        <div className="card-transparent lg:col-span-2 p-5 sm:p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
            <h3 className="text-sm font-bold text-[#103B5C] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#103B5C]" />
              <span>Sub-Compartment Volumetric Breakdown</span>
            </h3>
            <span className="text-[11px] font-mono text-[#25313D] font-bold">Calculated from 1.0mm³ isotropic voxel count</span>
          </div>

          <div className="space-y-3.5">
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
                <div key={region.code} className="p-4 rounded-lg bg-white/20 border border-[#111111]/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: region.color }} />
                      <span className="font-bold text-[#103B5C] text-xs">{region.name} ({region.code})</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#111827]">
                      {vol.toFixed(2)} cm³ <span className="text-xs text-[#25313D] font-normal font-bold">({percent}% WT)</span>
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden border border-[#111111]/20">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, parseFloat(percent))}%`, backgroundColor: region.color }}
                    />
                  </div>
                  <p className="text-[11px] text-[#25313D] leading-tight font-sans">
                    {region.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Clinical Interpretation Guidance */}
          <div className="pt-2 border-t border-[#111111]/20 text-[11px] text-[#25313D] leading-relaxed">
            <span className="text-[#103B5C] font-bold">Clinical Note: </span>
            Whole Tumor (WT) includes necrotic core (NCR), peritumoral edema (ED), and enhancing tumor (ET). Active tumor burden monitoring focuses primarily on ET volume shifts following targeted radiotherapy and chemotherapy.
          </div>
        </div>

        {/* VERIFIED MODEL EXECUTION SPECIFICATIONS */}
        <div className="card-transparent p-5 sm:p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
            <h3 className="text-sm font-bold text-[#103B5C] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#103B5C]" />
              <span>Model Execution Metadata</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-bold">
              Verified
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#111111]/15">
              <span className="text-[#25313D] font-sans font-bold">Model Framework:</span>
              <span className="font-bold text-[#103B5C]">{displayData.modelName}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-[#111111]/15">
              <span className="text-[#25313D] font-sans font-bold">Architecture:</span>
              <span className="font-bold text-[#103B5C]">UNETR 3D (ViT-B/16)</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-[#111111]/15">
              <span className="text-[#25313D] font-sans font-bold">Inference Latency:</span>
              <span className="font-mono text-emerald-800 font-bold">{displayData.inferenceTime}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-[#111111]/15">
              <span className="text-[#25313D] font-sans font-bold">Accelerator Device:</span>
              <span className="font-mono text-[#103B5C] font-bold">{displayData.device}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-[#111111]/15">
              <span className="text-[#25313D] font-sans font-bold">Input Modalities:</span>
              <span className="font-mono text-[#111827] font-bold">FLAIR, T1, T1ce, T2</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-[#111111]/15">
              <span className="text-[#25313D] font-sans font-bold">Sliding Window:</span>
              <span className="font-mono text-[#111827] font-bold">96×96×96 (0.25 overlap)</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-[#111111]/15">
              <span className="text-[#25313D] font-sans font-bold">Active Checkpoint:</span>
              <span className="font-mono text-[11px] text-purple-800 font-bold truncate max-w-[150px]" title="checkpoints/adaptive/best.pth">
                checkpoints/adaptive/best.pth
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-[#25313D] font-sans font-bold">Inference Precision:</span>
              <span className="font-mono text-[#111827] font-bold">PyTorch FP16 AMP</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
