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
  FileCheck
} from 'lucide-react';

export default function OverviewPage({ onNavigate }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. CLINICAL WORKSPACE HEADER PANEL */}
      <section className="rounded-xl bg-medical-base border border-medical-border p-6 lg:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5 max-w-3xl">
            <img
              src="/logo-circle.png"
              alt="NeuroVision AI Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0 shadow-xl ring-2 ring-medical-teal/40 hidden sm:block"
            />
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-medical-card border border-medical-border text-[11px] font-mono text-medical-teal">
                <span className="w-2 h-2 rounded-full bg-medical-teal animate-pulse" />
                <span>RESEARCH PLATFORM • MONAI 3D ENGINE • FP16 ACTIVE</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                NeuroVision AI Diagnostic & Research Workstation
              </h1>

              <p className="text-sm text-medical-muted leading-relaxed">
                Multi-modal 3D brain tumor segmentation and sub-region volumetric analysis powered by 
                Adaptive Self-Distillation and UNETR. Integrates synchronized orthogonal multi-planar reconstruction (MPR), 
                interactive human-in-the-loop (HITL) boundary correction, and 2D histological classification.
              </p>
            </div>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-medical-teal hover:bg-medical-tealLight text-medical-darkest font-semibold text-xs transition-colors shadow-sm"
            >
              <Box className="w-4 h-4" />
              <span>Launch 3D Segmentation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('classify')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-border text-white hover:text-medical-tealLight font-medium text-xs transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-medical-cyan" />
              <span>Launch 2D Classifier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. THREE PRIMARY WORKFLOW MODULES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold">
            Operational Workstation Modules
          </h2>
          <span className="text-[11px] font-mono text-medical-muted">3 Integrated Pipelines</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Module 1: 3D Multiplanar Segmentation */}
          <div className="p-5 rounded-xl bg-medical-card border border-medical-border hover:border-medical-teal/60 transition-colors flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-medical-teal/15 border border-medical-teal/30 flex items-center justify-center text-medical-teal">
                  <Box className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded bg-medical-surface border border-medical-border text-[10px] font-mono text-medical-teal font-semibold">
                  UNETR ViT
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  3D Volumetric Segmentation
                </h3>
                <p className="text-xs text-medical-muted mt-1 leading-relaxed">
                  Volumetric inference across 4 co-registered MRI sequences (FLAIR, T1, T1ce, T2) or volumetric CT.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-medical-base border border-medical-border/70 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Input:</span>
                  <span className="text-white">4-Channel NIfTI (.nii.gz)</span>
                </div>
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Output:</span>
                  <span className="text-emerald-400">WT • TC • ET Masks</span>
                </div>
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Reconstruction:</span>
                  <span className="text-medical-cyan">Quad Synchronized MPR</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('viewer')}
              className="w-full py-2 px-3 rounded-lg bg-medical-surface hover:bg-medical-teal hover:text-medical-darkest text-white border border-medical-border font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Open 3D Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module 2: Continual Distillation & Review */}
          <div className="p-5 rounded-xl bg-medical-card border border-medical-border hover:border-medical-teal/60 transition-colors flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded bg-medical-surface border border-medical-border text-[10px] font-mono text-amber-400 font-semibold">
                  HITL Engine
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Human-in-the-Loop & Continual Learning
                </h3>
                <p className="text-xs text-medical-muted mt-1 leading-relaxed">
                  Radiologist boundary refinement with versioned annotation records, supervisory review, and EMA distillation fine-tuning.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-medical-base border border-medical-border/70 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Correction:</span>
                  <span className="text-white">Orthogonal Brush & Eraser</span>
                </div>
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Lifecycle:</span>
                  <span className="text-amber-300">Draft → Review → Ingest</span>
                </div>
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Candidates:</span>
                  <span className="text-medical-teal">Evaluation & Promotion Gate</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('adaptive')}
              className="w-full py-2 px-3 rounded-lg bg-medical-surface hover:bg-medical-teal hover:text-medical-darkest text-white border border-medical-border font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module 3: 2D Pathology MRI Classifier */}
          <div className="p-5 rounded-xl bg-medical-card border border-medical-border hover:border-medical-cyan/60 transition-colors flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-medical-cyan/15 border border-medical-cyan/30 flex items-center justify-center text-medical-cyan">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded bg-medical-surface border border-medical-border text-[10px] font-mono text-medical-cyan font-semibold">
                  EfficientNet-B0
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  2D MRI Slice Classification
                </h3>
                <p className="text-xs text-medical-muted mt-1 leading-relaxed">
                  Single-slice histopathological classification with confidence scoring across 4 diagnostic classes.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-medical-base border border-medical-border/70 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Input:</span>
                  <span className="text-white">PNG / JPEG MRI Slice</span>
                </div>
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Classes:</span>
                  <span className="text-medical-cyan">Glioma, Meningioma, Pituitary, Normal</span>
                </div>
                <div className="flex items-center justify-between text-medical-muted">
                  <span>Latency:</span>
                  <span className="text-emerald-400">~28ms / slice (GPU)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('classify')}
              className="w-full py-2 px-3 rounded-lg bg-medical-surface hover:bg-medical-cyan hover:text-medical-darkest text-white border border-medical-border font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Open 2D Classifier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. TECHNICAL SPECIFICATIONS & SYSTEM MATRIX */}
      <section className="p-5 sm:p-6 rounded-xl bg-medical-base border border-medical-border space-y-4">
        <div className="flex items-center justify-between border-b border-medical-border/70 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-medical-teal" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              System Specification & Benchmark Environment
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-medical-card border border-medical-border text-medical-muted">
            Protocol: BraTS 2021
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-medical-card border border-medical-border/60 space-y-1">
            <span className="text-[10px] text-medical-muted uppercase block">Architecture</span>
            <div className="font-semibold text-white">UNETR 3D (ViT-B/16)</div>
            <div className="text-[10px] text-medical-muted font-sans">16³ patch embeddings</div>
          </div>

          <div className="p-3 rounded-lg bg-medical-card border border-medical-border/60 space-y-1">
            <span className="text-[10px] text-medical-muted uppercase block">Loss Formulation</span>
            <div className="font-semibold text-white">Adaptive EMA Distill</div>
            <div className="text-[10px] text-medical-muted font-sans">Dynamic gradient alignment</div>
          </div>

          <div className="p-3 rounded-lg bg-medical-card border border-medical-border/60 space-y-1">
            <span className="text-[10px] text-medical-muted uppercase block">Sliding Window</span>
            <div className="font-semibold text-white">96 × 96 × 96</div>
            <div className="text-[10px] text-medical-muted font-sans">0.25 overlap, gaussian blend</div>
          </div>

          <div className="p-3 rounded-lg bg-medical-card border border-medical-border/60 space-y-1">
            <span className="text-[10px] text-medical-muted uppercase block">Compute Acceleration</span>
            <div className="font-semibold text-white">PyTorch 2.11 + CUDA</div>
            <div className="text-[10px] text-emerald-400 font-sans">FP16 Automatic Mixed Prec</div>
          </div>
        </div>
      </section>

      {/* 4. RESEARCH PROTOCOL NOTICE */}
      <div className="p-3.5 rounded-lg bg-medical-card/40 border border-medical-border/60 flex items-start gap-3 text-xs text-medical-muted">
        <ShieldCheck className="w-4 h-4 text-medical-teal shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white font-medium">Research Protocol Notice:</strong> This software is an investigational medical AI platform developed for academic algorithm validation and multi-objective self-distillation benchmarking. For research and educational evaluation only.
        </p>
      </div>
    </div>
  );
}
