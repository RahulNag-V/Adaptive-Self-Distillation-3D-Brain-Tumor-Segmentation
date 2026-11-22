import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Database,
  FileCheck,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target
} from 'lucide-react';
import { getPatientTumorBurden } from '../api/segmentation';

/**
 * TumorBurdenPanel
 *
 * Implements the "Experimental Tumor Burden Analysis" inspector:
 * - Whole Tumor (WT), Tumor Core (TC), and Enhancing Tumor (ET) volumetric measurements
 * - Calibrated BraTS palette: WT (#EAB308), TC (#EF4444), ET (#06B6D4)
 * - Maximum slice cross-sectional area (cm²) with direct jump action
 * - Relative tumor burden (% of intracranial brain volume)
 * - Theme: Neuro Resonence AI Brand Palette (Deep Blue #103B5C, Primary Brand Blue #399DBA, Ocean Blue #1B6284, Soft Mint #98D9CE)
 */
export default function TumorBurdenPanel({
  patientId,
  segSource = 'ground_truth',
  confidenceThreshold = 0.90,
  onSliceSelect,
  activeMriModality = 'flair',
}) {
  const [burdenData, setBurdenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const fetchBurden = async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const thresholdParam = segSource === 'prediction' ? confidenceThreshold : null;
      const data = await getPatientTumorBurden(patientId, segSource, thresholdParam);
      if (data && data.success) {
        setBurdenData(data);
      } else {
        setError(data?.error || 'Failed to calculate volumetric measurements.');
      }
    } catch (err) {
      console.error('Error fetching tumor burden analysis:', err);
      setError(err.message || 'Server error retrieving volumetric analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBurden();
  }, [patientId, segSource, confidenceThreshold]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-2.5 bg-transparent rounded-xl border border-[#111111]/20 text-center shadow-xs">
        <Loader2 className="w-5 h-5 text-[#103B5C] animate-spin" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[#103B5C]">Analyzing 3D Volumetrics...</p>
          <p className="text-[10px] text-[#6B7280] font-mono">
            Evaluating voxel spacing & physical dimensions
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3.5 rounded-xl bg-transparent border border-red-300 text-red-900 space-y-2.5 shadow-xs">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
              Calculation Note
            </h4>
            <p className="text-[11px] leading-relaxed text-red-800 break-words">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchBurden}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-transparent hover:bg-black/5 border border-red-300 text-[11px] font-semibold text-red-900 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!burdenData) {
    return (
      <div className="p-4 text-center text-[11px] text-[#6B7280] bg-transparent rounded-xl border border-[#111111]/20 font-mono shadow-xs">
        Select a patient to generate volumetric tumor analysis.
      </div>
    );
  }

  const {
    whole_tumor: wt,
    tumor_core: tc,
    enhancing_tumor: et,
    relative_tumor_burden: rel,
    burden_category: cat,
    model_validation: val,
  } = burdenData;

  const peakSlice = wt?.maximum_cross_sectional_area?.peak_axial_slice_index;
  const maxAreaCm2 = wt?.maximum_cross_sectional_area?.area_cm2;

  return (
    <div className="space-y-2.5 text-xs min-w-0 w-full overflow-hidden">
      
      {/* 1. Header: Status & Source Badge */}
      <div className="p-2.5 rounded-xl bg-transparent border border-[#111111]/25 space-y-1.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Activity className="w-3.5 h-3.5 text-[#103B5C] shrink-0" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#103B5C] font-mono truncate">
              Burden Analysis
            </h3>
          </div>
          <button
            onClick={fetchBurden}
            className="p-1 rounded-md hover:bg-black/5 text-[#103B5C] transition-all shrink-0 cursor-pointer"
            title="Refresh quantitative calculation"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-[#111111]/15">
          <span className="text-[#6B7280] flex items-center gap-1">
            <Database className="w-3 h-3 text-[#399DBA]" />
            {segSource === 'ground_truth' 
              ? 'Ground Truth Mask' 
              : segSource === 'corrected' 
                ? 'Corrected Annotation' 
                : confidenceThreshold 
                  ? 'AI Pred (High Conf ≥90%)' 
                  : 'AI Pred (Raw Unfiltered)'}
          </span>
          <span className="text-[#103B5C] font-bold uppercase">
            {activeMriModality}
          </span>
        </div>
      </div>

      {/* Threshold Message when no voxel meets threshold */}
      {burdenData?.threshold_message && (
        <div className="p-2.5 rounded-xl bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#B45309] text-[10px] font-mono flex items-start gap-2 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#B45309]" />
          <span>No regions meet the current high-confidence display threshold.</span>
        </div>
      )}

      {/* 2. Structured Volumetric Measurement Rows */}
      <div className="p-3 rounded-xl bg-transparent border border-[#111111]/25 space-y-2.5 shadow-xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#103B5C] font-bold block pb-1 border-b border-[#111111]/15">
          Compartment Volumetrics
        </span>

        {/* WHOLE TUMOR (WT - Yellow) */}
        {wt && (
          <div className="space-y-1.5 pb-2 border-b border-[#111111]/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#EAB308] shrink-0 shadow-xs" />
                <span className="text-[11px] font-bold text-[#111827] font-mono">Whole Tumor (WT)</span>
              </div>
              <span className="font-mono tabular-nums font-bold text-[#B45309] text-xs">
                {wt.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            {burdenData?.unfiltered_wt_volume_cm3 !== null && burdenData?.unfiltered_wt_volume_cm3 !== undefined && confidenceThreshold && (
              <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pl-3.5">
                <span>Original Model Volume:</span>
                <span className="text-slate-500 line-through tabular-nums">
                  {burdenData.unfiltered_wt_volume_cm3.toFixed(2)} cm³
                </span>
              </div>
            )}

            {burdenData?.has_pruned_fragments && (
              <div className="flex items-center justify-between text-[10px] font-mono pl-3.5 text-teal-800 bg-teal-500/10 p-1 rounded-sm border border-teal-500/20">
                <span className="flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3 text-teal-600 shrink-0" />
                  Pruned False Fragments:
                </span>
                <span className="font-bold tabular-nums">
                  {burdenData.pruned_fragments_count} ({burdenData.pruned_volume_cm3.toFixed(2)} cm³)
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pl-3.5">
              <span>Voxel Count:</span>
              <span className="text-[#111827] font-semibold tabular-nums">
                {wt.voxel_count?.toLocaleString()}
              </span>
            </div>

            {wt.affected_slices && (
              <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pl-3.5">
                <span>Affected Slices (Z/Y/X):</span>
                <span className="text-[#111827] font-semibold tabular-nums">
                  {wt.affected_slices.axial_z} / {wt.affected_slices.coronal_y} / {wt.affected_slices.sagittal_x}
                </span>
              </div>
            )}

            {/* Peak Cross-Sectional Area Navigation Action */}
            {peakSlice !== undefined && (
              <div className="mt-1 flex items-center justify-between p-1.5 rounded-lg bg-transparent border border-[#EAB308]/40 text-[10px] font-mono">
                <span className="text-[#6B7280]">
                  Peak: <strong className="text-[#B45309] tabular-nums">{maxAreaCm2?.toFixed(2)} cm²</strong> (Z: {peakSlice})
                </span>
                {onSliceSelect && (
                  <button
                    onClick={() => onSliceSelect(peakSlice)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EAB308]/15 hover:bg-[#EAB308]/30 border border-[#EAB308]/50 text-[9px] text-[#B45309] transition-all font-bold cursor-pointer"
                    title="Center Axial Viewport on Maximum Area Slice"
                  >
                    <Target className="w-2.5 h-2.5" />
                    <span>Jump</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TUMOR CORE (TC - Rose Coral) */}
        {tc && (
          <div className="space-y-1 pb-2 border-b border-[#111111]/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#EF4444] shrink-0 shadow-xs" />
                <span className="text-[11px] font-bold text-[#111827] font-mono">Tumor Core (TC)</span>
              </div>
              <span className="font-mono tabular-nums font-bold text-[#DC2626] text-xs">
                {tc.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pl-3.5">
              <span>Voxel Count:</span>
              <span className="text-[#111827] font-semibold tabular-nums">
                {tc.voxel_count?.toLocaleString()}
              </span>
            </div>

            {tc.affected_axial_slices !== undefined && (
              <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pl-3.5">
                <span>Affected Axial Slices:</span>
                <span className="text-[#111827] font-semibold tabular-nums">
                  {tc.affected_axial_slices}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ENHANCING TUMOR (ET - Cyan) */}
        {et && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#06B6D4] shrink-0 shadow-xs" />
                <span className="text-[11px] font-bold text-[#111827] font-mono">Enhancing Tumor (ET)</span>
              </div>
              <span className="font-mono tabular-nums font-bold text-[#0891B2] text-xs">
                {et.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pl-3.5">
              <span>Voxel Count:</span>
              <span className="text-[#111827] font-semibold tabular-nums">
                {et.voxel_count?.toLocaleString()}
              </span>
            </div>

            {et.affected_axial_slices !== undefined && (
              <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pl-3.5">
                <span>Affected Axial Slices:</span>
                <span className="text-[#111827] font-semibold tabular-nums">
                  {et.affected_axial_slices}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3D Connected Components Breakdown */}
        {burdenData?.connected_components && burdenData.connected_components.length > 0 && (
          <div className="pt-2 border-t border-[#111111]/15 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#103B5C] font-bold flex items-center gap-1">
                <Activity className="w-3 h-3 text-[#399DBA]" />
                3D Connected Lesions
              </span>
              <span className="text-[9px] font-mono text-[#6B7280]">
                {burdenData.total_connected_components || burdenData.connected_components.length} components
              </span>
            </div>
            <div className="space-y-1">
              {burdenData.connected_components.slice(0, 3).map((comp, idx) => (
                <div key={comp.id || idx} className="flex items-center justify-between text-[10px] font-mono px-2 py-0.5 rounded bg-black/5">
                  <span className="text-slate-700">
                    {idx === 0 ? 'Primary Lesion' : `Satellite Focus #${idx}`}
                  </span>
                  <span className="font-bold tabular-nums text-[#103B5C]">
                    {comp.volume_cm3.toFixed(2)} cm³ ({comp.percentage_of_wt || ((comp.voxels / wt.voxel_count) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Relative Intracranial Burden (% of Brain Volume) */}
      <div className="p-3 rounded-xl bg-transparent border border-[#111111]/25 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[#103B5C] shrink-0" />
            <span className="text-[11px] font-bold text-[#111827] font-mono">
              Relative Burden
            </span>
          </div>
          {rel?.relative_burden_percentage !== null && rel?.relative_burden_percentage !== undefined ? (
            <span className="text-xs font-mono font-bold text-[#103B5C] tabular-nums">
              {rel.relative_burden_percentage.toFixed(2)}%
            </span>
          ) : (
            <span className="text-[10px] font-mono text-[#6B7280]">N/A</span>
          )}
        </div>

        {rel?.relative_burden_percentage !== null && rel?.relative_burden_percentage !== undefined ? (
          <div className="space-y-1">
            <div className="w-full bg-black/10 h-2 rounded-full overflow-hidden border border-[#111111]/15">
              <div
                className="h-full bg-[#399DBA] hover:bg-[#103B5C] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(rel.relative_burden_percentage * 3, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-[#6B7280]">
              <span>Brain Volume:</span>
              <span className="text-[#111827] font-semibold tabular-nums">
                {rel.intracranial_brain_volume_cm3?.toFixed(1)} cm³
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-[#6B7280] font-mono leading-tight">
            Brain mask unavailable for relative fraction.
          </p>
        )}
      </div>

      {/* 4. Experimental Research Category & Thresholds */}
      {cat && (
        <div className="p-2.5 rounded-xl bg-transparent border border-[#111111]/25 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#103B5C] font-bold">
              Category
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-transparent border border-[#111111]/25 text-[#103B5C]">
              {cat.category || 'Measured'}
            </span>
          </div>

          <p className="text-[10px] text-[#6B7280] font-mono leading-relaxed">
            {cat.description || 'Volumetric spatial extent derived from NIfTI voxel count.'}
          </p>

          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="text-[9px] text-[#103B5C] hover:underline flex items-center gap-0.5 font-mono font-bold cursor-pointer"
            >
              <Info className="w-2.5 h-2.5" />
              <span>{showMethodology ? 'Hide Rules' : 'Threshold Rules'}</span>
            </button>
            <span className="text-[9px] text-[#D97706] font-mono font-bold">Research Metric</span>
          </div>

          {showMethodology && (
            <div className="mt-1.5 p-2 rounded-lg bg-transparent border border-[#111111]/25 text-[9px] text-[#6B7280] font-mono space-y-1">
              <p className="text-[#103B5C] font-bold">Configured Research Thresholds:</p>
              <ul className="list-disc pl-3.5 space-y-0.5">
                <li>Minimal / Focal: &lt; 5.0 cm³</li>
                <li>Moderate: 5.0 – 25.0 cm³</li>
                <li>Substantial: 25.0 – 60.0 cm³</li>
                <li>Extensive: &gt; 60.0 cm³</li>
              </ul>
              <p className="pt-1 text-[8px] text-[#D97706] leading-tight font-medium">
                Disclaimer: Reflects spatial volume only. Does NOT indicate WHO tumor grade, histological malignancy, or clinical severity.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Model Validation Agreement */}
      {val && (
        <div className="p-2.5 rounded-xl bg-transparent border border-[#111111]/25 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#103B5C] font-bold">
              Model Agreement (vs GT)
            </span>
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
          </div>

          <div className="grid grid-cols-3 gap-1 text-center font-mono text-[9px]">
            <div className="p-1 rounded bg-transparent border border-[#111111]/20">
              <span className="text-[#B45309] block font-bold">WT</span>
              <span className="text-[#111827] font-bold tabular-nums">
                {(val.dice_scores?.WT * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-1 rounded bg-transparent border border-[#111111]/20">
              <span className="text-[#DC2626] block font-bold">TC</span>
              <span className="text-[#111827] font-bold tabular-nums">
                {(val.dice_scores?.TC * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-1 rounded bg-transparent border border-[#111111]/20">
              <span className="text-[#0891B2] block font-bold">ET</span>
              <span className="text-[#111827] font-bold tabular-nums">
                {(val.dice_scores?.ET * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}