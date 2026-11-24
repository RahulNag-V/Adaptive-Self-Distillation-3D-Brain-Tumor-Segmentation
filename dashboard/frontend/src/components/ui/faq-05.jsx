// FAQ 05 adapted from Hirael <https://hirael.com/blocks/faqs/faq-05>
// Original author: Mohammad Shehadeh (MIT License)
// Adapted for Neuro Resonence AI Design System

import React from 'react';
import { HelpCircle, ExternalLink, Sparkles, BookOpen } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion';
import { cn } from '../../lib/utils';

export const FAQS = [
  {
    id: 'item-1',
    q: 'What is Neuro Resonence AI?',
    a: 'Neuro Resonence AI is a research-grade medical AI platform engineered for 3D multimodal brain tumor segmentation, quantitative volumetric radiomics, and interactive anatomical visualization on structural MRI.',
  },
  {
    id: 'item-2',
    q: 'How does Neuro Resonence AI perform brain tumor segmentation?',
    a: 'It utilizes a 3D UNETR (UNet with Vision Transformer) architecture that processes 3D volumetric MRI patches through a self-attention transformer encoder paired with a multi-scale convolutional decoder, augmented by an Adaptive Self-Distillation framework.',
  },
  {
    id: 'item-3',
    q: 'Which MRI modalities does Neuro Resonence AI support?',
    a: 'The system supports standard 4-channel multimodal structural MRI co-registered protocols: FLAIR (Fluid-Attenuated Inversion Recovery), T1-weighted, T1-weighted post-contrast (T1ce), and T2-weighted scans matching the BraTS 2021 benchmark specification.',
  },
  {
    id: 'item-4',
    q: 'What is Adaptive Self-Distillation?',
    a: 'Adaptive Self-Distillation is a student-teacher learning framework where intermediate transformer representations are distilled into an Online Tokenizer and Dense Predictor. This transfers contextual spatial knowledge to sharpen tumor boundary delineation without requiring a computationally heavy external static teacher network.',
  },
  {
    id: 'item-5',
    q: 'Can I interact with the 3D brain model?',
    a: 'Yes. The homepage features a real-time 3D anatomical brain model with smooth slow rotation, click-to-pause inertia, and interactive particle hover resonance. The dedicated Clinical 3D Viewer provides multi-planar reconstruction (Axial, Coronal, Sagittal) and 3D surface mesh rendering of segmented tumor sub-regions.',
  },
  {
    id: 'item-6',
    q: 'What are Dice Score and HD95?',
    a: 'Dice Similarity Coefficient (DSC) quantifies spatial volumetric overlap between AI-predicted tumor masks and expert annotations (ranging from 0 to 1, where 1 indicates perfect overlap). The 95th Percentile Hausdorff Distance (HD95) measures the maximum boundary distance error in millimeters, indicating boundary contour tightness (where lower values represent closer boundary alignment).',
  },
  {
    id: 'item-7',
    q: 'What is the difference between Whole Tumor, Tumor Core, and Enhancing Tumor?',
    a: 'Following the international BraTS evaluation protocol: Whole Tumor (WT) encompasses all abnormal pathological tissue including peritumoral edema; Tumor Core (TC) encompasses necrotic and non-enhancing components as well as active tumor; and Enhancing Tumor (ET) specifically isolates actively vascularized, hyper-metabolic malignant tissue.',
  },
  {
    id: 'item-8',
    q: 'Can Neuro Resonence AI analyze uploaded MRI scans?',
    a: 'Yes. Through the Scan Ingestion pipeline, researchers can upload 3D NIfTI files (.nii or .nii.gz) or select benchmark-calibrated multimodal MRI volumes to execute automated preprocessing, model inference, and instant volumetric burden quantification.',
  },
  {
    id: 'item-9',
    q: 'Does Neuro Resonence AI support voice commands?',
    a: 'Yes. Neuro Resonence AI includes an integrated Web Speech API voice control engine supporting hands-free clinical navigation, including commands such as "go to viewer", "open model lab", "scroll down", "toggle dark mode", and "export report".',
  },
  {
    id: 'item-10',
    q: 'Is Neuro Resonence AI suitable for clinical diagnosis?',
    a: 'No. Neuro Resonence AI is an investigational academic research prototype designed to evaluate self-distillation architectures. It has not received FDA 510(k) clearance or CE medical certification and must not be used as an autonomous diagnostic tool without licensed board-certified radiologist oversight.',
  },
  {
    id: 'item-11',
    q: 'Which technologies are used to develop Neuro Resonence AI?',
    a: 'The frontend is constructed using React 18, Tailwind CSS, Lucide Icons, GSAP, and Three.js. The backend is built in Python with FastAPI, PyTorch, MONAI (Medical Open Network for AI), NumPy, SciPy, and VTK.js for high-fidelity volumetric visualization.',
  },
  {
    id: 'item-12',
    q: 'Where can I learn more about the project?',
    a: 'You can explore the open-source implementation, model weights, experiment tracking logs, and viva defense presentation materials on the official GitHub repository at https://github.com/RahulNag-V/Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation.',
  },
];

export default function Faq05({ onNavigate }) {
  return (
    <section data-slot="faq" className="w-full">
      <div className="faq-layout grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full h-auto lg:h-[calc(100vh-4.25rem)]">
        {/* Left Column: Eyebrow, Heading, Description & Quick Link - COMPLETELY STATIONARY */}
        <div
          data-slot="faq-intro"
          className="faq-left lg:col-span-5 flex flex-col gap-4 items-center text-center justify-center lg:h-full self-center w-full select-none"
        >
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-[#111111] w-fit mx-auto text-xs font-mono font-bold text-[#111111] shadow-xs">
            <HelpCircle className="w-3.5 h-3.5 text-[#103B5C]" />
            <span>KNOWLEDGE BASE &amp; FAQ</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111827] dark:text-white leading-[1.08] text-center">
            Questions, <br className="hidden sm:inline" />
            answered.
          </h2>

          <p className="text-sm sm:text-base text-[#25313D] dark:text-slate-200 leading-relaxed text-center max-w-md mx-auto">
            Explore common questions about Neuro Resonence AI, our research architecture, 3D brain visualization, and medical imaging workflow.
          </p>

          {/* Quick Context Card */}
          <div className="card-transparent-interactive mt-4 p-4 rounded-xl space-y-3 w-full max-w-md mx-auto text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-[#103B5C] dark:text-[#98D9CE]">
              <Sparkles className="w-3.5 h-3.5 text-[#399DBA]" />
              <span>RESEARCH ARCHITECTURE</span>
            </div>
            <p className="text-xs text-[#164D70] dark:text-slate-300 leading-normal text-center">
              Need technical details on loss curves or BraTS 2021 benchmark Dice improvements?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B6284] hover:text-[#103B5C] dark:text-[#98D9CE] hover:underline cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#399DBA]" />
                  <span>View Methodology Guide</span>
                </button>
              )}
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <a
                href="https://github.com/RahulNag-V/Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B6284] hover:text-[#103B5C] dark:text-[#98D9CE] hover:underline"
              >
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 text-[#399DBA]" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Outer FAQ Card Remains Stationary While Inner Questions Scroll */}
        <div
          data-slot="faq-list"
          className="faq-right card-transparent lg:col-span-7 rounded-2xl p-5 sm:p-6 lg:p-7 flex flex-col h-[88vh] lg:h-full max-h-[92vh] lg:max-h-full overflow-hidden relative shadow-xs"
        >
          {/* Inner Independently Scrollable Questions Container */}
          <div className="faq-questions flex-1 w-full min-h-0 pr-2 sm:pr-3.5 select-text">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-[#25313D] dark:text-slate-300 text-sm leading-relaxed">
                      {item.a}
                    </p>
                    {item.id === 'item-12' && (
                      <div className="mt-3 pt-2">
                        <a
                          href="https://github.com/RahulNag-V/Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EBF8F6] dark:bg-[#103B5C] text-xs font-mono font-bold text-[#103B5C] dark:text-white border border-[#98D9CE] dark:border-[#164D70] hover:bg-[#399DBA] hover:text-white transition-colors"
                        >
                          <span>Open GitHub Repository</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
