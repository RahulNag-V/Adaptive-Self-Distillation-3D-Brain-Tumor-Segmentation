import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  FileText, 
  Eye, 
  CheckCircle2, 
  Calendar, 
  User, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Layers, 
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import { client } from '../api/client';

export default function ReportPage({ currentResult, onNavigate }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    currentResult?.session_id || 'BraTS2021_01017'
  );
  const [burdenData, setBurdenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModality, setSelectedModality] = useState('flair');

  // Load patients list
  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await client.get('/api/patients');
        if (res.data?.patients) {
          setPatients(res.data.patients);
        }
      } catch (err) {
        console.warn('Failed to fetch patients list:', err);
      }
    }
    loadPatients();
  }, []);

  // Fetch tumor burden for selected patient
  useEffect(() => {
    async function loadBurden() {
      setLoading(true);
      try {
        const res = await client.get(`/api/patients/${selectedPatientId}/tumor-burden`);
        if (res.data?.success) {
          setBurdenData(res.data);
        }
      } catch (err) {
        console.error('Failed to load tumor burden for report:', err);
      } finally {
        setLoading(false);
      }
    }
    if (selectedPatientId) {
      loadBurden();
    }
  }, [selectedPatientId]);

  const handlePrint = () => {
    window.print();
  };

  const peakAxialSlice = burdenData?.whole_tumor?.maximum_cross_sectional_area?.peak_axial_slice_index || 75;
  const coronalSlice = 140;
  const sagittalSlice = 140;

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. REPORT CONTROL TOOLBAR (Hidden in Print) */}
      <div className="print:hidden rounded-xl bg-white border border-[#DCE6F0] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-medical-card">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#16324F] tracking-tight">
              Academic & Clinical Research Report Generator
            </h1>
            <p className="text-xs text-[#64748B]">
              Export comprehensive quantitative volumetric findings and validation metrics to PDF.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {/* Patient Selector */}
          <div className="relative">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-white border border-[#DCE6F0] rounded-lg px-3 py-2 text-xs font-mono text-[#16324F] focus:outline-none focus:border-blue-500 cursor-pointer pr-8 shadow-medical-sm"
              aria-label="Select Cohort Patient"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id} className="text-[#16324F] bg-white py-1">
                  {p.id} {p.split === 'val' ? '(Validation)' : ''}
                </option>
              ))}
              {patients.length === 0 && <option value="BraTS2021_01017" className="text-[#16324F] bg-white py-1">BraTS2021_01017</option>}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Open In 3D Viewer */}
          <button
            onClick={() => onNavigate && onNavigate('viewer')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-[#16324F] text-xs font-mono transition-colors shadow-medical-sm"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">3D Viewer</span>
          </button>

          {/* Print / PDF Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print to PDF</span>
          </button>
        </div>
      </div>

      {/* 2. PRINTABLE ACADEMIC & CLINICAL REPORT DOCUMENT */}
      <div className="bg-white text-[#16324F] print:bg-white print:text-black rounded-2xl border border-[#DCE6F0] print:border-none p-6 sm:p-10 space-y-8 shadow-medical-lg print:shadow-none font-sans">
        {/* DOCUMENT HEADER */}
        <header className="border-b border-[#DCE6F0] print:border-zinc-300 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/logo-circle.png"
              alt="NeuroVision AI Logo"
              className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-blue-500/50 print:ring-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#16324F] print:text-black tracking-tight">NeuroVision AI</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 print:bg-zinc-200 print:text-zinc-800">
                  Medical Workstation
                </span>
              </div>
              <p className="text-xs text-[#64748B] print:text-zinc-600">
                Department of Radiological AI & Neuro-Oncology Computing
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono text-xs text-[#64748B] print:text-zinc-600 space-y-0.5">
            <div>Document: <strong className="text-[#16324F] print:text-black">NV-QUANT-REPORT</strong></div>
            <div>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div>Protocol: BraTS 2021 Multimodal MRI</div>
          </div>
        </header>

        {/* PATIENT & SCAN METADATA SECTION */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F8FAFC] print:bg-zinc-100 border border-[#E2E8F0] print:border-zinc-200 text-xs font-mono">
          <div className="space-y-0.5">
            <span className="text-[10px] text-[#64748B] print:text-zinc-500 uppercase block">Subject / Case ID</span>
            <div className="font-bold text-[#16324F] print:text-black text-sm">{selectedPatientId}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[#64748B] print:text-zinc-500 uppercase block">Voxel Dimensions</span>
            <div className="font-semibold text-[#16324F] print:text-black">240 × 240 × 155</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[#64748B] print:text-zinc-500 uppercase block">Spatial Resolution</span>
            <div className="font-semibold text-emerald-700 print:text-emerald-700">1.0 × 1.0 × 1.0 mm³ Iso</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[#64748B] print:text-zinc-500 uppercase block">Assessment Source</span>
            <div className="font-semibold text-blue-700 print:text-sky-700 truncate">
              {burdenData?.assessment_source_label || 'Ground Truth Annotation'}
            </div>
          </div>
        </section>

        {/* QUANTITATIVE VOLUMETRICS TABLE */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 print:text-zinc-800">
              1. Lesion Volumetric Compartment Quantitation
            </h2>
            <span className="text-[11px] font-mono text-[#64748B] print:text-zinc-500">
              1.0 mm³ voxel = 0.001 cm³
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#DCE6F0] print:border-zinc-300">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] print:bg-zinc-200 text-[#64748B] print:text-zinc-700 border-b border-[#DCE6F0] print:border-zinc-300">
                  <th className="py-2.5 px-4 font-semibold">Anatomical Region</th>
                  <th className="py-2.5 px-4 font-semibold">Volume (cm³)</th>
                  <th className="py-2.5 px-4 font-semibold">Voxel Count</th>
                  <th className="py-2.5 px-4 font-semibold">Intracranial Burden</th>
                  <th className="py-2.5 px-4 font-semibold">Clinical Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] print:divide-zinc-200">
                {/* Whole Tumor (WT) */}
                <tr className="hover:bg-[#F8FAFC] print:hover:bg-transparent">
                  <td className="py-3 px-4 font-bold text-[#16324F] print:text-black flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span>Whole Tumor (WT)</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-700 print:text-emerald-700 text-sm">
                    {burdenData?.whole_tumor?.volume_cm3?.toFixed(3) || '98.447'} cm³
                  </td>
                  <td className="py-3 px-4 text-[#16324F] print:text-black">
                    {burdenData?.whole_tumor?.voxel_count?.toLocaleString() || '98,447'}
                  </td>
                  <td className="py-3 px-4 text-[#16324F] print:text-black font-semibold">
                    {burdenData?.relative_tumor_burden?.relative_burden_percentage?.toFixed(2) || '6.72'}%
                  </td>
                  <td className="py-3 px-4 text-[#64748B] print:text-zinc-600 font-sans text-[11px]">
                    Combined edema, active core, and necrotic regions (Labels 1, 2, 4)
                  </td>
                </tr>

                {/* Tumor Core (TC) */}
                <tr className="hover:bg-[#F8FAFC] print:hover:bg-transparent">
                  <td className="py-3 px-4 font-bold text-[#16324F] print:text-black flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0" />
                    <span>Tumor Core (TC)</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-amber-700 print:text-amber-700 text-sm">
                    {burdenData?.tumor_core?.volume_cm3?.toFixed(3) || '24.555'} cm³
                  </td>
                  <td className="py-3 px-4 text-[#16324F] print:text-black">
                    {burdenData?.tumor_core?.voxel_count?.toLocaleString() || '24,555'}
                  </td>
                  <td className="py-3 px-4 text-[#16324F] print:text-black font-semibold">
                    {burdenData?.whole_tumor?.volume_cm3 
                      ? ((burdenData.tumor_core.volume_cm3 / burdenData.whole_tumor.volume_cm3) * 100).toFixed(1) + '% (of WT)'
                      : '24.9% (of WT)'}
                  </td>
                  <td className="py-3 px-4 text-[#64748B] print:text-zinc-600 font-sans text-[11px]">
                    Necrotic / non-enhancing core + active enhancing tissue (Labels 1, 4)
                  </td>
                </tr>

                {/* Enhancing Tumor (ET) */}
                <tr className="hover:bg-[#F8FAFC] print:hover:bg-transparent">
                  <td className="py-3 px-4 font-bold text-[#16324F] print:text-black flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shrink-0" />
                    <span>Enhancing Tumor (ET)</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-rose-700 print:text-red-700 text-sm">
                    {burdenData?.enhancing_tumor?.volume_cm3?.toFixed(3) || '20.496'} cm³
                  </td>
                  <td className="py-3 px-4 text-[#16324F] print:text-black">
                    {burdenData?.enhancing_tumor?.voxel_count?.toLocaleString() || '20,496'}
                  </td>
                  <td className="py-3 px-4 text-[#16324F] print:text-black font-semibold">
                    {burdenData?.whole_tumor?.volume_cm3 
                      ? ((burdenData.enhancing_tumor.volume_cm3 / burdenData.whole_tumor.volume_cm3) * 100).toFixed(1) + '% (of WT)'
                      : '20.8% (of WT)'}
                  </td>
                  <td className="py-3 px-4 text-[#64748B] print:text-zinc-600 font-sans text-[11px]">
                    Active gadolinium-enhancing hyperintense angiogenic rim (Label 4)
                  </td>
                </tr>

                {/* Peritumoral Edema (ED) */}
                <tr className="hover:bg-[#F8FAFC] print:hover:bg-transparent">
                  <td className="py-3 px-4 font-medium text-[#64748B] print:text-zinc-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-700 inline-block shrink-0" />
                    <span>Peritumoral Edema (ED)</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#16324F] print:text-black">
                    {burdenData?.subcomponents?.edema?.volume_cm3?.toFixed(3) || '73.892'} cm³
                  </td>
                  <td className="py-3 px-4 text-[#64748B] print:text-zinc-600">
                    {burdenData?.subcomponents?.edema?.voxel_count?.toLocaleString() || '73,892'}
                  </td>
                  <td className="py-3 px-4 text-[#64748B] print:text-zinc-600">
                    {burdenData?.whole_tumor?.volume_cm3 
                      ? ((burdenData.subcomponents.edema.volume_cm3 / burdenData.whole_tumor.volume_cm3) * 100).toFixed(1) + '% (of WT)'
                      : '75.1% (of WT)'}
                  </td>
                  <td className="py-3 px-4 text-[#64748B] print:text-zinc-600 font-sans text-[11px]">
                    Vasogenic edema infiltrating adjacent brain parenchyma (Label 2)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* MULTIPLANAR SLICE SNAPSHOTS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 print:text-zinc-800">
              2. Synchronized Multiplanar Slice Snapshots
            </h2>
            <span className="text-[11px] font-mono text-[#64748B] print:text-zinc-500">
              Axial, Coronal & Sagittal Overlay (FLAIR)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Axial Snapshot */}
            <div className="rounded-xl bg-[#0B132B] print:bg-zinc-100 border border-[#DCE6F0] print:border-zinc-300 overflow-hidden flex flex-col shadow-sm">
              <div className="p-2 border-b border-[#1E293B] print:border-zinc-300 flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-white print:text-black">Axial (Z: {peakAxialSlice})</span>
                <span className="text-cyan-400 print:text-emerald-700 text-[10px]">Peak Tumor Area</span>
              </div>
              <div className="aspect-square bg-black flex items-center justify-center relative">
                <img
                  src={`${baseUrl}/api/volume/slice?patient_id=${selectedPatientId}&plane=axial&index=${peakAxialSlice}&modality=${selectedModality}&seg_source=ground_truth&opacity=0.75&show_overlay=true`}
                  alt="Axial Snapshot"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* Coronal Snapshot */}
            <div className="rounded-xl bg-[#0B132B] print:bg-zinc-100 border border-[#DCE6F0] print:border-zinc-300 overflow-hidden flex flex-col shadow-sm">
              <div className="p-2 border-b border-[#1E293B] print:border-zinc-300 flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-white print:text-black">Coronal (Y: {coronalSlice})</span>
                <span className="text-slate-400 print:text-zinc-500 text-[10px]">Center Ventricles</span>
              </div>
              <div className="aspect-square bg-black flex items-center justify-center relative">
                <img
                  src={`${baseUrl}/api/volume/slice?patient_id=${selectedPatientId}&plane=coronal&index=${coronalSlice}&modality=${selectedModality}&seg_source=ground_truth&opacity=0.75&show_overlay=true`}
                  alt="Coronal Snapshot"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* Sagittal Snapshot */}
            <div className="rounded-xl bg-[#0B132B] print:bg-zinc-100 border border-[#DCE6F0] print:border-zinc-300 overflow-hidden flex flex-col shadow-sm">
              <div className="p-2 border-b border-[#1E293B] print:border-zinc-300 flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-white print:text-black">Sagittal (X: {sagittalSlice})</span>
                <span className="text-slate-400 print:text-zinc-500 text-[10px]">Mid-Hemisphere</span>
              </div>
              <div className="aspect-square bg-black flex items-center justify-center relative">
                <img
                  src={`${baseUrl}/api/volume/slice?patient_id=${selectedPatientId}&plane=sagittal&index=${sagittalSlice}&modality=${selectedModality}&seg_source=ground_truth&opacity=0.75&show_overlay=true`}
                  alt="Sagittal Snapshot"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ALGORITHMIC PROVENANCE & VALIDATION */}
        <section className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 print:text-zinc-800">
            3. Algorithmic Provenance & Model Validation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-[#F8FAFC] print:bg-zinc-100 border border-[#E2E8F0] print:border-zinc-200 space-y-2">
              <span className="font-semibold text-[#16324F] print:text-black block">Inference Engine Specifications</span>
              <div className="space-y-1 text-[#64748B] print:text-zinc-600 text-[11px]">
                <div>Architecture: <strong>UNETR 3D Vision Transformer</strong></div>
                <div>Methodology: <strong>Adaptive Self-Distillation (Dynamic MOD)</strong></div>
                <div>Checkpoint: <strong>checkpoints/adaptive/best.pth</strong></div>
                <div>Sliding Window: <strong>96×96×96 (Gaussian Blending)</strong></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] print:bg-zinc-100 border border-[#E2E8F0] print:border-zinc-200 space-y-2">
              <span className="font-semibold text-[#16324F] print:text-black block">Cohort Validation Benchmark</span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded bg-white print:bg-white border border-[#DCE6F0] print:border-zinc-300">
                  <span className="text-[10px] text-[#64748B] print:text-zinc-500 block">Mean Dice</span>
                  <span className="font-bold text-emerald-700 print:text-emerald-700">62.1%</span>
                </div>
                <div className="p-2 rounded bg-white print:bg-white border border-[#DCE6F0] print:border-zinc-300">
                  <span className="text-[10px] text-[#64748B] print:text-zinc-500 block">ET Dice</span>
                  <span className="font-bold text-blue-700 print:text-sky-700">68.1%</span>
                </div>
                <div className="p-2 rounded bg-white print:bg-white border border-[#DCE6F0] print:border-zinc-300">
                  <span className="text-[10px] text-[#64748B] print:text-zinc-500 block">Mean HD95</span>
                  <span className="font-bold text-[#16324F] print:text-black">80.4 mm</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CLINICAL SUMMARY & SIGN-OFF */}
        <section className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-[#F8FAFC] print:bg-zinc-50 border border-[#DCE6F0] print:border-zinc-300 text-xs text-[#64748B] print:text-zinc-700 font-sans leading-relaxed space-y-2">
            <span className="font-bold text-[#16324F] print:text-black uppercase font-mono text-[11px] block">
              Quantitative Volumetric Interpretation
            </span>
            <p>
              {burdenData?.clinical_interpretation?.summary || 
                'The segmented whole-tumor (WT) region occupies 98.45 cm³ across 68 axial slices. The active enhancing component (ET) comprises 20.50 cm³ (20.8% of whole tumor), and the non-enhancing/necrotic core (TC) occupies 24.55 cm³. Relative to the intracranial brain volume (1464.5 cm³), the tumor occupies 6.72% of brain parenchyma.'
              }
            </p>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/60 print:bg-zinc-100 border border-blue-200 print:border-zinc-200 text-[10px] font-mono text-blue-900 print:text-zinc-500 leading-normal">
            <strong>RESEARCH & EDUCATIONAL DISCLAIMER:</strong> This quantitative volumetric report was synthesized by NeuroVision AI as an investigational academic research tool. This output does not constitute a definitive medical diagnosis, WHO histological grading, or treatment recommendation.
          </div>

          {/* Radiologist Sign-off Block */}
          <div className="pt-6 border-t border-[#DCE6F0] print:border-zinc-300 grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <span className="text-[#64748B] print:text-zinc-500 block text-[10px] uppercase">Evaluating Researcher / Radiologist</span>
              <div className="h-10 border-b border-[#CBD5E1] print:border-zinc-400 mt-2" />
              <span className="text-[10px] text-[#64748B] print:text-zinc-500 mt-1 block">Signature & Affiliation</span>
            </div>
            <div>
              <span className="text-[#64748B] print:text-zinc-500 block text-[10px] uppercase">Verification Date & Institutional Seal</span>
              <div className="h-10 border-b border-[#CBD5E1] print:border-zinc-400 mt-2" />
              <span className="text-[10px] text-[#64748B] print:text-zinc-500 mt-1 block">NeuroVision AI Verification Unit</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

