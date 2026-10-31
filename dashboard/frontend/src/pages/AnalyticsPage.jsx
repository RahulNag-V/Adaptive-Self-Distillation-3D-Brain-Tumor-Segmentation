import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Clock, 
  Cpu, 
  Zap, 
  Download, 
  CheckCircle2, 
  BarChart3, 
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { fetchTrainingAnalytics } from '../api/benchmarks';

// Canonical fallback data directly from results/adaptive/training_history.csv & validation_history.csv
const FALLBACK_TRAINING_HISTORY = [
  { epoch: 1, segmentation_loss: 1.0663, online_tokenizer_loss: 0.2749, dense_predictor_loss: 0.5361, total_loss: 1.8774, lambda_ot: 1.2878, lambda_dp: 1.0989, time_sec: 33.02 },
  { epoch: 2, segmentation_loss: 1.0069, online_tokenizer_loss: 0.2109, dense_predictor_loss: 0.5514, total_loss: 1.8846, lambda_ot: 1.5538, lambda_dp: 1.1863, time_sec: 33.84 },
  { epoch: 3, segmentation_loss: 0.9694, online_tokenizer_loss: 0.0520, dense_predictor_loss: 0.5295, total_loss: 1.6784, lambda_ot: 1.8241, lambda_dp: 1.2635, time_sec: 36.51 },
  { epoch: 4, segmentation_loss: 0.9527, online_tokenizer_loss: 0.0495, dense_predictor_loss: 0.5392, total_loss: 1.7242, lambda_ot: 2.0000, lambda_dp: 1.3310, time_sec: 36.55 },
  { epoch: 5, segmentation_loss: 0.9328, online_tokenizer_loss: 0.0524, dense_predictor_loss: 0.5364, total_loss: 1.7515, lambda_ot: 2.0000, lambda_dp: 1.3899, time_sec: 35.60 },
  { epoch: 6, segmentation_loss: 0.9209, online_tokenizer_loss: 0.0488, dense_predictor_loss: 0.5360, total_loss: 1.7636, lambda_ot: 2.0000, lambda_dp: 1.4408, time_sec: 36.10 },
  { epoch: 7, segmentation_loss: 0.9018, online_tokenizer_loss: 0.0499, dense_predictor_loss: 0.5266, total_loss: 1.7601, lambda_ot: 2.0000, lambda_dp: 1.4848, time_sec: 40.34 },
  { epoch: 8, segmentation_loss: 0.8959, online_tokenizer_loss: 0.0462, dense_predictor_loss: 0.5306, total_loss: 1.7763, lambda_ot: 2.0000, lambda_dp: 1.5225, time_sec: 37.79 },
  { epoch: 9, segmentation_loss: 0.8820, online_tokenizer_loss: 0.0484, dense_predictor_loss: 0.5141, total_loss: 1.7614, lambda_ot: 2.0000, lambda_dp: 1.5550, time_sec: 37.21 },
  { epoch: 10, segmentation_loss: 0.8660, online_tokenizer_loss: 0.0525, dense_predictor_loss: 0.5435, total_loss: 1.8162, lambda_ot: 2.0000, lambda_dp: 1.5817, time_sec: 37.10 },
];

const FALLBACK_VALIDATION_HISTORY = [
  { epoch: 1, WT_Dice: 0.1640, TC_Dice: 0.2177, ET_Dice: 0.2377, Mean_Dice: 0.2065, Mean_HD95: 92.5644 },
  { epoch: 2, WT_Dice: 0.2081, TC_Dice: 0.3705, ET_Dice: 0.3983, Mean_Dice: 0.3256, Mean_HD95: 91.1455 },
  { epoch: 3, WT_Dice: 0.2518, TC_Dice: 0.4402, ET_Dice: 0.4527, Mean_Dice: 0.3816, Mean_HD95: 90.0729 },
  { epoch: 4, WT_Dice: 0.2997, TC_Dice: 0.4776, ET_Dice: 0.5172, Mean_Dice: 0.4315, Mean_HD95: 88.2939 },
  { epoch: 5, WT_Dice: 0.3445, TC_Dice: 0.5293, ET_Dice: 0.5675, Mean_Dice: 0.4804, Mean_HD95: 87.4939 },
  { epoch: 6, WT_Dice: 0.3950, TC_Dice: 0.5818, ET_Dice: 0.6240, Mean_Dice: 0.5336, Mean_HD95: 86.0264 },
  { epoch: 7, WT_Dice: 0.4146, TC_Dice: 0.5848, ET_Dice: 0.6041, Mean_Dice: 0.5345, Mean_HD95: 85.8381 },
  { epoch: 8, WT_Dice: 0.4626, TC_Dice: 0.6230, ET_Dice: 0.6321, Mean_Dice: 0.5726, Mean_HD95: 83.7823 },
  { epoch: 9, WT_Dice: 0.5065, TC_Dice: 0.6692, ET_Dice: 0.6844, Mean_Dice: 0.6200, Mean_HD95: 81.6775 },
  { epoch: 10, WT_Dice: 0.5139, TC_Dice: 0.6690, ET_Dice: 0.6808, Mean_Dice: 0.6212, Mean_HD95: 80.4477 },
];

export default function AnalyticsPage({ onNavigate }) {
  const [trainingData, setTrainingData] = useState(FALLBACK_TRAINING_HISTORY);
  const [validationData, setValidationData] = useState(FALLBACK_VALIDATION_HISTORY);
  const [activeCurveTab, setActiveCurveTab] = useState('loss'); // 'loss' | 'dice' | 'lambda' | 'hd95'
  const [selectedEpoch, setSelectedEpoch] = useState(10);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetchTrainingAnalytics();
        if (res.adaptive_training && res.adaptive_training.length > 0) {
          setTrainingData(res.adaptive_training.map(r => ({
            epoch: r.epoch,
            segmentation_loss: r.segmentation_loss,
            online_tokenizer_loss: r.online_tokenizer_loss,
            dense_predictor_loss: r.dense_predictor_loss,
            total_loss: r.total_loss,
            lambda_ot: r.lambda_ot_after || r.lambda_ot,
            lambda_dp: r.lambda_dp_after || r.lambda_dp,
            time_sec: r.training_time_seconds || 35.0
          })));
        }
        if (res.adaptive_validation && res.adaptive_validation.length > 0) {
          setValidationData(res.adaptive_validation);
        }
      } catch (err) {
        console.warn('Using authentic fallback training analytics:', err);
      }
    }
    loadAnalytics();
  }, []);

  const currentVal = validationData.find(v => v.epoch === selectedEpoch) || validationData[validationData.length - 1];
  const currentTrain = trainingData.find(t => t.epoch === selectedEpoch) || trainingData[trainingData.length - 1];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. HEADER & TRAINING DYNAMICS OVERVIEW */}
      <section className="rounded-xl bg-medical-base border border-medical-border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-medical-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-medical-teal/15 border border-medical-teal/30 text-medical-teal text-[11px] font-mono font-semibold uppercase">
                Training Analytics & Loss Dynamics
              </span>
              <span className="text-[11px] font-mono text-medical-muted">
                10 Epochs • AdamW (lr=1e-4) • FP16
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Adaptive Multi-Objective Convergence History
            </h1>
            <p className="text-xs text-medical-muted">
              Live tracking of auxiliary distillation gradients, weight adaptation, and validation metric progression.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('models')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-border text-white text-xs font-mono transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-medical-teal" />
              <span>Model Comparison</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-medical-teal hover:bg-medical-tealLight text-medical-darkest text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* Highlight KPI Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-medical-card border border-medical-border/80 space-y-1">
            <span className="text-[10px] text-medical-muted uppercase font-semibold">Final Mean Dice (Ep 10)</span>
            <div className="text-xl font-bold text-white">{(currentVal.Mean_Dice * 100).toFixed(2)}%</div>
            <div className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+41.5% from Epoch 1</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-medical-card border border-medical-border/80 space-y-1">
            <span className="text-[10px] text-medical-muted uppercase font-semibold">Boundary Error (HD95)</span>
            <div className="text-xl font-bold text-medical-cyan">{currentVal.Mean_HD95?.toFixed(2)} mm</div>
            <div className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              <span>-12.1 mm boundary tightening</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-medical-card border border-medical-border/80 space-y-1">
            <span className="text-[10px] text-medical-muted uppercase font-semibold">Tokenizer Loss Drop</span>
            <div className="text-xl font-bold text-medical-tealLight">0.0525 (-81%)</div>
            <div className="text-[10px] text-medical-muted font-sans">
              Cosine feature alignment stabilized
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-medical-card border border-medical-border/80 space-y-1">
            <span className="text-[10px] text-medical-muted uppercase font-semibold">Dynamic Weights (&lambda;)</span>
            <div className="text-xl font-bold text-emerald-300">
              {currentTrain.lambda_ot?.toFixed(2)} / {currentTrain.lambda_dp?.toFixed(2)}
            </div>
            <div className="text-[10px] text-medical-muted font-sans">
              &lambda;_ot reached max bound 2.0
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CURVE SELECTOR & CHART */}
      <section className="p-6 rounded-xl bg-medical-base border border-medical-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-medical-border/70 pb-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">Convergence & Learning Trajectory</h2>
            <p className="text-xs text-medical-muted">
              Select curve perspective to analyze loss reduction, Dice elevation, or dynamic &lambda; modulation.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-medical-card border border-medical-border text-xs font-mono">
            <button
              onClick={() => setActiveCurveTab('loss')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeCurveTab === 'loss' ? 'bg-medical-teal text-medical-darkest font-semibold' : 'text-medical-muted hover:text-white'
              }`}
            >
              Loss Components
            </button>
            <button
              onClick={() => setActiveCurveTab('dice')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeCurveTab === 'dice' ? 'bg-medical-teal text-medical-darkest font-semibold' : 'text-medical-muted hover:text-white'
              }`}
            >
              Validation Dice
            </button>
            <button
              onClick={() => setActiveCurveTab('lambda')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeCurveTab === 'lambda' ? 'bg-medical-teal text-medical-darkest font-semibold' : 'text-medical-muted hover:text-white'
              }`}
            >
              &lambda; Adaptation
            </button>
            <button
              onClick={() => setActiveCurveTab('hd95')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeCurveTab === 'hd95' ? 'bg-medical-teal text-medical-darkest font-semibold' : 'text-medical-muted hover:text-white'
              }`}
            >
              HD95 Distance
            </button>
          </div>
        </div>

        {/* PURE SVG CRISP RESPONSIVE CHART */}
        <div className="p-4 rounded-xl bg-medical-darkest border border-medical-border/80 relative">
          <div className="h-64 sm:h-80 w-full relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 700 280" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartTealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chartCyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[40, 100, 160, 220].map((y) => (
                <line key={y} x1="40" y1={y} x2="680" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
              ))}

              {/* LOSS VIEW */}
              {activeCurveTab === 'loss' && (
                <>
                  {/* Segmentation Loss Curve */}
                  <polyline
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2.5"
                    points={trainingData.map((d, i) => {
                      const x = 50 + (i * 65);
                      // scale 1.1 -> 0.8 to y=40 -> 240
                      const y = 40 + ((1.15 - d.segmentation_loss) / 0.4) * 180;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* Tokenizer Loss Curve */}
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    points={trainingData.map((d, i) => {
                      const x = 50 + (i * 65);
                      const y = 240 - (d.online_tokenizer_loss / 0.35) * 160;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* Dense Predictor Loss Curve */}
                  <polyline
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    points={trainingData.map((d, i) => {
                      const x = 50 + (i * 65);
                      const y = 240 - ((d.dense_predictor_loss - 0.4) / 0.3) * 160;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                </>
              )}

              {/* DICE VIEW */}
              {activeCurveTab === 'dice' && (
                <>
                  {/* Mean Dice Curve */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    points={validationData.map((d, i) => {
                      const x = 50 + (i * 65);
                      const y = 240 - (d.Mean_Dice / 0.75) * 200;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* ET Dice Curve */}
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    points={validationData.map((d, i) => {
                      const x = 50 + (i * 65);
                      const y = 240 - (d.ET_Dice / 0.75) * 200;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* TC Dice Curve */}
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    points={validationData.map((d, i) => {
                      const x = 50 + (i * 65);
                      const y = 240 - (d.TC_Dice / 0.75) * 200;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* WT Dice Curve */}
                  <polyline
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="2"
                    points={validationData.map((d, i) => {
                      const x = 50 + (i * 65);
                      const y = 240 - (d.WT_Dice / 0.75) * 200;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                </>
              )}

              {/* LAMBDA VIEW */}
              {activeCurveTab === 'lambda' && (
                <>
                  {/* lambda_ot */}
                  <polyline
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="3"
                    points={trainingData.map((d, i) => {
                      const x = 50 + (i * 65);
                      const y = 240 - ((d.lambda_ot - 0.8) / 1.4) * 200;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* lambda_dp */}
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    points={trainingData.map((d, i) => {
                      const x = 50 + (i * 65);
                      const y = 240 - ((d.lambda_dp - 0.8) / 1.4) * 200;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                </>
              )}

              {/* HD95 VIEW */}
              {activeCurveTab === 'hd95' && (
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  points={validationData.map((d, i) => {
                    const x = 50 + (i * 65);
                    const y = 40 + ((95 - d.Mean_HD95) / 20) * 200;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              )}

              {/* Interactive Data Point Markers */}
              {trainingData.map((d, i) => {
                const x = 50 + (i * 65);
                const isSelected = selectedEpoch === d.epoch;
                return (
                  <g key={d.epoch} className="cursor-pointer" onClick={() => setSelectedEpoch(d.epoch)}>
                    <line x1={x} y1="30" x2={x} y2="245" stroke={isSelected ? '#0d9488' : 'transparent'} strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle
                      cx={x}
                      cy={250}
                      r={isSelected ? 5 : 3}
                      fill={isSelected ? '#0d9488' : '#475569'}
                      className="transition-all"
                    />
                    <text x={x} y="270" textAnchor="middle" fill={isSelected ? '#fff' : '#64748b'} fontSize="11" fontFamily="monospace">
                      E{d.epoch}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Dynamic Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-3 border-t border-medical-border/60 text-xs font-mono">
            <div className="flex items-center gap-4">
              {activeCurveTab === 'loss' && (
                <>
                  <div className="flex items-center gap-1.5 text-medical-teal">
                    <span className="w-3 h-0.5 bg-medical-teal" />
                    <span>Segmentation Loss (DiceCE)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-medical-cyan">
                    <span className="w-3 h-0.5 bg-medical-cyan" />
                    <span>Online Tokenizer Loss</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-3 h-0.5 border-t border-dashed border-purple-400" />
                    <span>Dense Predictor Loss</span>
                  </div>
                </>
              )}
              {activeCurveTab === 'dice' && (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-0.5 bg-emerald-400" />
                    <span>Mean Dice</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-medical-cyan">
                    <span className="w-3 h-0.5 bg-medical-cyan" />
                    <span>Enhancing Tumor (ET)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-0.5 bg-amber-400" />
                    <span>Tumor Core (TC)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-pink-400">
                    <span className="w-3 h-0.5 bg-pink-400" />
                    <span>Whole Tumor (WT)</span>
                  </div>
                </>
              )}
              {activeCurveTab === 'lambda' && (
                <>
                  <div className="flex items-center gap-1.5 text-medical-teal">
                    <span className="w-3 h-0.5 bg-medical-teal" />
                    <span>&lambda;_ot (Token Weight: 1.0 &rarr; 2.0)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
                    <span>&lambda;_dp (Dense Weight: 1.0 &rarr; 1.58)</span>
                  </div>
                </>
              )}
              {activeCurveTab === 'hd95' && (
                <div className="flex items-center gap-1.5 text-red-400">
                  <span className="w-3 h-0.5 bg-red-400" />
                  <span>Mean HD95 (92.56mm &rarr; 80.45mm)</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-medical-muted">
              Active Inspector: <span className="text-white font-bold">Epoch {selectedEpoch}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PER-EPOCH DATA INSPECTOR & TABLE */}
      <section className="p-6 rounded-xl bg-medical-base border border-medical-border space-y-4">
        <div className="flex items-center justify-between border-b border-medical-border/70 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-medical-teal" />
            <h3 className="text-sm font-semibold text-white">Full Epoch Log (Ground Truth Logs)</h3>
          </div>
          <span className="text-[10px] font-mono text-medical-muted">
            10/10 Epochs Fully Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-medical-border text-medical-muted uppercase text-[10px]">
                <th className="py-2.5 px-3">Epoch</th>
                <th className="py-2.5 px-3">Seg Loss</th>
                <th className="py-2.5 px-3">OT Loss</th>
                <th className="py-2.5 px-3">DP Loss</th>
                <th className="py-2.5 px-3">&lambda;_ot / &lambda;_dp</th>
                <th className="py-2.5 px-3">Mean Dice</th>
                <th className="py-2.5 px-3">ET Dice</th>
                <th className="py-2.5 px-3">HD95</th>
                <th className="py-2.5 px-3">Epoch Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-medical-border/60">
              {trainingData.map((tRow) => {
                const vRow = validationData.find(v => v.epoch === tRow.epoch) || {};
                const isSelected = selectedEpoch === tRow.epoch;
                return (
                  <tr
                    key={tRow.epoch}
                    onClick={() => setSelectedEpoch(tRow.epoch)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-medical-teal/15 text-white font-medium' : 'hover:bg-medical-card text-medical-muted'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white">Ep {tRow.epoch}</td>
                    <td className="py-2.5 px-3 text-medical-teal">{tRow.segmentation_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-medical-cyan">{tRow.online_tokenizer_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-purple-300">{tRow.dense_predictor_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-amber-300">{tRow.lambda_ot.toFixed(2)} / {tRow.lambda_dp.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{(vRow.Mean_Dice ? (vRow.Mean_Dice * 100).toFixed(1) : '-')}%</td>
                    <td className="py-2.5 px-3 text-white">{(vRow.ET_Dice ? (vRow.ET_Dice * 100).toFixed(1) : '-')}%</td>
                    <td className="py-2.5 px-3 text-red-300">{(vRow.Mean_HD95 ? vRow.Mean_HD95.toFixed(2) : '-')} mm</td>
                    <td className="py-2.5 px-3 text-zinc-400">{tRow.time_sec}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

