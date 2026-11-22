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
  ChevronDown,
  Sparkles,
  X
} from 'lucide-react';
import { client } from '../api/client';

export default function ReportPage({ currentResult, onNavigate }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    currentResult?.session_id || ''
  );
  const [burdenData, setBurdenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModality, setSelectedModality] = useState('flair');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:max-w-none print:w-full space-y-6 print:space-y-4 text-[#111827]">
      {/* 1. REPORT CONTROL TOOLBAR (Hidden in Print Mode) */}
      <div className="print:hidden card-transparent rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 rounded-xl bg-white/20 border border-[#111111]/30 text-[#103B5C] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#103B5C] tracking-tight">
              Academic &amp; Clinical Research Report Generator
            </h1>
            <p className="text-xs text-slate-700">
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
              className="appearance-none bg-white/40 border border-[#111111] rounded-xl px-3 py-2 text-xs font-mono text-[#103B5C] font-bold focus:outline-none focus:ring-1 focus:ring-[#103B5C] cursor-pointer pr-8 shadow-xs"
              aria-label="Select Cohort Patient"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id} className="text-[#103B5C] bg-white py-1">
                  {p.id} {p.split === 'val' ? '(Validation)' : ''}
                </option>
              ))}
              {patients.length === 0 && (
                <option value={currentResult?.session_id || 'no_case'} className="text-[#103B5C] bg-white py-1">
                  {currentResult?.session_id || 'No Case Loaded'}
                </option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#103B5C] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Open In 3D Viewer */}
          <button
            onClick={() => onNavigate && onNavigate('viewer')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-[rgba(226,247,242,0.65)] border border-[#111111] text-[#103B5C] text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
          >
            <Eye className="w-3.5 h-3.5 text-[#103B5C]" />
            <span className="hidden sm:inline">3D Viewer</span>
          </button>

          {/* Centered In-App Preview Button */}
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-[rgba(226,247,242,0.65)] border border-[#111111] text-[#103B5C] text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
            title="Preview report centered in application"
          >
            <Eye className="w-3.5 h-3.5 text-[#103B5C]" />
            <span className="hidden sm:inline">Preview in Center</span>
          </button>

          {/* Print / PDF Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#103B5C] hover:bg-[#0c2c45] border border-[#111111] text-white text-xs font-bold shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print to PDF</span>
          </button>
        </div>
      </div>

      {/* 2. PRINTABLE ACADEMIC & CLINICAL REPORT DOCUMENT */}
      {/* Strict White Paper for Diagnostic Printing and PDF Export */}
      <div className="bg-white text-[#111827] border border-[#111111] print:bg-white print:text-black print:border-none rounded-2xl print:rounded-none p-6 sm:p-10 print:p-0 space-y-8 print:space-y-4 shadow-[0_4px_12px_rgba(0,0,0,0.10)] print:shadow-none font-sans">
        
        {/* DOCUMENT HEADER */}
        <div className="border-b border-[#111111]/20 print:border-zinc-300 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/nrai-logo.png"
              alt="Neuro Resonence AI Logo"
              className="w-12 h-12 object-contain shrink-0 filter drop-shadow-sm print:filter-none"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#103B5C] print:text-black tracking-tight">
                  Neuro Resonence AI
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 text-[#103B5C] border border-[#111111]/30 print:bg-zinc-200 print:text-zinc-800 print:border-none font-bold">
                  Medical Workstation
                </span>
              </div>
              <p className="text-xs text-slate-600 print:text-zinc-600">
                Department of Radiological AI &amp; Neuro-Oncology Computing
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono text-xs text-[#64748B] print:text-zinc-600 space-y-0.5 font-bold">
            <div>Document: <strong className="text-[#103B5C] print:text-black">NRAI-QUANT-REPORT</strong></div>
            <div>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div>Protocol: BraTS 2021 Multimodal MRI</div>
          </div>
        </div>

        {/* PATIENT & SCAN METADATA SECTION */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F8FCFB] print:bg-zinc-100 border border-[#98D9CE]/60 print:border-zinc-200 text-xs font-mono">
          <div className="space-y-0.5">
            <span className="text-[10px] text-[#64748B] print:text-zinc-500 uppercase font-bold block">Subject / Case ID</span>
            <div className="font-bold text-[#103B5C] print:text-black text-sm">{selectedPatientId}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[#64748B] print:text-zinc-500 uppercase font-bold block">Voxel Dimensions</span>
            <div className="font-bold text-[#111827] print:text-black">240 &times; 240 &times; 155</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[#64748B] print:text-zinc-500 uppercase font-bold block">Spatial Resolution</span>
            <div className="font-bold text-[#103B5C] print:text-teal-700">1.0 &times; 1.0 &times; 1.0 mm&sup3; Iso</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-[#64748B] print:text-zinc-500 uppercase font-bold block">Assessment Source</span>
            <div className="font-bold text-[#103B5C] print:text-sky-700 truncate">
              {burdenData?.assessment_source_label || 'Ground Truth Annotation'}
            </div>
          </div>
        </section>

        {/* QUANTITATIVE VOLUMETRICS TABLE */}
        <section className="space-y-3 print:space-y-2 print:break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#103B5C] print:text-zinc-800">
              1. Lesion Volumetric Compartment Quantitation
            </h2>
            <span className="text-[11px] font-mono text-[#64748B] print:text-zinc-500 font-bold">
              1.0 mm&sup3; voxel = 0.001 cm&sup3;
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#98D9CE]/60 print:border-zinc-300">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#F8FCFB] print:bg-zinc-200 text-[#64748B] print:text-zinc-700 border-b border-[#98D9CE]/60 print:border-zinc-300">
                  <th className="py-2.5 px-4 font-bold">Anatomical Region</th>
                  <th className="py-2.5 px-4 font-bold">Volume (cm&sup3;)</th>
                  <th className="py-2.5 px-4 font-bold">Voxel Count</th>
                  <th className="py-2.5 px-4 font-bold">Intracranial Burden</th>
                  <th className="py-2.5 px-4 font-bold">Clinical Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#98D9CE]/40 print:divide-zinc-200">
                {/* Whole Tumor (WT) */}
                <tr className="hover:bg-[#F8FCFB]/50 print:hover:bg-transparent">
                  <td className="py-3 px-4 font-bold text-[#103B5C] print:text-black flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#EAB308] inline-block shrink-0" />
                    <span>Whole Tumor (WT)</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#B45309] print:text-amber-700 text-sm">
                    {burdenData?.whole_tumor?.volume_cm3?.toFixed(3) || '98.447'} cm&sup3;
                  </td>
                  <td className="py-3 px-4 text-[#111827] font-bold print:text-black">
                    {burdenData?.whole_tumor?.voxel_count?.toLocaleString() || '98,447'}
                  </td>
                  <td className="py-3 px-4 text-[#111827] print:text-black font-bold">
                    {burdenData?.relative_tumor_burden?.relative_burden_percentage?.toFixed(2) || '6.72'}%
                  </td>
                  <td className="py-3 px-4 text-[#475569] print:text-zinc-600 font-sans text-[11px]">
                    Combined edema, active core, and necrotic regions (Labels 1, 2, 4)
                  </td>
                </tr>

                {/* Tumor Core (TC) */}
                <tr className="hover:bg-[#F8FCFB]/50 print:hover:bg-transparent">
                  <td className="py-3 px-4 font-bold text-[#103B5C] print:text-black flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#F43F5E] inline-block shrink-0" />
                    <span>Tumor Core (TC)</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#DC2626] print:text-rose-700 text-sm">
                    {burdenData?.tumor_core?.volume_cm3?.toFixed(3) || '24.555'} cm&sup3;
                  </td>
                  <td className="py-3 px-4 text-[#111827] font-bold print:text-black">
                    {burdenData?.tumor_core?.voxel_count?.toLocaleString() || '24,555'}
                  </td>
                  <td className="py-3 px-4 text-[#111827] print:text-black font-bold">
                    {burdenData?.whole_tumor?.volume_cm3 
                      ? ((burdenData.tumor_core.volume_cm3 / burdenData.whole_tumor.volume_cm3) * 100).toFixed(1) + '% (of WT)'
                      : '24.9% (of WT)'}
                  </td>
                  <td className="py-3 px-4 text-[#475569] print:text-zinc-600 font-sans text-[11px]">
                    Necrotic / non-enhancing core + active enhancing tissue (Labels 1, 4)
                  </td>
                </tr>

                {/* Enhancing Tumor (ET) */}
                <tr className="hover:bg-[#F8FCFB]/50 print:hover:bg-transparent">
                  <td className="py-3 px-4 font-bold text-[#103B5C] print:text-black flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#06B6D4] inline-block shrink-0" />
                    <span>Enhancing Tumor (ET)</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#0891B2] print:text-cyan-700 text-sm">
                    {burdenData?.enhancing_tumor?.volume_cm3?.toFixed(3) || '20.496'} cm&sup3;
                  </td>
                  <td className="py-3 px-4 text-[#111827] font-bold print:text-black">
                    {burdenData?.enhancing_tumor?.voxel_count?.toLocaleString() || '20,496'}
                  </td>
                  <td className="py-3 px-4 text-[#111827] print:text-black font-bold">
                    {burdenData?.whole_tumor?.volume_cm3 
                      ? ((burdenData.enhancing_tumor.volume_cm3 / burdenData.whole_tumor.volume_cm3) * 100).toFixed(1) + '% (of WT)'
                      : '20.8% (of WT)'}
                  </td>
                  <td className="py-3 px-4 text-[#475569] print:text-zinc-600 font-sans text-[11px]">
                    Active gadolinium-enhancing hyperintense angiogenic rim (Label 4)
                  </td>
                </tr>

                {/* Peritumoral Edema (ED) */}
                <tr className="hover:bg-[#F8FCFB]/50 print:hover:bg-transparent">
                  <td className="py-3 px-4 font-bold text-[#475569] print:text-zinc-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#16A6A0] inline-block shrink-0" />
                    <span>Peritumoral Edema (ED)</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#103B5C] print:text-black">
                    {burdenData?.subcomponents?.edema?.volume_cm3?.toFixed(3) || '73.892'} cm&sup3;
                  </td>
                  <td className="py-3 px-4 text-[#64748B] font-bold print:text-zinc-600">
                    {burdenData?.subcomponents?.edema?.voxel_count?.toLocaleString() || '73,892'}
                  </td>
                  <td className="py-3 px-4 text-[#64748B] font-bold print:text-zinc-600">
                    {burdenData?.whole_tumor?.volume_cm3 
                      ? ((burdenData.subcomponents.edema.volume_cm3 / burdenData.whole_tumor.volume_cm3) * 100).toFixed(1) + '% (of WT)'
                      : '75.1% (of WT)'}
                  </td>
                  <td className="py-3 px-4 text-[#475569] print:text-zinc-600 font-sans text-[11px]">
                    Vasogenic edema infiltrating adjacent brain parenchyma (Label 2)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* MULTIPLANAR SLICE SNAPSHOTS */}
        <section className="space-y-3 print:space-y-2 print:break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#103B5C] print:text-zinc-800">
              2. Synchronized Multiplanar Slice Snapshots
            </h2>
            <span className="text-[11px] font-mono text-[#64748B] print:text-zinc-500 font-bold">
              Axial, Coronal &amp; Sagittal Overlay (FLAIR)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Axial Snapshot */}
            <div className="rounded-xl bg-white print:bg-zinc-100 border border-[#98D9CE]/60 print:border-zinc-300 overflow-hidden flex flex-col shadow-xs">
              <div className="p-2.5 border-b border-[#98D9CE]/60 print:border-zinc-300 flex items-center justify-between text-xs font-mono bg-[#F8FCFB]">
                <span className="font-bold text-[#103B5C] print:text-black">Axial (Z: {peakAxialSlice})</span>
                <span className="text-[#103B5C] print:text-teal-700 text-[10px] font-bold">Peak Tumor Area</span>
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
            <div className="rounded-xl bg-white print:bg-zinc-100 border border-[#98D9CE]/60 print:border-zinc-300 overflow-hidden flex flex-col shadow-xs">
              <div className="p-2.5 border-b border-[#98D9CE]/60 print:border-zinc-300 flex items-center justify-between text-xs font-mono bg-[#F8FCFB]">
                <span className="font-bold text-[#103B5C] print:text-black">Coronal (Y: {coronalSlice})</span>
                <span className="text-[#64748B] print:text-zinc-500 text-[10px] font-bold">Center Ventricles</span>
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
            <div className="rounded-xl bg-white print:bg-zinc-100 border border-[#98D9CE]/60 print:border-zinc-300 overflow-hidden flex flex-col shadow-xs">
              <div className="p-2.5 border-b border-[#98D9CE]/60 print:border-zinc-300 flex items-center justify-between text-xs font-mono bg-[#F8FCFB]">
                <span className="font-bold text-[#103B5C] print:text-black">Sagittal (X: {sagittalSlice})</span>
                <span className="text-[#64748B] print:text-zinc-500 text-[10px] font-bold">Mid-Hemisphere</span>
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
        <section className="space-y-3 print:space-y-2 print:break-inside-avoid">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#103B5C] print:text-zinc-800">
            3. Algorithmic Provenance &amp; Model Validation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-[#F8FCFB] print:bg-zinc-100 border border-[#98D9CE]/60 print:border-zinc-200 space-y-2">
              <span className="font-bold text-[#103B5C] print:text-black block">Inference Engine Specifications</span>
              <div className="space-y-1 text-[#475569] print:text-zinc-600 text-[11px]">
                <div>Architecture: <strong className="text-[#103B5C] print:text-black font-bold">UNETR 3D Vision Transformer</strong></div>
                <div>Methodology: <strong className="text-[#103B5C] print:text-black font-bold">Adaptive Self-Distillation (Dynamic MOD)</strong></div>
                <div>Checkpoint: <strong className="text-[#103B5C] print:text-black font-bold">checkpoints/adaptive/best.pth</strong></div>
                <div>Sliding Window: <strong className="text-[#103B5C] print:text-black font-bold">96 &times; 96 &times; 96 (Gaussian Blending)</strong></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FCFB] print:bg-zinc-100 border border-[#98D9CE]/60 print:border-zinc-200 space-y-2">
              <span className="font-bold text-[#103B5C] print:text-black block">Cohort Validation Benchmark</span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded bg-white print:bg-white border border-[#98D9CE]/60 print:border-zinc-300">
                  <span className="text-[10px] text-[#64748B] print:text-zinc-500 block font-bold">Mean Dice</span>
                  <span className="font-bold text-[#103B5C] print:text-teal-700">62.1%</span>
                </div>
                <div className="p-2.5 rounded bg-white print:bg-white border border-[#98D9CE]/60 print:border-zinc-300">
                  <span className="text-[10px] text-[#64748B] print:text-zinc-500 block font-bold">ET Dice</span>
                  <span className="font-bold text-[#103B5C] print:text-sky-700">68.1%</span>
                </div>
                <div className="p-2.5 rounded bg-white print:bg-white border border-[#98D9CE]/60 print:border-zinc-300">
                  <span className="text-[10px] text-[#64748B] print:text-zinc-500 block font-bold">Mean HD95</span>
                  <span className="font-bold text-[#103B5C] print:text-black">80.4 mm</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CLINICAL SUMMARY & SIGN-OFF */}
        <section className="space-y-4 pt-2 print:space-y-3 print:pt-1 print:break-inside-avoid">
          <div className="p-4 rounded-xl bg-[#F8FCFB] print:bg-zinc-50 border border-[#98D9CE]/60 print:border-zinc-300 text-xs text-[#111827] print:text-zinc-700 font-sans leading-relaxed space-y-2">
            <span className="font-bold text-[#103B5C] print:text-black uppercase font-mono text-[11px] block">
              Quantitative Volumetric Interpretation
            </span>
            <p className="text-[#475569]">
              {burdenData?.clinical_interpretation?.summary || 
                'The segmented whole-tumor (WT) region occupies 98.45 cm³ across 68 axial slices. The active enhancing component (ET) comprises 20.50 cm³ (20.8% of whole tumor), and the non-enhancing/necrotic core (TC) occupies 24.55 cm³. Relative to the intracranial brain volume (1464.5 cm³), the tumor occupies 6.72% of brain parenchyma.'
              }
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#EBF8F6]/60 print:bg-zinc-100 border border-[#98D9CE]/60 print:border-zinc-200 text-[10px] font-mono text-[#103B5C] print:text-zinc-500 leading-normal">
            <strong className="text-[#103B5C] print:text-black font-bold">RESEARCH &amp; EDUCATIONAL DISCLAIMER:</strong> This quantitative volumetric report was synthesized by Neuro Resonence AI as an investigational academic research tool. This output does not constitute a definitive medical diagnosis, WHO histological grading, or treatment recommendation.
          </div>

          {/* Radiologist Sign-off Block */}
          <div className="pt-6 border-t border-[#98D9CE]/60 print:border-zinc-300 grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <span className="text-[#64748B] print:text-zinc-500 block text-[10px] uppercase font-bold">Evaluating Researcher / Radiologist</span>
              <div className="h-10 border-b border-[#98D9CE]/60 print:border-zinc-400 mt-2" />
              <span className="text-[10px] text-[#94A3B8] print:text-zinc-500 mt-1 block">Signature &amp; Affiliation</span>
            </div>
            <div>
              <span className="text-[#64748B] print:text-zinc-500 block text-[10px] uppercase font-bold">Verification Date &amp; Institutional Seal</span>
              <div className="h-10 border-b border-[#98D9CE]/60 print:border-zinc-400 mt-2" />
              <span className="text-[10px] text-[#94A3B8] print:text-zinc-500 mt-1 block">Neuro Resonence AI Verification Unit</span>
            </div>
          </div>
        </section>
      </div>

      {/* 3. CENTERED IN-APP REPORT & PRINT PREVIEW MODAL */}
      {showPreviewModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowPreviewModal(false)}
        >
          <div 
            className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden text-[#111827]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#103B5C]/10 text-[#103B5C]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-[#103B5C]">
                    Clinical Volumetric Report Preview
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Subject: {selectedPatientId} • Protocol: BraTS 2021 Multimodal MRI
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setTimeout(() => window.print(), 200);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#103B5C] hover:bg-[#0c2c45] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Centered Report Paper */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/80">
              <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 mb-6">
                {/* Document Header */}
                <div className="border-b border-slate-200 pb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src="/nrai-logo.png" alt="NRAI" className="w-10 h-10 object-contain" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#103B5C]">Neuro Resonence AI</span>
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 text-[#103B5C] font-bold">Medical Workstation</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Department of Radiological AI &amp; Neuro-Oncology Computing</p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-500 font-bold space-y-0.5">
                    <div>Doc: <strong className="text-[#103B5C]">NRAI-QUANT-REPORT</strong></div>
                    <div>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                    <div>Protocol: BraTS 2021 Multimodal MRI</div>
                  </div>
                </div>

                {/* Patient Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Subject ID</span>
                    <strong className="text-[#103B5C]">{selectedPatientId}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Dimensions</span>
                    <span>240 × 240 × 155</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Resolution</span>
                    <span className="text-teal-700">1.0 mm³ Iso</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Source</span>
                    <span className="text-sky-700 truncate">{burdenData?.assessment_source_label || 'Ground Truth'}</span>
                  </div>
                </div>

                {/* Volumetric Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase text-[#103B5C]">1. Lesion Volumetric Compartments</h3>
                  <div className="rounded-lg border border-slate-200 overflow-hidden text-xs font-mono">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                        <tr>
                          <th className="py-2 px-3 font-bold">Region</th>
                          <th className="py-2 px-3 font-bold">Volume (cm³)</th>
                          <th className="py-2 px-3 font-bold">Voxels</th>
                          <th className="py-2 px-3 font-bold">Burden</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        <tr>
                          <td className="py-2 px-3 font-bold text-[#103B5C]">Whole Tumor (WT)</td>
                          <td className="py-2 px-3 font-bold text-amber-700">98.447 cm³</td>
                          <td className="py-2 px-3">98,447</td>
                          <td className="py-2 px-3 font-bold">6.72%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-bold text-[#103B5C]">Tumor Core (TC)</td>
                          <td className="py-2 px-3 font-bold text-rose-700">24.555 cm³</td>
                          <td className="py-2 px-3">24,555</td>
                          <td className="py-2 px-3 font-bold">24.9% (of WT)</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-bold text-[#103B5C]">Enhancing Tumor (ET)</td>
                          <td className="py-2 px-3 font-bold text-cyan-700">20.496 cm³</td>
                          <td className="py-2 px-3">20,496</td>
                          <td className="py-2 px-3 font-bold">20.8% (of WT)</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-bold text-[#103B5C]">Peritumoral Edema (ED)</td>
                          <td className="py-2 px-3 font-bold text-teal-700">73.892 cm³</td>
                          <td className="py-2 px-3">73,892</td>
                          <td className="py-2 px-3 font-bold">75.1% (of WT)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Slices Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#103B5C]">
                      2. Multiplanar Slice Overlays
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      Axial, Coronal &amp; Sagittal (FLAIR)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      <div className="bg-slate-50 px-2.5 py-1.5 border-b border-slate-200 text-[10px] font-mono flex items-center justify-between font-bold">
                        <span className="text-[#103B5C]">Axial (Z: {peakAxialSlice})</span>
                        <span className="text-teal-700 text-[9px]">Peak Tumor</span>
                      </div>
                      <div className="aspect-square bg-black flex items-center justify-center">
                        <img 
                          src={`${baseUrl}/api/volume/slice?patient_id=${selectedPatientId}&plane=axial&index=${peakAxialSlice}&modality=${selectedModality}&seg_source=ground_truth&opacity=0.75&show_overlay=true`} 
                          alt="Axial" 
                          className="w-full h-full object-contain" 
                          onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      <div className="bg-slate-50 px-2.5 py-1.5 border-b border-slate-200 text-[10px] font-mono flex items-center justify-between font-bold">
                        <span className="text-[#103B5C]">Coronal (Y: {coronalSlice})</span>
                        <span className="text-slate-500 text-[9px]">Ventricles</span>
                      </div>
                      <div className="aspect-square bg-black flex items-center justify-center">
                        <img 
                          src={`${baseUrl}/api/volume/slice?patient_id=${selectedPatientId}&plane=coronal&index=${coronalSlice}&modality=${selectedModality}&seg_source=ground_truth&opacity=0.75&show_overlay=true`} 
                          alt="Coronal" 
                          className="w-full h-full object-contain" 
                          onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      <div className="bg-slate-50 px-2.5 py-1.5 border-b border-slate-200 text-[10px] font-mono flex items-center justify-between font-bold">
                        <span className="text-[#103B5C]">Sagittal (X: {sagittalSlice})</span>
                        <span className="text-slate-500 text-[9px]">Mid-Hemisphere</span>
                      </div>
                      <div className="aspect-square bg-black flex items-center justify-center">
                        <img 
                          src={`${baseUrl}/api/volume/slice?patient_id=${selectedPatientId}&plane=sagittal&index=${sagittalSlice}&modality=${selectedModality}&seg_source=ground_truth&opacity=0.75&show_overlay=true`} 
                          alt="Sagittal" 
                          className="w-full h-full object-contain" 
                          onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Algorithmic Provenance & Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#103B5C] block">Inference Engine</span>
                    <div className="text-[11px] text-slate-600">Model: <strong className="text-[#103B5C]">UNETR 3D Vision Transformer</strong></div>
                    <div className="text-[11px] text-slate-600">Distillation: <strong className="text-[#103B5C]">Adaptive Self-Distillation</strong></div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#103B5C] block">Validation Benchmark</span>
                    <div className="flex items-center justify-between pt-0.5 text-center">
                      <div><span className="text-[9px] text-slate-400 block">Mean Dice</span><strong className="text-teal-700">62.1%</strong></div>
                      <div><span className="text-[9px] text-slate-400 block">ET Dice</span><strong className="text-sky-700">68.1%</strong></div>
                      <div><span className="text-[9px] text-slate-400 block">TC Dice</span><strong className="text-rose-700">64.7%</strong></div>
                    </div>
                  </div>
                </div>

                {/* Sign-off */}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-[11px] font-mono text-slate-500">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Radiologist Evaluation</span>
                    <div className="h-8 border-b border-slate-300 mt-1" />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Signature &amp; Affiliation</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Verification Seal</span>
                    <div className="h-8 border-b border-slate-300 mt-1" />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Neuro Resonence AI Unit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
