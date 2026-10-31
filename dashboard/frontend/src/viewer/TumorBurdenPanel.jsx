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
  Target
} from 'lucide-react';
import { getPatientTumorBurden } from '../api/segmentation';

/**
 * TumorBurdenPanel
 *
 * Implements the "Experimental Tumor Burden Analysis" inspector:
 * - Whole Tumor (WT), Tumor Core (TC), and Enhancing Tumor (ET) volumetric measurements
 * - High-contrast palette: WT (Yellow #EAB308), TC (Coral #F43F5E), ET (Cyan #06B6D4)
 * - Maximum slice cross-sectional area (cm²) with direct jump action
 * - Relative tumor burden (% of intracranial brain volume)
 * - Styled for the dedicated dark MRI workstation environment (#101B2D / #18263B / #30445E)
 */
export default function TumorBurdenPanel({
  patientId,
  segSource = 'ground_truth',
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
      const data = await getPatientTumorBurden(patientId, segSource);
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
  }, [patientId, segSource]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-2.5 bg-[#18263B] rounded-xl border border-[#30445E] text-center">
        <Loader2 className="w-5 h-5 text-[#7DD3FC] animate-spin" />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-[#F1F5F9]">Analyzing 3D Volumetrics...</p>
          <p className="text-[10px] text-[#A7B5C8] font-mono">
            Evaluating voxel spacing & physical dimensions
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 space-y-2.5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-red-300">
              Calculation Error
            </h4>
            <p className="text-[11px] leading-relaxed text-red-200/90 break-words">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchBurden}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-900/40 hover:bg-red-800/50 border border-red-500/40 text-[11px] font-medium text-white transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!burdenData) {
    return (
      <div className="p-4 text-center text-[11px] text-[#A7B5C8] bg-[#18263B] rounded-xl border border-[#30445E]">
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
    <div className="space-y-3 text-xs min-w-0 w-full overflow-hidden">
      
      {/* 1. Header: Status & Source Badge */}
      <div className="p-2.5 rounded-xl bg-[#18263B] border border-[#30445E] space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Activity className="w-3.5 h-3.5 text-[#7DD3FC] shrink-0" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#F1F5F9] font-mono truncate">
              Burden Analysis
            </h3>
          </div>
          <button
            onClick={fetchBurden}
            className="p-1 rounded hover:bg-[#22354D] text-[#A7B5C8] hover:text-white transition-all shrink-0"
            title="Refresh quantitative calculation"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-[#30445E]">
          <span className="text-[#A7B5C8] flex items-center gap-1">
            <Database className="w-3 h-3 text-[#7DD3FC]" />
            {segSource === 'ground_truth' ? 'Ground Truth Mask' : 'Model Prediction'}
          </span>
          <span className="text-[#7DD3FC] font-semibold uppercase">
            {activeMriModality}
          </span>
        </div>
      </div>

      {/* 2. Structured Volumetric Measurement Rows */}
      <div className="p-3 rounded-xl bg-[#18263B] border border-[#30445E] space-y-3 shadow-2xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#A7B5C8] font-bold block pb-1 border-b border-[#30445E]">
          Compartment Volumetrics
        </span>

        {/* WHOLE TUMOR (WT - Yellow) */}
        {wt && (
          <div className="space-y-1.5 pb-2.5 border-b border-[#30445E]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 shrink-0 shadow-sm" />
                <span className="text-[11px] font-bold text-[#F1F5F9] font-mono">Whole Tumor (WT)</span>
              </div>
              <span className="font-mono font-tabular font-bold text-yellow-400 text-xs">
                {wt.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#A7B5C8] pl-4">
              <span>Voxel Count:</span>
              <span className="text-[#F1F5F9] font-semibold font-tabular">
                {wt.voxel_count?.toLocaleString()}
              </span>
            </div>

            {wt.affected_slices && (
              <div className="flex items-center justify-between text-[10px] font-mono text-[#A7B5C8] pl-4">
                <span>Affected Slices (Z/Y/X):</span>
                <span className="text-[#F1F5F9] font-medium font-tabular">
                  {wt.affected_slices.axial_z} / {wt.affected_slices.coronal_y} / {wt.affected_slices.sagittal_x}
                </span>
              </div>
            )}

            {/* Peak Cross-Sectional Area Navigation Action */}
            {peakSlice !== undefined && (
              <div className="mt-1 flex items-center justify-between p-1.5 rounded-lg bg-[#101B2D] border border-yellow-500/25 text-[10px] font-mono">
                <span className="text-[#A7B5C8]">
                  Peak: <strong className="text-yellow-300 font-tabular">{maxAreaCm2?.toFixed(2)} cm²</strong> (Z: {peakSlice})
                </span>
                {onSliceSelect && (
                  <button
                    onClick={() => onSliceSelect(peakSlice)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-950/60 hover:bg-yellow-900 border border-yellow-500/40 text-[9px] text-yellow-300 transition-all font-semibold"
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

        {/* TUMOR CORE (TC - Coral Red) */}
        {tc && (
          <div className="space-y-1 pb-2.5 border-b border-[#30445E]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0 shadow-sm" />
                <span className="text-[11px] font-bold text-[#F1F5F9] font-mono">Tumor Core (TC)</span>
              </div>
              <span className="font-mono font-tabular font-bold text-rose-400 text-xs">
                {tc.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#A7B5C8] pl-4">
              <span>Voxel Count:</span>
              <span className="text-[#F1F5F9] font-semibold font-tabular">
                {tc.voxel_count?.toLocaleString()}
              </span>
            </div>

            {tc.affected_axial_slices !== undefined && (
              <div className="flex items-center justify-between text-[10px] font-mono text-[#A7B5C8] pl-4">
                <span>Affected Axial Slices:</span>
                <span className="text-[#F1F5F9] font-medium font-tabular">
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
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shrink-0 shadow-sm" />
                <span className="text-[11px] font-bold text-[#F1F5F9] font-mono">Enhancing Tumor (ET)</span>
              </div>
              <span className="font-mono font-tabular font-bold text-cyan-400 text-xs">
                {et.volume_cm3.toFixed(2)} cm³
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#A7B5C8] pl-4">
              <span>Voxel Count:</span>
              <span className="text-[#F1F5F9] font-semibold font-tabular">
                {et.voxel_count?.toLocaleString()}
              </span>
            </div>

            {et.affected_axial_slices !== undefined && (
              <div className="flex items-center justify-between text-[10px] font-mono text-[#A7B5C8] pl-4">
                <span>Affected Axial Slices:</span>
                <span className="text-[#F1F5F9] font-medium font-tabular">
                  {et.affected_axial_slices}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Relative Intracranial Burden (% of Brain Volume) */}
      <div className="p-3 rounded-xl bg-[#18263B] border border-[#30445E] space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[#7DD3FC] shrink-0" />
            <span className="text-[11px] font-bold text-[#F1F5F9] font-mono">
              Relative Burden
            </span>
          </div>
          {rel?.relative_burden_percentage !== null && rel?.relative_burden_percentage !== undefined ? (
            <span className="text-xs font-mono font-bold text-[#7DD3FC] font-tabular">
              {rel.relative_burden_percentage.toFixed(2)}%
            </span>
          ) : (
            <span className="text-[10px] font-mono text-[#A7B5C8]">N/A</span>
          )}
        </div>

        {rel?.relative_burden_percentage !== null && rel?.relative_burden_percentage !== undefined ? (
          <div className="space-y-1">
            <div className="w-full bg-[#101B2D] h-1.5 rounded-full overflow-hidden border border-[#30445E]">
              <div
                className="h-full bg-gradient-to-r from-[#2563EB] to-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(rel.relative_burden_percentage * 3, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-[#A7B5C8]">
              <span>Brain Volume:</span>
              <span className="text-[#F1F5F9] font-tabular">
                {rel.intracranial_brain_volume_cm3?.toFixed(1)} cm³
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-[#A7B5C8] font-mono leading-tight">
            Brain mask unavailable for relative fraction.
          </p>
        )}
      </div>

      {/* 4. Experimental Research Category & Thresholds */}
      {cat && (
        <div className="p-2.5 rounded-xl bg-[#18263B] border border-[#30445E] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A7B5C8] font-semibold">
              Category
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#101B2D] border border-[#30445E] text-[#F1F5F9]">
              {cat.category || 'Measured'}
            </span>
          </div>

          <p className="text-[10px] text-[#A7B5C8] font-mono leading-relaxed">
            {cat.description || 'Volumetric spatial extent derived from NIfTI voxel count.'}
          </p>

          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="text-[9px] text-[#7DD3FC] hover:underline flex items-center gap-0.5 font-mono"
            >
              <Info className="w-2.5 h-2.5" />
              <span>{showMethodology ? 'Hide Rules' : 'Threshold Rules'}</span>
            </button>
            <span className="text-[9px] text-amber-300/80 font-mono">Non-Clinical Metric</span>
          </div>

          {showMethodology && (
            <div className="mt-1.5 p-2 rounded-lg bg-[#101B2D] border border-[#30445E] text-[9px] text-[#A7B5C8] font-mono space-y-1">
              <p className="text-[#F1F5F9] font-semibold">Configured Research Thresholds:</p>
              <ul className="list-disc pl-3.5 space-y-0.5">
                <li>Minimal / Focal: &lt; 5.0 cm³</li>
                <li>Moderate: 5.0 – 25.0 cm³</li>
                <li>Substantial: 25.0 – 60.0 cm³</li>
                <li>Extensive: &gt; 60.0 cm³</li>
              </ul>
              <p className="pt-1 text-[8px] text-amber-300/90 leading-tight">
                Disclaimer: Reflects spatial volume only. Does NOT indicate WHO tumor grade, histological malignancy, or clinical severity.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Model Validation Agreement */}
      {val && (
        <div className="p-2.5 rounded-xl bg-[#18263B] border border-[#30445E] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A7B5C8] font-semibold">
              Model Agreement (vs GT)
            </span>
            <CheckCircle2 className="w-3 h-3 text-[#16866A]" />
          </div>

          <div className="grid grid-cols-3 gap-1 text-center font-mono text-[9px]">
            <div className="p-1 rounded bg-[#101B2D] border border-[#30445E]">
              <span className="text-yellow-400 block font-semibold">WT</span>
              <span className="text-[#F1F5F9] font-bold font-tabular">
                {(val.dice_scores?.WT * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-1 rounded bg-[#101B2D] border border-[#30445E]">
              <span className="text-rose-400 block font-semibold">TC</span>
              <span className="text-[#F1F5F9] font-bold font-tabular">
                {(val.dice_scores?.TC * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-1 rounded bg-[#101B2D] border border-[#30445E]">
              <span className="text-cyan-400 block font-semibold">ET</span>
              <span className="text-[#F1F5F9] font-bold font-tabular">
                {(val.dice_scores?.ET * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
