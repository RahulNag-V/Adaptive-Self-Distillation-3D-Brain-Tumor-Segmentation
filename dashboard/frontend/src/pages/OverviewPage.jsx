import React from 'react';
import { 
  UploadCloud, 
  Box, 
  Layers, 
  Sliders, 
  Cpu, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Database,
  Eye,
  Image as ImageIcon
} from 'lucide-react';

export default function OverviewPage({ onNavigate }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-10">
      {/* HERO SECTION */}
      <section className="relative rounded-2xl bg-gradient-to-b from-medical-card to-medical-base border border-medical-border/90 p-6 sm:p-10 lg:p-12 overflow-hidden shadow-xl shadow-black/40">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-medical-teal/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-medical-blue/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-teal/15 border border-medical-teal/30 text-medical-tealLight text-xs font-mono tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-medical-teal" />
            <span>RESEARCH PLATFORM • MONAI 3D ENGINE</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              NeuroSeg <span className="text-medical-teal">3D</span>
            </h1>
            <p className="text-xl sm:text-2xl text-medical-muted font-medium">
              Adaptive AI-powered 3D Brain Tumor Segmentation
            </p>
          </div>

          <p className="text-sm sm:text-base text-medical-muted/90 leading-relaxed max-w-2xl font-light">
            Upload multimodal MRI data and generate an interactive 3D tumor segmentation
            using the trained Adaptive Self-Distillation framework. Visualizes sub-regions
            in volumetric WebGL and synchronized orthogonal multi-planar slices.
          </p>

          {/* Action CTAs: Open 3D Segmentation & Open 2D Classification */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-medical-teal hover:bg-medical-tealLight text-medical-darkest font-semibold text-sm transition-all shadow-md shadow-medical-teal/20 hover:shadow-lg hover:shadow-medical-teal/30"
            >
              <Box className="w-4 h-4" />
              <span>Open 3D Segmentation</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={() => onNavigate('classify')}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-teal/40 hover:border-medical-teal text-medical-tealLight font-semibold text-sm transition-all shadow-md shadow-black/20"
            >
              <ImageIcon className="w-4 h-4 text-medical-teal" />
              <span>Open 2D Classification</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </section>

      {/* TWO PRIMARY CAPABILITY CARDS */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold">
          Platform Capabilities & Modalities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: 3D Segmentation */}
          <div className="p-6 rounded-2xl bg-medical-card border border-medical-border/90 hover:border-medical-teal/50 transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-medical-teal/15 border border-medical-teal/30 flex items-center justify-center text-medical-tealLight">
                  <Box className="w-5 h-5 text-medical-teal" />
                </div>
                <span className="px-2.5 py-1 rounded bg-medical-surface border border-medical-border text-[11px] font-mono text-medical-teal">
                  Adaptive UNETR
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                3D Segmentation
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-medical-muted font-mono uppercase text-[10px] w-16 shrink-0 mt-0.5">Upload:</span>
                  <span className="font-mono text-medical-cyanLight font-medium">FLAIR + T1 + T1ce + T2 NIfTI</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-medical-muted font-mono uppercase text-[10px] w-16 shrink-0 mt-0.5">Produces:</span>
                  <span className="text-medical-text">3D tumor sub-region segmentation (WT, TC, ET)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('upload')}
              className="w-full py-2.5 px-4 rounded-lg bg-medical-surface hover:bg-medical-teal hover:text-medical-darkest text-white border border-medical-border font-medium text-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Open 3D Segmentation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: 2D Classification */}
          <div className="p-6 rounded-2xl bg-medical-card border border-medical-border/90 hover:border-medical-cyan/50 transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-medical-cyan/15 border border-medical-cyan/30 flex items-center justify-center text-medical-cyanLight">
                  <ImageIcon className="w-5 h-5 text-medical-cyan" />
                </div>
                <span className="px-2.5 py-1 rounded bg-medical-surface border border-medical-border text-[11px] font-mono text-medical-cyan">
                  EfficientNet-B0
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                2D Classification
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-medical-muted font-mono uppercase text-[10px] w-16 shrink-0 mt-0.5">Upload:</span>
                  <span className="font-mono text-medical-cyanLight font-medium">JPG / JPEG / PNG</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-medical-muted font-mono uppercase text-[10px] w-16 shrink-0 mt-0.5">Produces:</span>
                  <span className="text-medical-text">Image-level class prediction (Glioma, Meningioma, No Tumor, Pituitary)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('classify')}
              className="w-full py-2.5 px-4 rounded-lg bg-medical-surface hover:bg-medical-cyan hover:text-medical-darkest text-white border border-medical-border font-medium text-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Open 2D Classification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* MODEL ARCHITECTURE SPECIFICATION CARD */}
      <section className="p-6 sm:p-8 rounded-xl bg-medical-base border border-medical-border/90 space-y-6">
        <div className="flex items-center justify-between border-b border-medical-border/70 pb-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-medical-teal" />
            <h2 className="text-base font-semibold text-white">
              Model Specification & Architecture
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-medical-surface border border-medical-border text-medical-muted">
            Experimental Setup
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-medical-muted font-mono uppercase tracking-wider">Model</div>
            <div className="font-semibold text-white">Adaptive Self-Distillation</div>
            <div className="text-[11px] text-medical-muted">EMA loss-ratio balancing</div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-medical-muted font-mono uppercase tracking-wider">Architecture</div>
            <div className="font-semibold text-white">UNETR</div>
            <div className="text-[11px] text-medical-muted">Vision Transformer + U-Net</div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-medical-muted font-mono uppercase tracking-wider">Framework</div>
            <div className="font-semibold text-white">PyTorch + MONAI</div>
            <div className="text-[11px] text-medical-muted">CUDA FP16 Accelerated</div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-medical-muted font-mono uppercase tracking-wider">Inference</div>
            <div className="font-semibold text-white">3D MRI Segmentation</div>
            <div className="text-[11px] text-medical-muted">96³ Sliding Window (0.25 overlap)</div>
          </div>
        </div>
      </section>

      {/* ACADEMIC DISCLAIMER NOTICE */}
      <div className="p-4 rounded-lg bg-medical-card/40 border border-medical-border/60 flex items-start gap-3 text-xs text-medical-muted">
        <ShieldCheck className="w-4 h-4 text-medical-teal shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-white">Research Protocol Notice:</span> This application represents an educational research implementation for validating multi-objective self-distillation algorithms. Not certified for clinical diagnosis or therapeutic decision-making.
        </p>
      </div>
    </div>
  );
}
