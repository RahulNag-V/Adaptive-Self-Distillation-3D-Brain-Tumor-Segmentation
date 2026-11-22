import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useVoice } from '../voice/VoiceContext';
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
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { gsap, prefersReducedMotion, MOTION } from '../utils/motion';

export default function AboutPage({ onNavigate }) {
  const [activeFaq, setActiveFaq] = useState(0);
  const { registerPageActionHandler } = useVoice();
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !containerRef.current) return;

    let ctx;
    try {
      ctx = gsap.context(() => {
        gsap.fromTo(
          '.about-spec-card',
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: MOTION.durations.normal,
            stagger: 0.08,
            ease: MOTION.easings.out,
            clearProps: 'all',
          }
        );

        gsap.fromTo(
          '.about-viva-panel',
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: MOTION.durations.slow,
            ease: MOTION.easings.out,
            clearProps: 'all',
            scrollTrigger: {
              trigger: '.about-viva-panel',
              scroller: '#neurovision-main-scroll',
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        );
      }, containerRef);

      if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.refresh) {
            ScrollTrigger.refresh();
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('AboutPage GSAP initialization fallback:', err);
    }

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  useEffect(() => {
    if (!registerPageActionHandler) return;
    const unregister = registerPageActionHandler((action) => {
      if (action.type === 'EXPAND_VIVA_QUESTION') {
        setActiveFaq((prev) => (prev + 1) % 5);
      }
    });
    return unregister;
  }, [registerPageActionHandler]);

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
      a: "Neuro Resonence AI provides a full diagnostic workstation: Quad synchronized MPR (Axial, Coronal, Sagittal), 3D surface mesh generation via Marching Cubes, quantitative volumetric burden calculation in cm³, human-in-the-loop (HITL) active annotation refinement, hands-free voice control, and print-ready clinical research reports."
    }
  ];

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans animate-fadeIn text-[#000000]">
      {/* 1. HEADER */}
      <section className="card-transparent rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-b border-[#111111]/20 pb-6">
          <img
            src="/nrai-logo.png"
            alt="Neuro Resonence AI Logo"
            className="w-20 h-20 object-contain shrink-0 filter drop-shadow-sm hover:scale-105 transition-transform duration-300"
          />
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-[#111111] text-xs font-mono font-bold text-[#111111] shadow-xs">
              <FlaskConical className="w-3.5 h-3.5 text-[#103B5C]" />
              <span>ACADEMIC RESEARCH &amp; VIVA DEFENSE GUIDE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              About Neuro Resonence AI
            </h1>
            <p className="text-sm text-[#25313D] leading-relaxed">
              Adaptive Self-Distillation Framework for 3D Brain Tumor Segmentation on Multimodal MRI.
              AI For A Healthier Tomorrow.
            </p>
          </div>
        </div>
      </section>

      {/* 2. CORE SPECIFICATIONS MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="about-spec-card card-transparent-interactive p-5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-[#103B5C] text-xs font-mono uppercase tracking-wider font-bold">
            <Cpu className="w-4 h-4 text-[#399DBA]" />
            <span>Research Model</span>
          </div>
          <div className="text-sm font-bold text-[#103B5C]">
            Adaptive Self-Distillation
          </div>
          <p className="text-[11px] text-[#25313D] leading-relaxed">
            Multi-objective self-distillation with dynamic EMA loss-ratio balancing across dual auxiliary heads.
          </p>
        </div>

        <div className="about-spec-card card-transparent-interactive p-5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-[#103B5C] text-xs font-mono uppercase tracking-wider font-bold">
            <Layers className="w-4 h-4 text-[#399DBA]" />
            <span>Base Architecture</span>
          </div>
          <div className="text-sm font-bold text-[#103B5C]">
            MONAI UNETR (ViT-B/16)
          </div>
          <p className="text-[11px] text-[#25313D] leading-relaxed">
            Vision Transformer encoder with 16³ patch embeddings (768 hidden dim, 12 layers) and CNN decoders.
          </p>
        </div>

        <div className="about-spec-card card-transparent-interactive p-5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-[#164D70] text-xs font-mono uppercase tracking-wider font-bold">
            <FileCode className="w-4 h-4 text-[#399DBA]" />
            <span>Compute Platform</span>
          </div>
          <div className="text-sm font-bold text-[#103B5C]">
            PyTorch 2.11 + CUDA
          </div>
          <p className="text-[11px] text-[#25313D] leading-relaxed">
            FP16 mixed precision acceleration, 96³ sliding-window inference with Gaussian blending.
          </p>
        </div>

        <div className="about-spec-card card-transparent-interactive p-5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-[#164D70] text-xs font-mono uppercase tracking-wider font-bold">
            <Database className="w-4 h-4 text-[#399DBA]" />
            <span>Cohort Benchmark</span>
          </div>
          <div className="text-sm font-bold text-[#103B5C]">
            BraTS 2021 Dataset
          </div>
          <p className="text-[11px] text-[#25313D] leading-relaxed">
            50-Subject verified cohort (40 train / 10 val), evaluated across WT, TC, and ET compartments.
          </p>
        </div>
      </div>

      {/* 3. VIVA & ACADEMIC EVALUATION DEFENSE GUIDE */}
      <section className="about-viva-panel card-transparent p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#399DBA]" />
            <h2 className="text-sm font-bold text-[#103B5C] font-mono uppercase tracking-wider">
              Academic Viva Defense &amp; Examiner Key Questions
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#164D70] font-bold">
            5 Core Assessment Pillars
          </span>
        </div>

        <div className="space-y-3">
          {VIVA_QUESTIONS.map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx}
                className="rounded-xl bg-white/20 border border-[#111111]/30 overflow-hidden transition-all duration-250 shadow-xs hover:bg-[rgba(226,247,242,0.65)]"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? -1 : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-semibold text-[#103B5C] hover:text-[#399DBA] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/30 text-[#103B5C] text-[10px] font-mono flex items-center justify-center shrink-0 font-bold border border-[#111111]/40">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[#111827]">{item.q}</span>
                  </span>
                  <ArrowRight className={`w-4 h-4 text-[#399DBA] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                <div 
                  className={`grid transition-[grid-template-rows] duration-250 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-4 pt-2 border-t border-[#111111]/20 text-xs text-[#25313D] leading-relaxed font-sans bg-white/30">
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. WORKSTATION NAVIGATOR */}
      <div className="card-transparent p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Ready to inspect experimental benchmarks?</h3>
          <p className="text-xs text-[#25313D] mt-0.5">
            View the live model comparison matrix or explore training loss curves.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate && onNavigate('models')}
            className="px-4 py-2 rounded-lg border border-[#111111] bg-white/30 hover:bg-[rgba(226,247,242,0.85)] text-[#111111] text-xs font-mono font-bold transition-all duration-250 shadow-xs cursor-pointer"
          >
            Model Lab
          </button>
          <button
            onClick={() => onNavigate && onNavigate('viewer')}
            className="px-4 py-2 rounded-lg bg-[#399DBA] hover:bg-[#103B5C] border border-[#111111] text-white text-xs font-bold shadow-sm transition-all duration-250 cursor-pointer"
          >
            Open 3D Viewer
          </button>
        </div>
      </div>

      {/* 5. MANDATORY REGULATORY RESEARCH DISCLAIMER */}
      <div className="p-6 rounded-xl bg-amber-50/80 border border-[#111111] space-y-3 shadow-[0_4px_12px_rgba(0,0,0,0.10)]">
        <div className="flex items-center gap-2.5 text-amber-950 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
          <span>Mandatory Research &amp; Educational Disclaimer</span>
        </div>
        <p className="text-xs text-amber-900 font-semibold leading-relaxed">
          &quot;For research and educational purposes only. This system is not a medical diagnostic tool.&quot;
        </p>
        <p className="text-[11px] text-[#25313D] leading-relaxed font-mono">
          This software has not been evaluated, cleared, or approved by the FDA, EMA, or any regulatory medical device authority. All predictions, segmentations, and volumetric estimates are intended purely for academic and algorithmic investigation.
        </p>
      </div>
    </div>
  );
}
