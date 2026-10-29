import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart2,
  Brain,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  FileCheck,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Maximize2,
  RefreshCw,
  Ruler,
  ShieldAlert,
  Sparkles,
  Target
} from 'lucide-react';
import { getPatientTumorBurden } from '../api/segmentation';

/**
 * TumorBurdenPanel
 *
 * Implements the quantitative "Tumor Burden Assessment" dashboard:
 * - Whole Tumor, Tumor Core, and Enhancing Tumor volumetric measurements (cm3, mm3, voxel counts)
 * - Maximum slice-wise cross-sectional tumor area (cm2, mm2) and peak axial slice
 * - Affected slice counts across Axial (Z), Coronal (Y), and Sagittal (X) planes
 * - 3D anatomical spatial bounding box extents (mm)
 * - Relative tumor burden (% of intracranial skull-stripped brain volume)
 * - Experimental Research Category with configurable thresholds and non-clinical disclaimers
 * - Model validation agreement metrics (Dice, Delta V) when evaluating prediction vs ground truth
 * - Factual clinical interpretation summary and diagnostic limitations checklist
 */
export default function TumorBurdenPanel({
  patientId,
  segSource = 'ground_truth',
  onNavigateToSlice,
  activeMriModality = 'flair',
}) {
  const [burdenData, setBurdenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDisclaimerDetails, setShowDisclaimerDetails] = useState(false);

  const fetchBurden = async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientTumorBurden(patientId, segSource);
      if (data && data.success) {
        setBurdenData(data);
      } else {
        setError(data?.error || 'Failed to calculate tumor burden.');
      }
    } catch (err) {
      console.error('Error fetching tumor burden assessment:', err);
      setError(err.message || 'Network or server error retrieving tumor burden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBurden();
  }, [patientId, segSource]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-medical-card/40 rounded-xl border border-medical-border text-center">
        <Loader2 className="w-8 h-8 text-medical-teal animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Analyzing 3D Volumetric Tumor Burden...</p>
          <p className="text-xs text-medical-muted font-mono">
            Evaluating NIfTI voxel spacing, slice extents & brain volume
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-200 space-y-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-red-300">
              Assessment Calculation Error
            </h4>
            <p className="text-xs leading-relaxed text-red-200/90">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchBurden}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/50 border border-red-500/40 text-xs font-medium text-white transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Assessment</span>
        </button>
      </div>
    );
  }

  if (!burdenData) {
    return (
      <div className="p-6 text-center text-xs text-medical-muted bg-medical-card/20 rounded-xl border border-medical-border">
        Select a patient to generate quantitative tumor burden assessment.
      </div>
    );
  }

  const {
    whole_tumor: wt,
    tumor_core: tc,
    enhancing_tumor: et,
    relative_tumor_burden: rel,
    burden_category: cat,
    clinical_interpretation: interp,
    model_validation: val,
    spatial_metadata: spatial,
    assessment_source_label,
    checkpoint_identifier
  } = burdenData;

  const peakSlice = wt?.maximum_cross_sectional_area?.peak_axial_slice_index;
  const maxAreaCm2 = wt?.maximum_cross_sectional_area?.area_cm2;

  return (
    <div className="space-y-3.5 text-xs">
      
      {/* 1. Header / Assessment Source Badge */}
      <div className="p-3 rounded-xl bg-medical-surface/80 border border-medical-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-medical-teal" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Tumor Burden Assessment
            </h3>
          </div>
          <button
            onClick={fetchBurden}
            className="p-1 rounded hover:bg-medical-card text-medical-muted hover:text-white transition-all"
            title="Refresh quantitative calculation"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-medical-border/60">
          <div>
            <span className="text-medical-muted block text-[10px]">Source:</span>
            <span className="text-white font-semibold flex items-center gap-1">
              <Database className="w-3 h-3 text-medical-teal" />
              {segSource === 'ground_truth' ? 'Ground Truth Mask' : 'Model Prediction'}
            </span>
          </div>
          <div>
            <span className="text-medical-muted block text-[10px]">Active Modality:</span>
            <span className="text-white uppercase font-bold text-medical-tealLight">
              {activeMriModality}
            </span>
          </div>
          <div className="col-span-2 text-[10px] text-medical-muted">
            <span className="text-medical-muted/70">Origin: </span>
            <span className="text-white/80">{assessment_source_label || checkpoint_identifier}</span>
          </div>
        </div>
      </div>

      {/* 2. Structured Quantitative Burden & Non-Clinical Severity Status */}
      <div className="p-3 rounded-xl bg-medical-card border border-medical-border space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: cat?.color || '#0d9488' }}
            />
            <span className="text-[10px] font-mono uppercase tracking-wider text-medical-muted font-semibold">
              Burden & Severity Assessment
            </span>
          </div>
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm"
            style={{
              backgroundColor: `${cat?.color || '#0d9488'}25`,
              borderColor: `${cat?.color || '#0d9488'}70`,
              color: '#FFFFFF'
            }}
          >
            {cat?.category || 'Measured'}
          </span>
        </div>

        {/* Explicit Section 4 Specification Rows */}
        <div className="space-y-1.5 pt-2 border-t border-medical-border/60 text-[11px] font-mono">
          <div className="flex items-center justify-between">
            <span className="text-medical-muted">Tumor burden:</span>
            <span className="text-white font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Quantitative measurement available ({wt?.volume_cm3?.toFixed(2)} cm³)</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-medical-muted">Category:</span>
            <span className="text-medical-tealLight font-semibold">
              Experimental research category ({cat?.category})
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-medical-muted shrink-0">Clinical severity:</span>
            <span className="text-amber-300 text-right font-medium">
              Not determined by segmentation-volume calculation
            </span>
          </div>
        </div>

        {/* Factual Context & Research Citations Toggle */}
        <div className="p-2 rounded-lg bg-medical-surface/80 border border-medical-border/50 text-[10px] text-medical-muted font-mono leading-tight space-y-1">
          <p className="text-medical-muted/90 leading-tight">
            {cat?.description || 'Volumetric spatial extent derived from real NIfTI segmentation mask.'}
          </p>
          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={() => setShowDisclaimerDetails(!showDisclaimerDetails)}
              className="text-[10px] text-medical-teal hover:underline flex items-center gap-0.5"
            >
              <Info className="w-2.5 h-2.5" />
              <span>{showDisclaimerDetails ? 'Hide Research Methodology' : 'View Threshold Research Methodology'}</span>
            </button>
            <span className="text-[9px] text-medical-muted/60">Non-Diagnostic</span>
          </div>

          {showDisclaimerDetails && (
            <div className="mt-1.5 pt-1.5 border-t border-medical-border/50 text-[9px] text-medical-muted space-y-1">
              <p><strong>Research Citation:</strong> {cat?.citation}</p>
              <p><strong>Guidance:</strong> {cat?.clinical_severity_disclaimer}</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Volumetric Measurement Cards: WT, TC, ET */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-medical-muted font-semibold block">
          Region-Specific Volumetrics
        </span>

        {/* Whole Tumor (WT) */}
        {wt && (
          <div className="p-2.5 rounded-xl bg-medical-card border border-emerald-500/30 hover:border-emerald-500/50 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-sm" />
                <span className="text-xs font-bold text-white font-mono">Whole Tumor (WT)</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {wt.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-medical-muted pt-1 border-t border-medical-border/50">
              <div>
                <span>Voxels: </span>
                <span className="text-white font-semibold">{wt.voxel_count?.toLocaleString()}</span>
              </div>
              <div>
                <span>Volume: </span>
                <span className="text-white font-semibold">{Math.round(wt.volume_mm3)?.toLocaleString()} mm³</span>
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span>Affected Slices (Z/Y/X):</span>
                <span className="text-white font-semibold">
                  {wt.affected_slices?.axial_z} / {wt.affected_slices?.coronal_y} / {wt.affected_slices?.sagittal_x}
                </span>
              </div>
            </div>

            {/* Peak Cross-Sectional Area & Jump to Slice */}
            {peakSlice !== undefined && (
              <div className="p-1.5 rounded-lg bg-medical-surface/80 border border-emerald-500/20 flex items-center justify-between text-[11px] font-mono">
                <div>
                  <span className="text-medical-muted">Max Area: </span>
                  <span className="text-emerald-300 font-bold">{maxAreaCm2?.toFixed(2)} cm²</span>
                  <span className="text-medical-muted text-[10px]"> (Slice {peakSlice})</span>
                </div>
                {onNavigateToSlice && (
                  <button
                    onClick={() => onNavigateToSlice('axial', peakSlice)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] text-emerald-300 transition-all"
                    title="Center Axial Viewport on Maximum Tumor Slice"
                  >
                    <Target className="w-3 h-3" />
                    <span>Peak Slice</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tumor Core (TC) */}
        {tc && (
          <div className="p-2.5 rounded-xl bg-medical-card border border-amber-500/30 hover:border-amber-500/50 transition-all space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 shadow-sm" />
                <span className="text-xs font-bold text-white font-mono">Tumor Core (TC)</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                {tc.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-medical-muted pt-1 border-t border-medical-border/50">
              <div>
                <span>Voxels: </span>
                <span className="text-white font-semibold">{tc.voxel_count?.toLocaleString()}</span>
              </div>
              <div>
                <span>Affected Axial Slices: </span>
                <span className="text-white font-semibold">{tc.affected_axial_slices}</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhancing Tumor (ET) */}
        {et && (
          <div className="p-2.5 rounded-xl bg-medical-card border border-rose-500/30 hover:border-rose-500/50 transition-all space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-sm" />
                <span className="text-xs font-bold text-white font-mono">Enhancing Tumor (ET)</span>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400">
                {et.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-medical-muted pt-1 border-t border-medical-border/50">
              <div>
                <span>Voxels: </span>
                <span className="text-white font-semibold">{et.voxel_count?.toLocaleString()}</span>
              </div>
              <div>
                <span>Affected Axial Slices: </span>
                <span className="text-white font-semibold">{et.affected_axial_slices}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Relative Tumor Burden (% of Intracranial Volume) */}
      <div className="p-3 rounded-xl bg-medical-card border border-medical-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-medical-teal" />
            <span className="text-xs font-bold text-white font-mono">
              Relative Tumor Burden
            </span>
          </div>
          {rel?.relative_burden_percentage !== null && rel?.relative_burden_percentage !== undefined ? (
            <span className="text-xs font-mono font-bold text-medical-tealLight">
              {rel.relative_burden_percentage.toFixed(2)}%
            </span>
          ) : (
            <span className="text-[10px] font-mono text-medical-muted">Unavailable</span>
          )}
        </div>

        {rel?.relative_burden_percentage !== null && rel?.relative_burden_percentage !== undefined ? (
          <div className="space-y-1.5">
            {/* Progress bar */}
            <div className="w-full bg-medical-surface h-2 rounded-full overflow-hidden border border-medical-border/70">
              <div
                className="h-full bg-gradient-to-r from-medical-teal to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(rel.relative_burden_percentage * 3, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-medical-muted">
              <span>Intracranial Parenchyma:</span>
              <span className="text-white font-semibold">
                {rel.intracranial_brain_volume_cm3?.toFixed(1)} cm³ ({rel.brain_voxels?.toLocaleString()} voxels)
              </span>
            </div>
            <p className="text-[9px] text-medical-muted/80 font-mono leading-tight">
              Denominator: {rel.denominator_description}
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-medical-muted font-mono leading-tight">
            Unavailable: Valid skull-stripped intracranial brain mask required to calculate relative volume fraction.
          </p>
        )}
      </div>

      {/* 5. Model Validation Agreement Metrics (Prediction vs Ground Truth) */}
      {val && (
        <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Model Prediction Agreement</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-200">
              vs Ground Truth
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
            <div className="p-1.5 rounded bg-indigo-950/40 border border-indigo-500/20">
              <span className="text-indigo-300 block">WT Dice</span>
              <span className="text-xs font-bold text-white font-tabular">{(val.dice_scores?.WT * 100).toFixed(1)}%</span>
            </div>
            <div className="p-1.5 rounded bg-indigo-950/40 border border-indigo-500/20">
              <span className="text-indigo-300 block">TC Dice</span>
              <span className="text-xs font-bold text-white font-tabular">{(val.dice_scores?.TC * 100).toFixed(1)}%</span>
            </div>
            <div className="p-1.5 rounded bg-indigo-950/40 border border-indigo-500/20">
              <span className="text-indigo-300 block">ET Dice</span>
              <span className="text-xs font-bold text-white font-tabular">{(val.dice_scores?.ET * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-indigo-200/80 pt-1 border-t border-indigo-500/20">
            <span>WT Volume Difference (ΔV):</span>
            <span className="font-bold text-white font-tabular">{val.volume_difference_cm3?.WT > 0 ? `+${val.volume_difference_cm3?.WT}` : val.volume_difference_cm3?.WT} cm³</span>
          </div>
        </div>
      )}

      {/* 6. Factual Clinical Summary */}
      {interp?.summary && (
        <div className="p-3 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white font-mono">
            <FileCheck className="w-3.5 h-3.5 text-medical-teal" />
            <span>Quantitative Summary</span>
          </div>
          <p className="text-[11px] text-medical-muted leading-relaxed">
            {interp.summary}
          </p>
        </div>
      )}

      {/* 7. Clinical Assessment Limitations Checklist */}
      <div className="p-3 rounded-xl bg-medical-surface/60 border border-medical-border space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 font-mono">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Diagnostic Limitations</span>
        </div>
        <ul className="space-y-1 text-[10px] text-medical-muted font-mono leading-tight list-disc pl-4">
          {interp?.limitations?.map((lim, idx) => (
            <li key={idx}>{lim}</li>
          )) || (
            <>
              <li>Tumor burden is a spatial volume measure and does NOT predict WHO tumor grade or cancer stage.</li>
              <li>A larger volume does not automatically indicate higher cellular malignancy.</li>
              <li>Clinical diagnosis requires neuro-pathological and molecular biomarker analysis.</li>
            </>
          )}
        </ul>
      </div>

    </div>
  );
}
