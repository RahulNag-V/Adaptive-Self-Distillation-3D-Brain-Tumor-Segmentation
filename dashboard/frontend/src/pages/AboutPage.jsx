import React from 'react';
import { 
  ShieldAlert, 
  Info, 
  Cpu, 
  Database, 
  Brain, 
  Layers, 
  FileCode,
  FlaskConical,
  BookOpen
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="space-y-3 border-b border-medical-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-card border border-medical-border text-xs font-mono text-medical-muted">
          <FlaskConical className="w-3.5 h-3.5 text-medical-teal" />
          <span>RESEARCH & METHODOLOGY</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          About NeuroVision AI
        </h1>
        <p className="text-sm text-medical-muted leading-relaxed">
          NeuroVision AI is an academic research platform for 3D brain tumor segmentation
          using an Adaptive Self-Distillation framework.
        </p>
      </div>

      {/* CORE SPECIFICATIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-2 text-medical-teal text-xs font-mono uppercase tracking-wider font-semibold">
            <Cpu className="w-4 h-4" />
            <span>Research Model</span>
          </div>
          <div className="text-base font-semibold text-white">
            Adaptive Self-Distillation
          </div>
          <p className="text-xs text-medical-muted leading-relaxed">
            Multi-objective self-distillation with dynamic EMA loss-ratio balancing across online token classification and dense feature prediction.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-2 text-medical-blueLight text-xs font-mono uppercase tracking-wider font-semibold">
            <Layers className="w-4 h-4" />
            <span>Base Architecture</span>
          </div>
          <div className="text-base font-semibold text-white">
            UNETR (UNet Transformers)
          </div>
          <p className="text-xs text-medical-muted leading-relaxed">
            Vision Transformer (ViT) encoder utilizing 16³ patch embeddings combined with deconvolutional multi-scale decoder skip connections.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-2 text-medical-cyan text-xs font-mono uppercase tracking-wider font-semibold">
            <FileCode className="w-4 h-4" />
            <span>Framework</span>
          </div>
          <div className="text-base font-semibold text-white">
            PyTorch + MONAI
          </div>
          <p className="text-xs text-medical-muted leading-relaxed">
            Built on Medical Open Network for AI (MONAI 1.6) with PyTorch 2.11 FP16 mixed precision acceleration.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider font-semibold">
            <Database className="w-4 h-4" />
            <span>Dataset</span>
          </div>
          <div className="text-base font-semibold text-white">
            BraTS 2021 Reference Dataset
          </div>
          <p className="text-xs text-medical-muted leading-relaxed">
            Multi-institutional glioma MRI cohort evaluated under deterministic fixed splits (40 train / 10 validation).
          </p>
        </div>
      </div>

      {/* METHODOLOGY EXPLANATION */}
      <div className="p-6 rounded-xl bg-medical-base border border-medical-border space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-medical-teal" />
          <span>Scientific Background</span>
        </h2>
        <div className="text-xs text-medical-muted space-y-3 leading-relaxed">
          <p>
            3D Brain tumor segmentation requires precise structural differentiation between heterogeneous tissue compartments: non-enhancing solid core, necrotic core, peritumoral vasogenic edema, and contrast-enhancing tumor margins.
          </p>
          <p>
            Standard multi-objective distillation often suffers from negative gradient interference when auxiliary losses (masked patch classification and dense voxel reconstruction) are weighted equally. NeuroVision AI implements dynamic EMA loss-ratio balancing that adjusts loss coefficients once per epoch to align the auxiliary gradients with primary segmentation objectives.
          </p>
        </div>
      </div>

      {/* MANDATORY MEDICAL / REGULATORY DISCLAIMER */}
      <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-500/50 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Mandatory Research Disclaimer</span>
        </div>
        <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
          "For research and educational purposes only. This system is not a medical diagnostic tool."
        </p>
        <p className="text-[11px] text-medical-muted leading-relaxed">
          This software has not been evaluated, cleared, or approved by the United States Food and Drug Administration (FDA), European Medicines Agency (EMA), or any other regulatory health authority. The segmentation predictions produced by this software must not be used for diagnosis, clinical staging, prognosis, surgical navigation, treatment planning, or any medical decision-making.
        </p>
      </div>
    </div>
  );
}
