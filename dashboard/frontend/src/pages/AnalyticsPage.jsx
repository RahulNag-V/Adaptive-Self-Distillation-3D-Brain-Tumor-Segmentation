import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  RefreshCw,
  Info
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
  const [hoveredEpoch, setHoveredEpoch] = useState(null);
  const [loading, setLoading] = useState(false);

  const svgRef = useRef(null);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await fetchTrainingAnalytics();
        if (res.adaptive_training && res.adaptive_training.length > 0) {
          setTrainingData(res.adaptive_training.map(r => ({
            epoch: r.epoch,
            segmentation_loss: Number(r.segmentation_loss) || 0,
            online_tokenizer_loss: Number(r.online_tokenizer_loss) || 0,
            dense_predictor_loss: Number(r.dense_predictor_loss) || 0,
            total_loss: Number(r.total_loss) || 0,
            lambda_ot: Number(r.lambda_ot_after || r.lambda_ot) || 1.0,
            lambda_dp: Number(r.lambda_dp_after || r.lambda_dp) || 1.0,
            time_sec: Number(r.training_time_seconds) || 35.0
          })));
        }
        if (res.adaptive_validation && res.adaptive_validation.length > 0) {
          setValidationData(res.adaptive_validation.map(r => ({
            epoch: r.epoch,
            WT_Dice: Number(r.WT_Dice) || 0,
            TC_Dice: Number(r.TC_Dice) || 0,
            ET_Dice: Number(r.ET_Dice) || 0,
            Mean_Dice: Number(r.Mean_Dice) || 0,
            Mean_HD95: Number(r.Mean_HD95) || 0,
          })));
        }
      } catch (err) {
        console.warn('Using authentic fallback training analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const inspectedEpoch = hoveredEpoch !== null ? hoveredEpoch : selectedEpoch;
  const currentVal = validationData.find(v => v.epoch === inspectedEpoch) || validationData[validationData.length - 1];
  const currentTrain = trainingData.find(t => t.epoch === inspectedEpoch) || trainingData[trainingData.length - 1];

  // Dynamic Chart Range & Scaling
  const SVG_WIDTH = 760;
  const SVG_HEIGHT = 280;
  const PAD_X = 55;
  const PAD_Y = 32;

  const getPoints = (data, accessor, yMin, yMax) => {
    return data.map((d, i) => {
      const x = PAD_X + (i / Math.max(1, data.length - 1)) * (SVG_WIDTH - 2 * PAD_X);
      const val = accessor(d);
      const clampedVal = Math.max(yMin, Math.min(yMax, val));
      const normY = (clampedVal - yMin) / (yMax - yMin || 1);
      const y = (SVG_HEIGHT - PAD_Y) - normY * (SVG_HEIGHT - 2 * PAD_Y);
      return { x, y, val, epoch: d.epoch };
    });
  };

  // Setup tab-specific curves and bounds
  let chartConfigs = [];
  let yAxisLabels = [];

  if (activeCurveTab === 'loss') {
    const yMin = 0.0;
    const yMax = 1.2;
    yAxisLabels = ['1.20', '0.90', '0.60', '0.30', '0.00'];
    chartConfigs = [
      {
        id: 'seg',
        label: 'Segmentation Loss (DiceCE)',
        color: '#38BDF8',
        points: getPoints(trainingData, d => d.segmentation_loss, yMin, yMax),
        strokeWidth: 2.5
      },
      {
        id: 'ot',
        label: 'Online Tokenizer Loss',
        color: '#10B981',
        points: getPoints(trainingData, d => d.online_tokenizer_loss, yMin, yMax),
        strokeWidth: 2.5
      },
      {
        id: 'dp',
        label: 'Dense Predictor Loss',
        color: '#A855F7',
        points: getPoints(trainingData, d => d.dense_predictor_loss, yMin, yMax),
        strokeWidth: 2,
        dash: '4 4'
      }
    ];
  } else if (activeCurveTab === 'dice') {
    const yMin = 0.1;
    const yMax = 0.75;
    yAxisLabels = ['75%', '60%', '45%', '30%', '15%'];
    chartConfigs = [
      {
        id: 'mean',
        label: 'Mean Dice',
        color: '#10B981',
        points: getPoints(validationData, d => d.Mean_Dice, yMin, yMax),
        strokeWidth: 3
      },
      {
        id: 'et',
        label: 'Enhancing Tumor (ET)',
        color: '#06B6D4',
        points: getPoints(validationData, d => d.ET_Dice, yMin, yMax),
        strokeWidth: 2
      },
      {
        id: 'tc',
        label: 'Tumor Core (TC)',
        color: '#F59E0B',
        points: getPoints(validationData, d => d.TC_Dice, yMin, yMax),
        strokeWidth: 2
      },
      {
        id: 'wt',
        label: 'Whole Tumor (WT)',
        color: '#EC4899',
        points: getPoints(validationData, d => d.WT_Dice, yMin, yMax),
        strokeWidth: 2
      }
    ];
  } else if (activeCurveTab === 'lambda') {
    const yMin = 0.8;
    const yMax = 2.2;
    yAxisLabels = ['2.20', '1.85', '1.50', '1.15', '0.80'];
    chartConfigs = [
      {
        id: 'lot',
        label: '\u03BB_ot (Token Alignment Weight)',
        color: '#38BDF8',
        points: getPoints(trainingData, d => d.lambda_ot, yMin, yMax),
        strokeWidth: 2.5
      },
      {
        id: 'ldp',
        label: '\u03BB_dp (Dense Predictor Weight)',
        color: '#F59E0B',
        points: getPoints(trainingData, d => d.lambda_dp, yMin, yMax),
        strokeWidth: 2.5,
        dash: '4 2'
      }
    ];
  } else if (activeCurveTab === 'hd95') {
    const yMin = 75;
    const yMax = 95;
    yAxisLabels = ['95 mm', '90 mm', '85 mm', '80 mm', '75 mm'];
    chartConfigs = [
      {
        id: 'hd95',
        label: 'Boundary Error (Mean HD95)',
        color: '#EF4444',
        points: getPoints(validationData, d => d.Mean_HD95, yMin, yMax),
        strokeWidth: 3
      }
    ];
  }

  // Handle mouse move over SVG to scrub through epochs
  const handleSvgMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * SVG_WIDTH;
    
    // Find closest epoch
    let closestEp = 1;
    let minDiff = Infinity;
    trainingData.forEach((d, i) => {
      const x = PAD_X + (i / Math.max(1, trainingData.length - 1)) * (SVG_WIDTH - 2 * PAD_X);
      const diff = Math.abs(x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestEp = d.epoch;
      }
    });
    setHoveredEpoch(closestEp);
  };

  const activeIndex = (inspectedEpoch - 1);
  const activeX = PAD_X + (activeIndex / Math.max(1, trainingData.length - 1)) * (SVG_WIDTH - 2 * PAD_X);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. HEADER & TRAINING DYNAMICS OVERVIEW */}
      <section className="rounded-xl bg-[#101722] border border-[#1C2636] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1C2636] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-[#4C8DFF] text-[11px] font-mono font-semibold uppercase tracking-wider">
                Training Analytics &amp; Loss Dynamics
              </span>
              <span className="text-[11px] font-mono text-[#64748B]">
                10 Epochs &bull; AdamW (lr=1e-4) &bull; FP16 Mixed Precision
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#F4F7FC] tracking-tight">
              Adaptive Multi-Objective Convergence History
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Continuous tracking of auxiliary distillation gradients, exponential dynamic weights, and validation metric trajectory.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('models')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#151E2B] hover:bg-[#1C2636] border border-[#1C2636] text-[#F4F7FC] text-xs font-mono font-medium transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#4C8DFF]" />
              <span>Model Comparison</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* Highlight KPI Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] space-y-1">
            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Mean Dice (Ep {inspectedEpoch})</span>
            <div className="text-xl font-bold text-[#F4F7FC]">
              {(currentVal.Mean_Dice * 100).toFixed(2)}%
            </div>
            <div className="text-[10px] text-emerald-400 font-sans flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>+41.5% from Epoch 1</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] space-y-1">
            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Boundary Error (HD95)</span>
            <div className="text-xl font-bold text-[#38BDF8]">
              {currentVal.Mean_HD95?.toFixed(2)} mm
            </div>
            <div className="text-[10px] text-emerald-400 font-sans flex items-center gap-1 font-medium">
              <TrendingDown className="w-3 h-3" />
              <span>-12.1 mm boundary tightening</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] space-y-1">
            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Tokenizer Loss Drop</span>
            <div className="text-xl font-bold text-emerald-400">
              {currentTrain.online_tokenizer_loss?.toFixed(4)} (-81%)
            </div>
            <div className="text-[10px] text-[#94A3B8] font-sans">
              Cosine feature alignment stabilized
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] space-y-1">
            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Dynamic Weights (&lambda;)</span>
            <div className="text-xl font-bold text-amber-400">
              {currentTrain.lambda_ot?.toFixed(2)} / {currentTrain.lambda_dp?.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#94A3B8] font-sans">
              &lambda;_ot saturated at max bound 2.0
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CURVE SELECTOR & NORMALIZED SVG CHART */}
      <section className="p-6 rounded-xl bg-[#101722] border border-[#1C2636] shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2636] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#F4F7FC]">Convergence Trajectory &amp; Loss Dynamics</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-[#4C8DFF] border border-blue-500/20">
                Interactive Scrubber Active
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Hover across the chart or click epoch nodes to scrub exact gradient and validation metrics.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#151E2B] border border-[#1C2636] text-xs font-mono">
            {[
              { id: 'loss', label: 'Loss Components' },
              { id: 'dice', label: 'Validation Dice' },
              { id: 'lambda', label: '\u03BB Adaptation' },
              { id: 'hd95', label: 'HD95 Boundary' }
            ].map(tab => (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => setActiveCurveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeCurveTab === tab.id
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F4F7FC] hover:bg-[#1C2636]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* PURE SVG RESPONSIVE CLINICAL DARK CHART */}
        <div className="p-4 rounded-xl bg-[#080B12] border border-[#1C2636] relative shadow-2xl">
          <div className="h-64 sm:h-80 w-full relative">
            <svg 
              ref={svgRef}
              className="w-full h-full overflow-visible select-none cursor-crosshair" 
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
              preserveAspectRatio="none"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={() => setHoveredEpoch(null)}
              onClick={() => hoveredEpoch && setSelectedEpoch(hoveredEpoch)}
            >
              {/* Horizontal Grid & Axis Values */}
              {[0, 1, 2, 3, 4].map((step, idx) => {
                const y = PAD_Y + (step / 4) * (SVG_HEIGHT - 2 * PAD_Y);
                return (
                  <g key={step}>
                    <line x1={PAD_X} y1={y} x2={SVG_WIDTH - PAD_X} y2={y} stroke="#1C2636" strokeDasharray="3 3" />
                    <text x={PAD_X - 10} y={y + 4} textAnchor="end" fill="#64748B" fontSize="10" fontFamily="monospace">
                      {yAxisLabels[idx]}
                    </text>
                  </g>
                );
              })}

              {/* Render Tab Curves */}
              {chartConfigs.map(cfg => (
                <polyline
                  key={cfg.id}
                  fill="none"
                  stroke={cfg.color}
                  strokeWidth={cfg.strokeWidth}
                  strokeDasharray={cfg.dash || 'none'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={cfg.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                />
              ))}

              {/* Epoch Column Markers & Interactive Scrubber */}
              {trainingData.map((d, i) => {
                const x = PAD_X + (i / Math.max(1, trainingData.length - 1)) * (SVG_WIDTH - 2 * PAD_X);
                const isSelected = selectedEpoch === d.epoch;
                const isHovered = inspectedEpoch === d.epoch;

                return (
                  <g key={d.epoch} className="cursor-pointer">
                    <line 
                      x1={x} 
                      y1={PAD_Y} 
                      x2={x} 
                      y2={SVG_HEIGHT - PAD_Y + 5} 
                      stroke={isHovered ? '#4C8DFF' : isSelected ? '#1E293B' : 'transparent'} 
                      strokeWidth={isHovered ? 1.5 : 1} 
                      strokeDasharray={isHovered ? '2 2' : 'none'} 
                    />
                    <circle
                      cx={x}
                      cy={SVG_HEIGHT - PAD_Y + 12}
                      r={isHovered ? 4.5 : isSelected ? 3.5 : 2.5}
                      fill={isHovered ? '#4C8DFF' : isSelected ? '#38BDF8' : '#334155'}
                      className="transition-all"
                    />
                    <text 
                      x={x} 
                      y={SVG_HEIGHT - PAD_Y + 28} 
                      textAnchor="middle" 
                      fill={isHovered ? '#F4F7FC' : isSelected ? '#38BDF8' : '#64748B'} 
                      fontSize="10" 
                      fontWeight={isHovered || isSelected ? '600' : '400'}
                      fontFamily="monospace"
                    >
                      E{d.epoch}
                    </text>
                  </g>
                );
              })}

              {/* Active Intersection Dots for Inspected Epoch */}
              {chartConfigs.map(cfg => {
                const pt = cfg.points.find(p => p.epoch === inspectedEpoch);
                if (!pt) return null;
                return (
                  <circle
                    key={`dot-${cfg.id}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={5}
                    fill={cfg.color}
                    stroke="#080B12"
                    strokeWidth={2}
                    className="transition-all duration-75"
                  />
                );
              })}
            </svg>
          </div>

          {/* Floating Live Scrubber Value Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-3 border-t border-[#1C2636] text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              {chartConfigs.map(cfg => {
                const pt = cfg.points.find(p => p.epoch === inspectedEpoch);
                return (
                  <div key={cfg.id} className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: cfg.color }} 
                    />
                    <span className="text-[#94A3B8]">{cfg.label}:</span>
                    <span className="font-bold text-[#F4F7FC]">
                      {activeCurveTab === 'dice' 
                        ? `${(pt?.val * 100).toFixed(1)}%` 
                        : activeCurveTab === 'hd95' 
                        ? `${pt?.val.toFixed(2)} mm` 
                        : pt?.val.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] text-[#94A3B8] flex items-center gap-2">
              <span>Inspecting:</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[#4C8DFF] font-bold border border-blue-500/20">
                Epoch {inspectedEpoch} / 10
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PER-EPOCH DATA INSPECTOR & GROUND TRUTH LOGS TABLE */}
      <section className="p-6 rounded-xl bg-[#101722] border border-[#1C2636] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4C8DFF]" />
            <h3 className="text-sm font-semibold text-[#F4F7FC]">
              Full Training &amp; Validation Epoch History
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#94A3B8]">
            Click row to lock inspector &bull; 10 Verified Epochs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#1C2636] text-[#94A3B8] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Epoch</th>
                <th className="py-2.5 px-3">Seg Loss</th>
                <th className="py-2.5 px-3">OT Loss</th>
                <th className="py-2.5 px-3">DP Loss</th>
                <th className="py-2.5 px-3">&lambda;_ot / &lambda;_dp</th>
                <th className="py-2.5 px-3">Mean Dice</th>
                <th className="py-2.5 px-3">ET Dice</th>
                <th className="py-2.5 px-3">TC Dice</th>
                <th className="py-2.5 px-3">WT Dice</th>
                <th className="py-2.5 px-3">HD95</th>
                <th className="py-2.5 px-3">Step Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C2636]">
              {trainingData.map((tRow) => {
                const vRow = validationData.find(v => v.epoch === tRow.epoch) || {};
                const isSelected = selectedEpoch === tRow.epoch;
                return (
                  <tr
                    key={tRow.epoch}
                    onClick={() => setSelectedEpoch(tRow.epoch)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-600/15 text-[#F4F7FC] font-semibold border-l-2 border-blue-500' 
                        : 'hover:bg-[#151E2B] text-[#94A3B8]'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-[#F4F7FC]">Ep {tRow.epoch}</td>
                    <td className="py-2.5 px-3 text-[#38BDF8]">{tRow.segmentation_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">{tRow.online_tokenizer_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-purple-400">{tRow.dense_predictor_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-amber-400">{tRow.lambda_ot.toFixed(2)} / {tRow.lambda_dp.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      {vRow.Mean_Dice ? `${(vRow.Mean_Dice * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[#06B6D4]">
                      {vRow.ET_Dice ? `${(vRow.ET_Dice * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-400">
                      {vRow.TC_Dice ? `${(vRow.TC_Dice * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-pink-400">
                      {vRow.WT_Dice ? `${(vRow.WT_Dice * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-red-400">
                      {vRow.Mean_HD95 ? `${vRow.Mean_HD95.toFixed(2)} mm` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B]">{tRow.time_sec}s</td>
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
