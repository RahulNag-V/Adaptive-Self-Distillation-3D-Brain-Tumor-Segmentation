import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Info, 
  Cpu, 
  Database, 
  Brain, 
  Layers, 
  FileCode,
  FlaskConical,
  BookOpen,
  Award,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function AboutPage({ onNavigate }) {
  const [activeFaq, setActiveFaq] = useState(0);

  const VIVA_QUESTIONS = [
    {
      q: "What is the core problem addressed by this project?",
      a: "Accurate multi-compartment 3D brain tumor segmentation from multi-modal MRI (FLAIR, T1, T1ce, T2). Standard models struggle with fine enhancing tumor (ET) margins and suffer from gradient competition between large edema regions and small hyper-intense lesions."
    },
    {
      q: "Why UNETR instead of standard 3D U-Net?",
      a: "UNETR replaces the CNN encoder with a pure Vision Transformer (ViT-B/16). The self-attention mechanism captures global long-range contextual dependencies across the entire 3D volume (96x96x96 ROI) before projecting representations through multi-scale deconvolutional decoders with skip connections."
    },
    {
      q: "What is the novel contribution: Adaptive Self-Distillation?",
      a: "Instead of fixed loss coefficients, our framework introduces dynamic Exponential Moving Average (EMA) loss balancing across dual auxiliary branches: an Online Tokenizer (semantic cosine alignment) and a Dense Predictor (spatial feature alignment). This modulates weights lambda_ot (1.0 -> 2.0) and lambda_dp (1.0 -> 1.58) over training epochs to prevent gradient collapse."
    },
    {
      q: "What are the empirical benchmark achievements on BraTS 2021?",
      a: "Enhancing Tumor (ET) Dice increased from 0.6615 (Baseline UNETR) to 0.7454 (Online Tokenizer distillation) — a +12.7% relative improvement. The 95th Percentile Hausdorff Distance (HD95) tightened from 83.21mm down to 77.48mm, demonstrating superior clinical boundary alignment."
    },
    {
      q: "How is the clinical workflow completed beyond raw inference?",
      a: "NeuroVision AI provides a full diagnostic workstation: Quad synchronized MPR (Axial, Coronal, Sagittal), 3D surface mesh generation via Marching Cubes, quantitative volumetric burden calculation in cm³, human-in-the-loop (HITL) active annotation refinement, hands-free voice control, and print-ready clinical research reports."
    }
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-medical-border pb-6">
        <img
          src="/logo-circle.png"
          alt="NeuroVision AI Logo"
          className="w-20 h-20 rounded-full object-cover shrink-0 shadow-2xl ring-2 ring-medical-teal/40"
        />
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-card border border-medical-border text-xs font-mono text-medical-teal">
            <FlaskConical className="w-3.5 h-3.5 text-medical-teal" />
            <span>ACADEMIC RESEARCH & VIVA DEFENSE GUIDE</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            About NeuroVision AI
          </h1>
          <p className="text-sm text-medical-muted leading-relaxed">
            Adaptive Self-Distillation Framework for 3D Brain Tumor Segmentation on Multimodal MRI.
            AI For A Healthier Tomorrow.
          </p>
        </div>
      </div>

      {/* 2. CORE SPECIFICATIONS MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-2 text-medical-teal text-xs font-mono uppercase tracking-wider font-semibold">
            <Cpu className="w-4 h-4" />
            <span>Research Model</span>
          </div>
          <div className="text-sm font-semibold text-white">
            Adaptive Self-Distillation
          </div>
          <p className="text-[11px] text-medical-muted leading-relaxed">
            Multi-objective self-distillation with dynamic EMA loss-ratio balancing across dual auxiliary heads.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-2 text-medical-cyan text-xs font-mono uppercase tracking-wider font-semibold">
            <Layers className="w-4 h-4" />
            <span>Base Architecture</span>
          </div>
          <div className="text-sm font-semibold text-white">
            MONAI UNETR (ViT-B/16)
          </div>
          <p className="text-[11px] text-medical-muted leading-relaxed">
            Vision Transformer encoder with 16³ patch embeddings (768 hidden dim, 12 layers) and CNN decoder.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider font-semibold">
            <FileCode className="w-4 h-4" />
            <span>Compute Platform</span>
          </div>
          <div className="text-sm font-semibold text-white">
            PyTorch 2.11 + CUDA
          </div>
          <p className="text-[11px] text-medical-muted leading-relaxed">
            FP16 mixed precision acceleration, 96³ sliding-window inference with Gaussian blending.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-medical-card border border-medical-border space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider font-semibold">
            <Database className="w-4 h-4" />
            <span>Cohort Benchmark</span>
          </div>
          <div className="text-sm font-semibold text-white">
            BraTS 2021 Dataset
          </div>
          <p className="text-[11px] text-medical-muted leading-relaxed">
            50-Subject verified cohort (40 train / 10 val), evaluated across WT, TC, and ET compartments.
          </p>
        </div>
      </div>

      {/* 3. VIVA & ACADEMIC EVALUATION DEFENSE GUIDE */}
      <section className="p-6 rounded-xl bg-medical-base border border-medical-border space-y-4">
        <div className="flex items-center justify-between border-b border-medical-border pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-medical-teal" />
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
              Academic Viva Defense & Examiner Key Questions
            </h2>
          </div>
          <span className="text-[10px] font-mono text-medical-muted">
            5 Core Assessment Pillars
          </span>
        </div>

        <div className="space-y-3">
          {VIVA_QUESTIONS.map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx}
                className="rounded-xl bg-medical-card border border-medical-border overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? -1 : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-semibold text-white hover:text-medical-tealLight transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-medical-teal/15 text-medical-teal text-[10px] font-mono flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{item.q}</span>
                  </span>
                  <ArrowRight className={`w-4 h-4 text-medical-muted shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-medical-border/60 text-xs text-medical-muted leading-relaxed font-sans">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. WORKSTATION NAVIGATOR */}
      <div className="p-6 rounded-xl bg-medical-base border border-medical-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Ready to inspect experimental benchmarks?</h3>
          <p className="text-xs text-medical-muted mt-0.5">
            View the live model comparison matrix or explore training loss curves.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate && onNavigate('models')}
            className="px-3.5 py-2 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-border text-white text-xs font-mono transition-colors"
          >
            Model Lab
          </button>
          <button
            onClick={() => onNavigate && onNavigate('viewer')}
            className="px-3.5 py-2 rounded-lg bg-medical-teal hover:bg-medical-tealLight text-medical-darkest text-xs font-semibold shadow-sm transition-all"
          >
            Open 3D Viewer
          </button>
        </div>
      </div>

      {/* 5. MANDATORY REGULATORY RESEARCH DISCLAIMER */}
      <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-500/50 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Mandatory Research & Educational Disclaimer</span>
        </div>
        <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
          "For research and educational purposes only. This system is not a medical diagnostic tool."
        </p>
        <p className="text-[11px] text-medical-muted leading-relaxed font-mono">
          This software has not been evaluated, cleared, or approved by the FDA, EMA, or any regulatory medical device authority. All predictions, segmentations, and volumetric estimates are intended purely for academic and algorithmic investigation.
        </p>
      </div>
    </div>
  );
}
