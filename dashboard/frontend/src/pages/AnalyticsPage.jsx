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
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { fetchTrainingAnalytics } from '../api/benchmarks';
import PeakChart from '../components/ui/peak-chart';

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
  { epoch: 1, WT_Dice: 0.1640, TC_Dice: 0.2177, ET_Dice: 0.2377, Mean_Dice: 0.2065, WT_HD95: 89.8592, TC_HD95: 93.9099, ET_HD95: 93.9242, Mean_HD95: 92.5644 },
  { epoch: 2, WT_Dice: 0.2081, TC_Dice: 0.3705, ET_Dice: 0.3983, Mean_Dice: 0.3256, WT_HD95: 84.1404, TC_HD95: 94.6419, ET_HD95: 94.6541, Mean_HD95: 91.1455 },
  { epoch: 3, WT_Dice: 0.2518, TC_Dice: 0.4402, ET_Dice: 0.4527, Mean_Dice: 0.3816, WT_HD95: 82.2564, TC_HD95: 93.9673, ET_HD95: 93.9950, Mean_HD95: 90.0729 },
  { epoch: 4, WT_Dice: 0.2997, TC_Dice: 0.4776, ET_Dice: 0.5172, Mean_Dice: 0.4315, WT_HD95: 77.8219, TC_HD95: 93.5184, ET_HD95: 93.5413, Mean_HD95: 88.2939 },
  { epoch: 5, WT_Dice: 0.3445, TC_Dice: 0.5293, ET_Dice: 0.5675, Mean_Dice: 0.4804, WT_HD95: 77.1162, TC_HD95: 92.6158, ET_HD95: 92.7497, Mean_HD95: 87.4939 },
  { epoch: 6, WT_Dice: 0.3950, TC_Dice: 0.5818, ET_Dice: 0.6240, Mean_Dice: 0.5336, WT_HD95: 77.2293, TC_HD95: 90.2201, ET_HD95: 90.6299, Mean_HD95: 86.0264 },
  { epoch: 7, WT_Dice: 0.4146, TC_Dice: 0.5848, ET_Dice: 0.6041, Mean_Dice: 0.5345, WT_HD95: 77.6895, TC_HD95: 89.5562, ET_HD95: 90.2686, Mean_HD95: 85.8381 },
  { epoch: 8, WT_Dice: 0.4626, TC_Dice: 0.6230, ET_Dice: 0.6321, Mean_Dice: 0.5726, WT_HD95: 76.8182, TC_HD95: 86.8596, ET_HD95: 87.6691, Mean_HD95: 83.7823 },
  { epoch: 9, WT_Dice: 0.5065, TC_Dice: 0.6692, ET_Dice: 0.6844, Mean_Dice: 0.6200, WT_HD95: 76.1740, TC_HD95: 83.6934, ET_HD95: 85.1652, Mean_HD95: 81.6775 },
  { epoch: 10, WT_Dice: 0.5139, TC_Dice: 0.6690, ET_Dice: 0.6808, Mean_Dice: 0.6212, WT_HD95: 74.9400, TC_HD95: 82.4485, ET_HD95: 83.9547, Mean_HD95: 80.4477 },
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
            Mean_Dice: Number(r.Mean_Dice) || (Number(r.WT_Dice) + Number(r.TC_Dice) + Number(r.ET_Dice)) / 3,
            WT_HD95: Number(r.WT_HD95) || 0,
            TC_HD95: Number(r.TC_HD95) || 0,
            ET_HD95: Number(r.ET_HD95) || 0,
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
  const CHART_PADDING = { top: 32, right: 45, bottom: 42, left: 55 };

  const getPoints = (data, accessor, yMin, yMax) => {
    const plotWidth = SVG_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const plotHeight = SVG_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    return data.map((d, i) => {
      const x = CHART_PADDING.left + (i / Math.max(1, data.length - 1)) * plotWidth;
      const val = accessor(d);
      const clampedVal = Math.max(yMin, Math.min(yMax, val));
      const normY = (clampedVal - yMin) / (yMax - yMin || 1);
      const y = (SVG_HEIGHT - CHART_PADDING.bottom) - normY * plotHeight;
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
        shortLabel: 'Segmentation',
        color: '#103B5C',
        points: getPoints(trainingData, d => d.segmentation_loss, yMin, yMax),
        strokeWidth: 2.5
      },
      {
        id: 'ot',
        label: 'Online Tokenizer Loss',
        shortLabel: 'Tokenizer',
        color: '#059669',
        points: getPoints(trainingData, d => d.online_tokenizer_loss, yMin, yMax),
        strokeWidth: 2.5
      },
      {
        id: 'dp',
        label: 'Dense Predictor Loss',
        shortLabel: 'Dense',
        color: '#7C3AED',
        points: getPoints(trainingData, d => d.dense_predictor_loss, yMin, yMax),
        strokeWidth: 2,
        dash: '4 4'
      }
    ];
  } else if (activeCurveTab === 'dice') {
    // Mathematically exact alignment with 5 equidistant grid lines covering 15% to 75%
    const yMin = 0.15;
    const yMax = 0.75;
    yAxisLabels = ['75%', '60%', '45%', '30%', '15%'];
    chartConfigs = [
      {
        id: 'mean',
        label: 'Mean Dice',
        shortLabel: 'Mean',
        color: '#103B5C',
        points: getPoints(validationData, d => d.Mean_Dice, yMin, yMax),
        strokeWidth: 3
      },
      {
        id: 'et',
        label: 'Enhancing Tumor (ET)',
        shortLabel: 'Enhancing (ET)',
        color: '#0891B2',
        points: getPoints(validationData, d => d.ET_Dice, yMin, yMax),
        strokeWidth: 2
      },
      {
        id: 'tc',
        label: 'Tumor Core (TC)',
        shortLabel: 'Tumor Core (TC)',
        color: '#DC2626',
        points: getPoints(validationData, d => d.TC_Dice, yMin, yMax),
        strokeWidth: 2
      },
      {
        id: 'wt',
        label: 'Whole Tumor (WT)',
        shortLabel: 'Whole Tumor (WT)',
        color: '#B45309',
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
        shortLabel: '\u03BB_ot',
        color: '#103B5C',
        points: getPoints(trainingData, d => d.lambda_ot, yMin, yMax),
        strokeWidth: 2.5
      },
      {
        id: 'ldp',
        label: '\u03BB_dp (Dense Predictor Weight)',
        shortLabel: '\u03BB_dp',
        color: '#399DBA',
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
        shortLabel: 'Mean HD95',
        color: '#DC2626',
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
    const plotWidth = SVG_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    
    // Find closest epoch
    let closestEp = 1;
    let minDiff = Infinity;
    trainingData.forEach((d, i) => {
      const x = CHART_PADDING.left + (i / Math.max(1, trainingData.length - 1)) * plotWidth;
      const diff = Math.abs(x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestEp = d.epoch;
      }
    });
    setHoveredEpoch(closestEp);
  };

  const activeIndex = (inspectedEpoch - 1);
  const activeX = CHART_PADDING.left + (activeIndex / Math.max(1, trainingData.length - 1)) * (SVG_WIDTH - CHART_PADDING.left - CHART_PADDING.right);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]">
      {/* 1. HEADER & TRAINING DYNAMICS OVERVIEW */}
      <section className="card-transparent rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#111111]/20 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-white/30 border border-[#111111]/30 text-[#103B5C] text-[10px] font-mono font-bold uppercase tracking-wider">
                Training Analytics &amp; Loss Dynamics
              </span>
              <span className="text-[11px] font-mono text-[#25313D] font-bold">
                10 Epochs &bull; AdamW (lr=1e-4) &bull; FP16 Mixed Precision
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#103B5C] tracking-tight">
              Adaptive Multi-Objective Convergence History
            </h1>
            <p className="text-xs text-[#25313D]">
              Continuous tracking of auxiliary distillation gradients, exponential dynamic weights, and validation metric trajectory.
            </p>
          </div>

          <div className="flex items-center shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#399DBA] hover:bg-[#103B5C] border border-[#111111] text-white text-xs font-bold transition-all duration-250 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* Highlight KPI Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-white/20 border border-[#111111]/30 space-y-1">
            <span className="text-[10px] text-[#25313D] uppercase font-bold">Mean Dice (Ep {inspectedEpoch})</span>
            <div className="text-xl font-bold text-[#103B5C]">
              {(currentVal.Mean_Dice * 100).toFixed(2)}%
            </div>
            <div className="text-[10px] text-[#059669] font-sans flex items-center gap-1 font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>
                {currentVal.epoch === 1
                  ? 'Baseline Epoch 1'
                  : `+${((currentVal.Mean_Dice - validationData[0].Mean_Dice) * 100).toFixed(1)}% vs Epoch 1`}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white/20 border border-[#111111]/30 space-y-1">
            <span className="text-[10px] text-[#25313D] uppercase font-bold">Boundary Error (HD95)</span>
            <div className="text-xl font-bold text-[#103B5C]">
              {currentVal.Mean_HD95?.toFixed(2)} mm
            </div>
            <div className="text-[10px] text-[#059669] font-sans flex items-center gap-1 font-bold">
              <TrendingDown className="w-3 h-3" />
              <span>
                {currentVal.epoch === 1
                  ? 'Initial Boundary Error'
                  : `${(currentVal.Mean_HD95 - validationData[0].Mean_HD95).toFixed(1)} mm vs Epoch 1`}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white/20 border border-[#111111]/30 space-y-1">
            <span className="text-[10px] text-[#25313D] uppercase font-bold">Tokenizer Loss Drop</span>
            <div className="text-xl font-bold text-[#103B5C]">
              {currentTrain.online_tokenizer_loss?.toFixed(4)}
            </div>
            <div className="text-[10px] text-[#25313D] font-sans">
              Cosine feature alignment stabilized
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white/20 border border-[#111111]/30 space-y-1">
            <span className="text-[10px] text-[#25313D] uppercase font-bold">Dynamic Weights (&lambda;)</span>
            <div className="text-xl font-bold text-[#103B5C]">
              {currentTrain.lambda_ot?.toFixed(2)} / {currentTrain.lambda_dp?.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#25313D] font-sans">
              &lambda;_ot saturated at max bound 2.0
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CURVE SELECTOR & NORMALIZED SVG CHART */}
      <section className="card-transparent p-5 sm:p-6 rounded-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#111111]/20 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#103B5C]">Convergence Trajectory &amp; Loss Dynamics</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/30 text-[#103B5C] border border-[#111111]/30 font-bold">
                Interactive Scrubber Active
              </span>
            </div>
            <p className="text-xs text-[#25313D]">
              Hover across the chart or click epoch nodes to scrub exact gradient and validation metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-white/20 border border-[#111111] text-xs font-mono max-w-full">
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
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                  activeCurveTab === tab.id
                    ? 'bg-[#103B5C] text-white shadow-xs'
                    : 'text-[#25313D] hover:text-[#103B5C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* PEAKCHART ANIMATED TIME-SERIES VISUALIZATION */}
        <div className="p-4 rounded-xl bg-white/20 border border-[#111111]/30 relative shadow-inner">
          <div className="h-64 sm:h-80 w-full relative">
            <PeakChart
              series={chartConfigs.map((cfg, idx) => ({ ...cfg, isArea: idx === 0 }))}
              yAxisLabels={yAxisLabels}
              xAxisLabels={trainingData.map(d => `E${d.epoch}`)}
              padding={CHART_PADDING}
              selectedIndex={selectedEpoch - 1}
              hoveredIndex={inspectedEpoch - 1}
              onHoverIndex={(idx) => setHoveredEpoch(idx !== null ? trainingData[idx]?.epoch : null)}
              onSelectIndex={(idx) => setSelectedEpoch(trainingData[idx]?.epoch)}
              unit={activeCurveTab === 'dice' ? '%' : activeCurveTab === 'hd95' ? 'mm' : ''}
              formatValue={(val) => activeCurveTab === 'dice' ? (val * 100).toFixed(1) : activeCurveTab === 'hd95' ? val.toFixed(2) : val.toFixed(4)}
              className="h-full"
            />
          </div>

          {/* Floating Live Scrubber Value Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-3 border-t border-[#111111]/20 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              {chartConfigs.map(cfg => {
                const pt = cfg.points.find(p => p.epoch === inspectedEpoch);
                return (
                  <div key={cfg.id} className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: cfg.color }} 
                    />
                    <span className="text-[#25313D] font-bold">{cfg.label}:</span>
                    <span className="font-bold text-[#103B5C]">
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

            <div className="text-[11px] text-[#25313D] flex items-center gap-2 font-bold">
              <span>Inspecting:</span>
              <span className="px-2 py-0.5 rounded bg-white/40 text-[#103B5C] font-bold border border-[#111111]/30">
                Epoch {inspectedEpoch} / 10
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PER-EPOCH DATA INSPECTOR & GROUND TRUTH LOGS TABLE */}
      <section className="card-transparent p-5 sm:p-6 rounded-xl space-y-4 max-w-full overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#103B5C]" />
            <h3 className="text-sm font-bold text-[#103B5C]">
              Full Training &amp; Validation Epoch History
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#25313D] font-bold">
            Click row to lock inspector &bull; 10 Verified Epochs
          </span>
        </div>

        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#111111]/30 text-[#25313D] uppercase text-[10px] tracking-wider font-bold">
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
            <tbody className="divide-y divide-[#111111]/15">
              {trainingData.map((tRow) => {
                const vRow = validationData.find(v => v.epoch === tRow.epoch) || {};
                const isSelected = selectedEpoch === tRow.epoch;
                const isInspected = inspectedEpoch === tRow.epoch;
                return (
                  <tr
                    key={tRow.epoch}
                    onClick={() => setSelectedEpoch(tRow.epoch)}
                    onMouseEnter={() => setHoveredEpoch(tRow.epoch)}
                    onMouseLeave={() => setHoveredEpoch(null)}
                    className={`cursor-pointer transition-colors ${
                      isInspected 
                        ? 'bg-[rgba(226,247,242,0.85)] text-[#103B5C] font-bold border-l-4 border-[#399DBA]' 
                        : 'hover:bg-white/20 text-[#25313D]'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-[#103B5C]">Ep {tRow.epoch}</td>
                    <td className="py-2.5 px-3 text-[#103B5C] font-bold">{tRow.segmentation_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-[#059669] font-bold">{tRow.online_tokenizer_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-purple-700 font-bold">{tRow.dense_predictor_loss.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-amber-700 font-bold">{tRow.lambda_ot.toFixed(2)} / {tRow.lambda_dp.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-bold text-[#103B5C]">
                      {vRow.Mean_Dice ? `${(vRow.Mean_Dice * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[#0891B2] font-bold">
                      {vRow.ET_Dice ? `${(vRow.ET_Dice * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[#DC2626] font-bold">
                      {vRow.TC_Dice ? `${(vRow.TC_Dice * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[#B45309] font-bold">
                      {vRow.WT_Dice ? `${(vRow.WT_Dice * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-rose-700 font-bold">
                      {vRow.Mean_HD95 ? `${vRow.Mean_HD95.toFixed(2)} mm` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[#25313D] font-bold">{tRow.time_sec}s</td>
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
