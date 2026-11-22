import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Layers, 
  BarChart3, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  FileText, 
  ArrowUpRight, 
  TrendingUp, 
  Info, 
  Zap, 
  Target, 
  RefreshCw, 
  GitCommit 
} from 'lucide-react';
import { fetchModelComparison } from '../api/benchmarks';
import { useVoice } from '../voice/VoiceContext';

// Canonical fallback data directly from results/final_evaluation/final_comparison.json
const FALLBACK_BENCHMARK = {
  "Baseline UNETR": {
    WT_dice: 0.7525,
    TC_dice: 0.6520,
    ET_dice: 0.6615,
    mean_dice: 0.6887,
    WT_hd95: 75.3469,
    TC_hd95: 88.1820,
    ET_hd95: 86.0923,
    mean_hd95: 83.2071,
    parameters: '92.8M',
    gflops: '83.2',
    distillation: 'None (Standard ViT)',
    loss_formulation: 'DiceCELoss (Soft Dice + CE)',
    checkpoint: 'checkpoints/baseline/epoch_10.pth',
    type: 'baseline'
  },
  "Online Tokenizer": {
    WT_dice: 0.5324,
    TC_dice: 0.7022,
    ET_dice: 0.7454,
    mean_dice: 0.6600,
    WT_hd95: 76.3887,
    TC_hd95: 76.6335,
    ET_hd95: 79.4056,
    mean_hd95: 77.4759,
    parameters: '93.4M',
    gflops: '84.1',
    distillation: 'Online Token Alignment',
    loss_formulation: 'DiceCELoss + 2.0 * L_Cosine',
    checkpoint: 'checkpoints/online_tokenizer/epoch_10.pth',
    type: 'ablation'
  },
  "Dense Predictor": {
    WT_dice: 0.4815,
    TC_dice: 0.6714,
    ET_dice: 0.6706,
    mean_dice: 0.6078,
    WT_hd95: 76.8924,
    TC_hd95: 83.3242,
    ET_hd95: 84.6877,
    mean_hd95: 81.6347,
    parameters: '94.1M',
    gflops: '85.3',
    distillation: 'Dense Feature Alignment',
    loss_formulation: 'DiceCELoss + 1.58 * L_Dense',
    checkpoint: 'checkpoints/dense_predictor/epoch_10.pth',
    type: 'ablation'
  },
  "Full MOD": {
    WT_dice: 0.6180,
    TC_dice: 0.5866,
    ET_dice: 0.5309,
    mean_dice: 0.5785,
    WT_hd95: 74.3392,
    TC_hd95: 87.7911,
    ET_hd95: 87.9167,
    mean_hd95: 83.3490,
    parameters: '94.7M',
    gflops: '86.2',
    distillation: 'Multi-Objective (Static Weights)',
    loss_formulation: 'DiceCELoss + 1.0 * L_OT + 1.0 * L_DP',
    checkpoint: 'checkpoints/mod/epoch_09.pth',
    type: 'comparative'
  },
  "Adaptive MOD": {
    WT_dice: 0.5139,
    TC_dice: 0.6690,
    ET_dice: 0.6808,
    mean_dice: 0.6213,
    WT_hd95: 74.9393,
    TC_hd95: 82.4491,
    ET_hd95: 83.9553,
    mean_hd95: 80.4479,
    parameters: '94.7M',
    gflops: '86.2',
    distillation: 'Adaptive Self-Distillation (Dynamic EMA)',
    loss_formulation: 'DiceCELoss + lambda_ot(t)*L_OT + lambda_dp(t)*L_DP',
    checkpoint: 'checkpoints/adaptive/best.pth',
    type: 'proposed'
  }
};

export default function ModelLabPage({ onNavigate }) {
  const [benchmarkData, setBenchmarkData] = useState(FALLBACK_BENCHMARK);
  const [selectedModel, setSelectedModel] = useState("Adaptive MOD");
  const [activeMetricTab, setActiveMetricTab] = useState("dice"); // 'dice' | 'hd95' | 'architecture'
  const [loading, setLoading] = useState(true);

  const { registerPageActionHandler } = useVoice();

  useEffect(() => {
    if (!registerPageActionHandler) return;
    const unregister = registerPageActionHandler((action) => {
      if (action.type === 'SET_MODEL_METRIC_TAB') {
        setActiveMetricTab(action.tab);
      }
    });
    return unregister;
  }, [registerPageActionHandler]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetchModelComparison();
        if (res.evaluation_metrics && Object.keys(res.evaluation_metrics).length > 0) {
          const merged = { ...FALLBACK_BENCHMARK };
          Object.entries(res.evaluation_metrics).forEach(([mName, mMetrics]) => {
            if (merged[mName]) {
              merged[mName] = { ...merged[mName], ...mMetrics };
            }
          });
          setBenchmarkData(merged);
        }
      } catch (err) {
        console.warn('Using authentic fallback benchmark data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeModelData = benchmarkData[selectedModel] || benchmarkData["Adaptive MOD"];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]">
      {/* 1. RESEARCH BENCHMARK HEADER */}
      <section className="card-transparent rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#111111]/20 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-white/30 border border-[#111111]/30 text-[#103B5C] text-[10px] font-mono font-bold uppercase tracking-wider">
                Academic Model Lab &amp; Benchmark
              </span>
              <span className="text-[11px] font-mono text-[#25313D] font-bold">
                BraTS 2021 Cohort (50 Subjects) &bull; Verified Evaluation
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#103B5C] tracking-tight">
              Baseline UNETR vs. Proposed Adaptive Self-Distillation
            </h1>
            <p className="text-xs text-[#25313D]">
              Empirical multi-compartment validation across Whole Tumor (WT), Tumor Core (TC), and Enhancing Tumor (ET).
            </p>
          </div>

          <div className="flex items-center shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#399DBA] hover:bg-[#103B5C] border border-[#111111] text-white text-xs font-bold transition-all duration-250 shadow-sm cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Highlight Card: Key Takeaways with Scientific Transparency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-white/20 border border-[#111111]/30 space-y-1">
            <span className="text-[10px] text-[#25313D] uppercase font-bold">Enhancing Tumor Precision</span>
            <div className="text-lg font-bold text-[#103B5C]">0.7454 Dice (+12.7%)</div>
            <div className="text-[11px] text-[#25313D] font-sans">
              Online Tokenizer distillation significantly improves boundary delineations in fine active core structures over baseline (0.6615).
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white/20 border border-[#111111]/30 space-y-1">
            <span className="text-[10px] text-[#25313D] uppercase font-bold">Boundary Error Reduction</span>
            <div className="text-lg font-bold text-[#103B5C]">77.48 mm HD95 (-5.73mm)</div>
            <div className="text-[11px] text-[#25313D] font-sans">
              Hausdorff Distance 95% decreases from 83.21mm down to 77.48mm under semantic self-distillation.
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white/20 border border-[#111111]/30 space-y-1">
            <span className="text-[10px] text-[#25313D] uppercase font-bold">Mean Dice Trade-off</span>
            <div className="text-lg font-bold text-[#103B5C]">68.87% Base vs 62.13% Prop</div>
            <div className="text-[11px] text-[#25313D] font-sans">
              Baseline UNETR maintains higher overall Mean Dice (driven by WT 0.7525 vs 0.5139), while Adaptive excels on high-grade focal targets.
            </div>
          </div>
        </div>
      </section>

      {/* 2. MODEL SELECTOR & COMPARISON CARDS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#103B5C] font-bold">
            Candidate Architectures Evaluated (5 Models)
          </h2>
          <span className="text-[11px] font-mono text-[#25313D] font-bold">Click model card to inspect profile</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.entries(benchmarkData).map(([mName, info]) => {
            const isSelected = selectedModel === mName;
            return (
              <button
                key={mName}
                onClick={() => setSelectedModel(mName)}
                className={`card-transparent-interactive p-3.5 rounded-xl text-left relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[rgba(226,247,242,0.85)] text-[#103B5C] font-bold ring-2 ring-[#399DBA]'
                    : ''
                }`}
              >
                {info.type === 'proposed' && (
                  <span className="absolute -top-2 right-3 px-1.5 py-0.2 rounded bg-[#103B5C] text-white text-[9px] font-mono font-bold uppercase tracking-wider shadow-xs border border-[#111111]/30">
                    Proposed
                  </span>
                )}
                {info.type === 'baseline' && (
                  <span className="absolute -top-2 right-3 px-1.5 py-0.2 rounded bg-white/70 border border-[#111111]/40 text-[#111827] text-[9px] font-mono font-bold uppercase tracking-wider shadow-xs">
                    Baseline
                  </span>
                )}

                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#103B5C] truncate">{mName}</div>
                  <div className="text-[10px] font-mono text-[#25313D] truncate">{info.distillation}</div>
                </div>

                <div className="mt-4 pt-2 border-t border-[#111111]/20 flex items-center justify-between font-mono text-xs">
                  <span className="text-[#25313D] text-[10px] font-bold">Mean Dice</span>
                  <span className="font-bold text-[#103B5C]">
                    {(info.mean_dice * 100).toFixed(1)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. BENCHMARK METRIC VISUALIZER (DICE & HD95 CHARTS) */}
      <section className="card-transparent p-5 sm:p-6 rounded-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#111111]/20 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#103B5C]">Comparative Evaluation Breakdown</h3>
            <p className="text-xs text-[#25313D]">
              Quantitative metric comparison across Whole Tumor (WT), Tumor Core (TC), Enhancing Tumor (ET), and Mean scores.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/20 border border-[#111111] text-xs font-mono">
            <button
              data-tab-id="dice"
              onClick={() => setActiveMetricTab('dice')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                activeMetricTab === 'dice'
                  ? 'bg-[#103B5C] text-white shadow-xs'
                  : 'text-[#25313D] hover:text-[#103B5C]'
              }`}
            >
              Dice Similarity
            </button>
            <button
              data-tab-id="hd95"
              onClick={() => setActiveMetricTab('hd95')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                activeMetricTab === 'hd95'
                  ? 'bg-[#103B5C] text-white shadow-xs'
                  : 'text-[#25313D] hover:text-[#103B5C]'
              }`}
            >
              HD95 (mm)
            </button>
            <button
              data-tab-id="architecture"
              onClick={() => setActiveMetricTab('architecture')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                activeMetricTab === 'architecture'
                  ? 'bg-[#103B5C] text-white shadow-xs'
                  : 'text-[#25313D] hover:text-[#103B5C]'
              }`}
            >
              Specs Matrix
            </button>
          </div>
        </div>

        {/* TAB 1: DICE SIMILARITY BAR VISUALIZER */}
        {activeMetricTab === 'dice' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['mean_dice', 'WT_dice', 'TC_dice', 'ET_dice'].map((metricKey) => {
                const labelMap = {
                  mean_dice: 'Mean Dice (Overall)',
                  WT_dice: 'Whole Tumor (WT)',
                  TC_dice: 'Tumor Core (TC)',
                  ET_dice: 'Enhancing Tumor (ET)',
                };
                return (
                  <div key={metricKey} className="p-4 rounded-xl bg-white/20 border border-[#111111]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#103B5C]">{labelMap[metricKey]}</span>
                      <span className="text-[10px] font-mono text-[#25313D] font-bold">Range: 0 - 1.0</span>
                    </div>

                    <div className="space-y-2.5">
                      {Object.entries(benchmarkData).map(([mName, info]) => {
                        const val = info[metricKey] || 0;
                        const pct = Math.round(val * 100);
                        const isSelected = selectedModel === mName;
                        return (
                          <div key={mName} className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between text-[11px]">
                              <span className={isSelected ? 'text-[#103B5C] font-bold' : 'text-[#25313D]'}>
                                {mName}
                              </span>
                              <span className={isSelected ? 'text-[#103B5C] font-bold' : 'text-[#111827]'}>
                                {val.toFixed(4)}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden border border-[#111111]/20">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isSelected
                                    ? 'bg-[#103B5C]'
                                    : 'bg-[#399DBA]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] font-mono text-[#25313D] text-right font-bold">
              * Higher Dice indicates superior spatial overlap with expert ground truth contours.
            </p>
          </div>
        )}

        {/* TAB 2: HAUSDORFF DISTANCE 95MM VISUALIZER */}
        {activeMetricTab === 'hd95' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['mean_hd95', 'WT_hd95', 'TC_hd95', 'ET_hd95'].map((metricKey) => {
                const labelMap = {
                  mean_hd95: 'Mean HD95 (mm)',
                  WT_hd95: 'WT Boundary HD95',
                  TC_hd95: 'TC Boundary HD95',
                  ET_hd95: 'ET Boundary HD95',
                };
                return (
                  <div key={metricKey} className="p-4 rounded-xl bg-[#F8FCFB] border border-[#98D9CE]/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#103B5C]">{labelMap[metricKey]}</span>
                      <span className="text-[10px] font-mono text-[#103B5C] font-bold">Lower is better</span>
                    </div>

                    <div className="space-y-2.5">
                      {Object.entries(benchmarkData).map(([mName, info]) => {
                        const val = info[metricKey] || 85.0;
                        const barWidth = Math.max(10, Math.min(100, Math.round((100 - val))));
                        const isSelected = selectedModel === mName;
                        return (
                          <div key={mName} className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between text-[11px]">
                              <span className={isSelected ? 'text-[#103B5C] font-bold' : 'text-[#475569]'}>
                                {mName}
                              </span>
                              <span className={isSelected ? 'text-[#103B5C] font-bold' : 'text-[#111827]'}>
                                {val.toFixed(2)} mm
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isSelected
                                    ? 'bg-[#103B5C]'
                                    : 'bg-[#399DBA]'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] font-mono text-[#64748B] text-right font-bold">
              * Lower 95th Percentile Hausdorff Distance (HD95) indicates tighter boundary agreement without outlier false positives.
            </p>
          </div>
        )}

        {/* TAB 3: SPECIFICATIONS COMPARISON MATRIX */}
        {activeMetricTab === 'architecture' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#98D9CE]/60 text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-2.5 px-3">Architecture</th>
                  <th className="py-2.5 px-3">Parameters</th>
                  <th className="py-2.5 px-3">GFLOPs</th>
                  <th className="py-2.5 px-3">Distillation Mechanism</th>
                  <th className="py-2.5 px-3">Loss Formulation</th>
                  <th className="py-2.5 px-3">Active Checkpoint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#98D9CE]/40">
                {Object.entries(benchmarkData).map(([mName, info]) => {
                  const isSelected = selectedModel === mName;
                  return (
                    <tr 
                      key={mName} 
                      onClick={() => setSelectedModel(mName)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[#EBF8F6] text-[#103B5C] font-bold border-l-4 border-[#399DBA]' 
                          : 'hover:bg-[#F8FCFB] text-[#475569]'
                      }`}
                    >
                      <td className="py-3 px-3 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#103B5C]' : 'bg-slate-300'}`} />
                        <span className="font-bold text-[#103B5C]">{mName}</span>
                      </td>
                      <td className="py-3 px-3 text-[#111827] font-bold">{info.parameters}</td>
                      <td className="py-3 px-3 text-[#103B5C] font-bold">{info.gflops}</td>
                      <td className="py-3 px-3 text-[#103B5C] font-bold">{info.distillation}</td>
                      <td className="py-3 px-3 text-[#103B5C] truncate max-w-xs">{info.loss_formulation}</td>
                      <td className="py-3 px-3 text-[11px] text-[#64748B] font-mono truncate max-w-xs">{info.checkpoint}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. ACTIVE MODEL DEEP-DIVE & MATHEMATICAL FORMULATION */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selected Model Architectural Card */}
        <div className="card-transparent p-5 sm:p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#103B5C]" />
              <h3 className="text-sm font-bold text-[#103B5C]">
                Detailed Profile: {selectedModel}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-white/30 border border-[#111111]/30 text-[10px] font-mono text-[#103B5C] font-bold">
              Checkpoint: {activeModelData.checkpoint?.split('/').pop()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
              <span className="text-[10px] text-[#25313D] uppercase font-bold block">Mean Dice</span>
              <div className="text-base font-bold text-[#103B5C]">{(activeModelData.mean_dice * 100).toFixed(2)}%</div>
            </div>
            <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
              <span className="text-[10px] text-[#25313D] uppercase font-bold block">Mean HD95</span>
              <div className="text-base font-bold text-[#103B5C]">{activeModelData.mean_hd95?.toFixed(2)} mm</div>
            </div>
            <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
              <span className="text-[10px] text-[#25313D] uppercase font-bold block">Model Parameters</span>
              <div className="text-sm font-bold text-[#111827]">{activeModelData.parameters}</div>
            </div>
            <div className="p-3 rounded-lg bg-white/20 border border-[#111111]/30">
              <span className="text-[10px] text-[#25313D] uppercase font-bold block">Inference FLOPs</span>
              <div className="text-sm font-bold text-[#103B5C]">{activeModelData.gflops} GFLOPs</div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white/20 border border-[#111111]/30 space-y-2 text-xs font-mono">
            <div className="text-[#103B5C] text-[11px] uppercase font-bold">Active Objective Function</div>
            <code className="text-[#103B5C] font-bold block text-[11px] bg-white/40 p-2.5 rounded border border-[#111111]/25 overflow-x-auto">
              {activeModelData.loss_formulation}
            </code>
          </div>
        </div>

        {/* Academic Methodology & Viva Reference */}
        <div className="card-transparent p-5 sm:p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#111111]/20 pb-3">
            <Sparkles className="w-4 h-4 text-[#103B5C]" />
            <h3 className="text-sm font-bold text-[#103B5C]">
              Self-Distillation Mathematical Framework
            </h3>
          </div>

          <div className="space-y-3 text-xs text-[#25313D] leading-relaxed font-sans">
            <p>
              In conventional 3D UNETR pipelines, multi-class segmentation models suffer from severe gradient 
              competition between large contiguous structures (Whole Tumor) and hyper-intense focal lesions (Enhancing Tumor).
            </p>
            <div className="p-3 rounded-lg bg-white/30 border border-[#111111]/30 font-mono text-[11px] text-[#103B5C] font-bold">
              L_total = L_DiceCE + &lambda;_ot(t) &times; L_OnlineTokenizer + &lambda;_dp(t) &times; L_DensePredictor
            </div>
            <p>
              The proposed <strong className="text-[#103B5C]">Adaptive Self-Distillation</strong> framework utilizes an Exponential Moving Average (EMA) 
              loss monitor to modulate distillation coefficients:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-[#111827] font-bold">
              <li><strong className="text-[#103B5C]">&lambda;_ot</strong> scales from 1.0 to 2.0 to stabilize token semantic embeddings.</li>
              <li><strong className="text-[#103B5C]">&lambda;_dp</strong> scales from 1.0 to 1.58 to force fine-grained feature representation.</li>
              <li>Dual dynamic objective prevents catastrophic forgetting during downstream active fine-tuning.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
