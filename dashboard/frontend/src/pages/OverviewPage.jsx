import React from 'react';
import { 
  Box, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  ArrowRight, 
  Database, 
  Image as ImageIcon, 
  Activity, 
  GitCommit, 
  Sparkles, 
  CheckCircle2, 
  Sliders, 
  FileCheck,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function OverviewPage({ onNavigate }) {
  return (
    <div className="min-h-full bg-gradient-to-b from-[#F7FAFC] via-[#EAF4FF] to-[#E5F7FA] p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      {/* 1. CLINICAL HERO PANEL */}
      <section className="rounded-2xl bg-white/90 backdrop-blur-xs border border-[#DCE6F0] p-6 lg:p-8 shadow-medical-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-6 max-w-3xl">
            <img
              src="/logo-circle.png"
              alt="NeuroVision AI Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0 shadow-medical-md ring-2 ring-[#2563EB]/25 hidden sm:block"
            />
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3EEFF] border border-[#BFDBFE] text-xs font-mono text-[#2563EB]">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                <span className="font-semibold">RESEARCH WORKSTATION • MONAI 3D ENGINE • FP16</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#16324F] leading-tight">
                NeuroVision AI Diagnostic & Research Platform
              </h1>

              <p className="text-sm text-[#64748B] leading-relaxed">
                Multi-modal 3D brain tumor segmentation and sub-region volumetric analysis powered by 
                Adaptive Self-Distillation and UNETR. Integrates synchronized orthogonal multi-planar reconstruction (MPR), 
                interactive human-in-the-loop (HITL) boundary refinement, and contactless clinical interaction.
              </p>
            </div>
          </div>

          {/* Primary Quick Launch Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => onNavigate('viewer')}
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-all shadow-medical-sm hover:shadow-medical-md active:scale-[0.99]"
            >
              <Box className="w-4 h-4" />
              <span>Launch 3D Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('models')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-[#16324F] font-medium text-xs transition-colors shadow-2xs"
            >
              <Cpu className="w-4 h-4 text-[#2563EB]" />
              <span>Explore Model Lab</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#64748B]" />
            </button>
          </div>
        </div>

        {/* Quick Highlights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-[#DCE6F0]/70 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#EEF4F8]/80 border border-[#DCE6F0] flex items-center justify-between">
            <span className="text-[#64748B]">Enhancing Tumor (ET) Dice:</span>
            <span className="font-bold text-[#16866A]">+12.7% (0.7454)</span>
          </div>
          <div className="p-3 rounded-xl bg-[#EEF4F8]/80 border border-[#DCE6F0] flex items-center justify-between">
            <span className="text-[#64748B]">Boundary Error Reduction:</span>
            <span className="font-bold text-[#2563EB]">-5.73 mm HD95</span>
          </div>
          <div className="p-3 rounded-xl bg-[#EEF4F8]/80 border border-[#DCE6F0] flex items-center justify-between">
            <span className="text-[#64748B]">Benchmark Dataset:</span>
            <span className="font-bold text-[#16324F]">BraTS 2021 Cohort</span>
          </div>
        </div>
      </section>

      {/* 2. OPERATIONAL WORKSTATION MODULES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-bold">
            Operational Clinical Pipelines
          </h2>
          <span className="text-[11px] font-mono text-[#64748B]">3 Core Clinical Modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Module 1: 3D Multiplanar Segmentation */}
          <div className="p-6 rounded-2xl bg-white border border-[#DCE6F0] hover:border-[#2563EB]/50 hover:shadow-medical-md transition-all flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#E3EEFF] text-[#2563EB] flex items-center justify-center">
                  <Box className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EEF4F8] border border-[#DCE6F0] text-[10px] font-mono text-[#2563EB] font-bold">
                  UNETR ViT
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#16324F] tracking-tight">
                  3D Volumetric Segmentation
                </h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Volumetric sliding-window inference across 4 co-registered MRI sequences (FLAIR, T1, T1ce, T2).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#EEF4F8] border border-[#DCE6F0]/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Input:</span>
                  <span className="text-[#16324F] font-medium">4-Channel NIfTI (.nii.gz)</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Output:</span>
                  <span className="text-[#16866A] font-semibold">WT • TC • ET Masks</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Reconstruction:</span>
                  <span className="text-[#2563EB] font-medium">Quad Synchronized MPR</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('viewer')}
              className="w-full py-2.5 px-3 rounded-xl bg-[#EEF4F8] hover:bg-[#2563EB] hover:text-white text-[#16324F] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Open 3D Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module 2: Model Lab & Comparative Benchmarks */}
          <div className="p-6 rounded-2xl bg-white border border-[#DCE6F0] hover:border-[#2563EB]/50 hover:shadow-medical-md transition-all flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#E3EEFF] text-[#2563EB] flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5E9] border border-[#C8E6C9] text-[10px] font-mono text-[#16866A] font-bold">
                  +12.7% ET Dice
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#16324F] tracking-tight">
                  Academic Model Lab
                </h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Real empirical comparison: Baseline UNETR vs Online Tokenizer, Dense Predictor, and Adaptive MOD.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#EEF4F8] border border-[#DCE6F0]/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Cohort:</span>
                  <span className="text-[#16324F] font-medium">BraTS 2021 Benchmark</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>ET Dice:</span>
                  <span className="text-[#16866A] font-bold">0.7454 (Tokenizer)</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>HD95 Error:</span>
                  <span className="text-[#06B6D4] font-semibold">77.48 mm (-5.73mm)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('models')}
              className="w-full py-2.5 px-3 rounded-xl bg-[#EEF4F8] hover:bg-[#2563EB] hover:text-white text-[#16324F] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Explore Model Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module 3: Quantitative Reports & Volumetrics */}
          <div className="p-6 rounded-2xl bg-white border border-[#DCE6F0] hover:border-[#06B6D4]/50 hover:shadow-medical-md transition-all flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#E0F7FA] text-[#0891B2] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E0F7FA] border border-[#B2EBF2] text-[10px] font-mono text-[#0891B2] font-bold">
                  Print to PDF
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#16324F] tracking-tight">
                  Clinical Volumetric Reports
                </h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Export comprehensive clinical and research reports with sub-compartment volumes (cm³) and slice previews.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#EEF4F8] border border-[#DCE6F0]/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Quantitation:</span>
                  <span className="text-[#16324F] font-medium">WT • TC • ET (cm³)</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Snapshots:</span>
                  <span className="text-[#0891B2] font-medium">Axial, Coronal, Sagittal</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Validation:</span>
                  <span className="text-[#16866A] font-semibold">Cohort Ground Truth</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('reports')}
              className="w-full py-2.5 px-3 rounded-xl bg-[#EEF4F8] hover:bg-[#06B6D4] hover:text-white text-[#16324F] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Generate Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. TECHNICAL SPECIFICATIONS & SYSTEM MATRIX */}
      <section className="p-6 rounded-2xl bg-white border border-[#DCE6F0] shadow-medical-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#DCE6F0] pb-3.5">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#16324F]">
              System Specification & Benchmark Environment
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#EEF4F8] border border-[#DCE6F0] text-[#64748B]">
            Protocol: BraTS 2021
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#EEF4F8]/70 border border-[#DCE6F0] space-y-1">
            <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Architecture</span>
            <div className="font-bold text-[#16324F]">UNETR 3D (ViT-B/16)</div>
            <div className="text-[10px] text-[#64748B] font-sans">16³ patch embeddings</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EEF4F8]/70 border border-[#DCE6F0] space-y-1">
            <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Loss Formulation</span>
            <div className="font-bold text-[#16324F]">Adaptive EMA Distill</div>
            <div className="text-[10px] text-[#64748B] font-sans">Dynamic gradient alignment</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EEF4F8]/70 border border-[#DCE6F0] space-y-1">
            <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Sliding Window</span>
            <div className="font-bold text-[#16324F]">96 × 96 × 96</div>
            <div className="text-[10px] text-[#64748B] font-sans">0.25 overlap, gaussian blend</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EEF4F8]/70 border border-[#DCE6F0] space-y-1">
            <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Acceleration</span>
            <div className="font-bold text-[#16866A]">PyTorch 2.11 + CUDA</div>
            <div className="text-[10px] text-[#64748B] font-sans">FP16 Automatic Mixed Prec</div>
          </div>
        </div>
      </section>

      {/* 4. RESEARCH PROTOCOL NOTICE */}
      <div className="p-4 rounded-xl bg-[#EEF4F8] border border-[#DCE6F0] flex items-start gap-3 text-xs text-[#64748B]">
        <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#16324F] font-semibold">Research Protocol Notice:</strong> This software is an investigational medical AI platform developed for academic algorithm validation and multi-objective self-distillation benchmarking. For research and educational evaluation only.
        </p>
      </div>
    </div>
  );
}
