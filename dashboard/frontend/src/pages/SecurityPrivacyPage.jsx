import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  UserCheck,
  Server,
  Database,
  FileCheck2,
  Lock,
  EyeOff,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  Printer,
  Info,
  CheckCircle2,
  HardDrive,
  FileText,
  HelpCircle,
  Stethoscope,
  Terminal,
  Activity,
  Layers
} from 'lucide-react';
import { smoothScrollToTop } from '../utils/motion';

/**
 * SecurityPrivacyPage
 * 
 * Enterprise-grade Healthcare Privacy & Clinical Security Portal for Neuro Resonence AI:
 * - Premium transparent frosted glass design language matching the rest of the application.
 * - Soft transparent surfaces (bg-white/30 backdrop-blur-md) that let the ambient mint grid shine through.
 * - Prominent active accordion header state using a darker mint tone (rgba(127, 201, 187, 0.45))
 *   when expanded, with smooth 200ms ease-in-out transitions.
 * - Strict adherence to medical disclaimer and research scope definition (no unsupported HIPAA/FDA claims).
 */
export default function SecurityPrivacyPage({ onNavigate }) {
  // Expanded sections state for accessible accordion interaction
  const [expandedSections, setExpandedSections] = useState({
    dataHandling: true,
    deIdentification: true,
    encryption: false,
    rbac: false,
    retention: false,
    standards: true,
    clinicalUse: true,
    governance: false,
  });

  useEffect(() => {
    smoothScrollToTop();
  }, []);

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const expandAll = () => {
    setExpandedSections({
      dataHandling: true,
      deIdentification: true,
      encryption: true,
      rbac: true,
      retention: true,
      standards: true,
      clinicalUse: true,
      governance: true,
    });
  };

  const collapseAll = () => {
    setExpandedSections({
      dataHandling: false,
      deIdentification: false,
      encryption: false,
      rbac: false,
      retention: false,
      standards: false,
      clinicalUse: false,
      governance: false,
    });
  };

  const scrollToAnchor = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-[1120px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 font-sans text-[#111827] select-text">
      
      {/* ========================================================
          1. NAVIGATION BAR & DOCUMENT CONTEXT (FROSTED GLASS)
          ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono border-b border-[#111111]/15 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate('overview') : window.history.back())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/30 hover:bg-white/50 text-[#103B5C] border border-[#111111]/20 shadow-2xs backdrop-blur-md transition-all font-semibold cursor-pointer active:scale-95"
            title="Return to Neuro Resonence AI Homepage"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </button>

          <span className="text-[#64748B]">/</span>
          <span className="text-[#103B5C] font-semibold">Governance &amp; Privacy</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/30 backdrop-blur-md border border-[#111111]/20 text-[#103B5C] font-semibold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Local Execution Sandbox
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/30 hover:bg-white/50 backdrop-blur-md border border-[#111111]/20 text-[#103B5C] text-[11px] font-semibold transition-all cursor-pointer print:hidden"
            title="Print or Save Policy Documentation as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Document</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. SECTION A — PROFESSIONAL HEADER (FROSTED GLASS)
          ======================================================== */}
      <header className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/40 border border-[#111111]/20 dark:border-[#1E4D6B]/50 p-6 sm:p-8 shadow-xs backdrop-blur-md relative overflow-hidden">
        {/* Subtle decorative mint ambient corner */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#98D9CE]/25 to-transparent pointer-events-none rounded-bl-full" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#103B5C] text-white shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#103B5C] bg-white/40 dark:bg-white/10 px-2 py-0.5 rounded-md border border-[#103B5C]/20">
                  Clinical Workstation Policy
                </span>
                <span className="text-[11px] font-mono text-[#64748B]">Document ID: NRAI-SEC-2026-V1.2</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#103B5C] dark:text-white mt-1">
                Privacy &amp; Clinical Security
              </h1>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#25313D] dark:text-[#CBD5E1] max-w-3xl leading-relaxed pt-1">
            How Neuro Resonence AI handles medical imaging data, protects access, and supports responsible clinical research.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-mono text-[#25313D] dark:text-[#CBD5E1] border-t border-[#111111]/15 dark:border-slate-800/40">
            <span>Last Evaluated: <strong>November 2026</strong></span>
            <span>•</span>
            <span>Architecture: <strong>Zero External Cloud PHI Storage</strong></span>
            <span>•</span>
            <span>Protocol: <strong>BraTS 2021 Multi-Parametric MRI</strong></span>
          </div>
        </div>
      </header>

      {/* ========================================================
          3. SECTION B — SECURITY OVERVIEW (THREE FROSTED GLASS CARDS)
          ======================================================== */}
      <section aria-labelledby="security-overview-heading" className="space-y-3">
        <h2 id="security-overview-heading" className="sr-only">
          Security Overview Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Data Protection */}
          <div className="rounded-2xl bg-white/30 hover:bg-white/45 dark:bg-[#0B253A]/35 dark:hover:bg-[#0B253A]/50 border border-[#111111]/20 dark:border-[#1E4D6B]/50 p-5 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between group backdrop-blur-md">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/40 dark:bg-white/10 text-[#103B5C] dark:text-white flex items-center justify-center border border-[#103B5C]/15">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#103B5C] px-2 py-0.5 rounded bg-white/40 dark:bg-white/10 border border-[#111111]/15">
                  Data Shield
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#103B5C] dark:text-white">
                  Data Protection &amp; Sandboxing
                </h3>
                <p className="text-xs text-[#25313D] dark:text-[#94A3B8] leading-relaxed mt-1.5">
                  MRI NIfTI structural volumes (.nii.gz) are ingested and segmented within an isolated local workstation execution boundary. Voxel volumes are never shared with public generative AI endpoints.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#111111]/15 dark:border-slate-800/40 mt-4">
              <button
                type="button"
                onClick={() => {
                  setExpandedSections((p) => ({ ...p, dataHandling: true, deIdentification: true }));
                  scrollToAnchor('section-patient-data');
                }}
                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#1B6284] hover:text-[#103B5C] hover:underline cursor-pointer"
              >
                <span>Explore Ingestion &amp; De-id</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Access Control */}
          <div className="rounded-2xl bg-white/30 hover:bg-white/45 dark:bg-[#0B253A]/35 dark:hover:bg-[#0B253A]/50 border border-[#111111]/20 dark:border-[#1E4D6B]/50 p-5 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between group backdrop-blur-md">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/40 dark:bg-white/10 text-[#103B5C] dark:text-white flex items-center justify-center border border-[#103B5C]/15">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#103B5C] px-2 py-0.5 rounded bg-white/40 dark:bg-white/10 border border-[#111111]/15">
                  Governance
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#103B5C] dark:text-white">
                  Access Control &amp; Authorization
                </h3>
                <p className="text-xs text-[#25313D] dark:text-[#94A3B8] leading-relaxed mt-1.5">
                  Clinical operator sessions enforce distinct profile context between diagnostic neuroradiology review and multi-center benchmark validation models, preventing accidental dataset intermixing.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#111111]/15 dark:border-slate-800/40 mt-4">
              <button
                type="button"
                onClick={() => {
                  setExpandedSections((p) => ({ ...p, rbac: true }));
                  scrollToAnchor('section-access-control');
                }}
                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#1B6284] hover:text-[#103B5C] hover:underline cursor-pointer"
              >
                <span>View Access Architecture</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 3: Secure Processing */}
          <div className="rounded-2xl bg-white/30 hover:bg-white/45 dark:bg-[#0B253A]/35 dark:hover:bg-[#0B253A]/50 border border-[#111111]/20 dark:border-[#1E4D6B]/50 p-5 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between group backdrop-blur-md">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/40 dark:bg-white/10 text-[#103B5C] dark:text-white flex items-center justify-center border border-[#103B5C]/15">
                  <Server className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#103B5C] px-2 py-0.5 rounded bg-white/40 dark:bg-white/10 border border-[#111111]/15">
                  Execution
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#103B5C] dark:text-white">
                  Secure Local Processing &amp; Storage
                </h3>
                <p className="text-xs text-[#25313D] dark:text-[#94A3B8] leading-relaxed mt-1.5">
                  Sliding-window UNETR deep learning inference and 3D marching cubes surface extraction execute directly on the operator's local runtime, with immediate session wiping capabilities.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#111111]/15 dark:border-slate-800/40 mt-4">
              <button
                type="button"
                onClick={() => {
                  setExpandedSections((p) => ({ ...p, encryption: true, retention: true }));
                  scrollToAnchor('section-secure-processing');
                }}
                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#1B6284] hover:text-[#103B5C] hover:underline cursor-pointer"
              >
                <span>Inspect Safeguards &amp; Lifecycle</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          3B. ACCORDION CONTROL TOOLBAR
          ======================================================== */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-base font-bold text-[#103B5C] dark:text-white font-mono flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#399DBA]" />
          <span>Detailed Clinical Security Specifications</span>
        </h2>

        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={expandAll}
            className="text-[#1B6284] hover:text-[#103B5C] hover:underline cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-[#64748B]">•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[#1B6284] hover:text-[#103B5C] hover:underline cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ========================================================
          4. DETAILED SPECIFICATION ACCORDION SECTIONS (1 through 8)
             - Transparent Frosted Glass Outer Cards
             - Expanded Header uses darker mint tone: rgba(127, 201, 187, 0.45)
             - 200ms ease-in-out smooth transitions
          ======================================================== */}
      <div className="space-y-4">

        {/* ----------------------------------------------------
            Section 1: Patient Data & Medical Imaging
            ---------------------------------------------------- */}
        <article
          id="section-patient-data"
          className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/35 border border-[#111111]/20 dark:border-[#1E4D6B]/50 shadow-xs overflow-hidden transition-all duration-200 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => toggleSection('dataHandling')}
            className={`w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ease-in-out ${
              expandedSections.dataHandling
                ? 'bg-[rgba(127,201,187,0.45)] hover:bg-[rgba(127,201,187,0.55)] dark:bg-[rgba(20,75,95,0.60)] dark:hover:bg-[rgba(20,75,95,0.70)] border-b border-[#111111]/18 dark:border-white/10'
                : 'bg-transparent hover:bg-white/20 dark:hover:bg-white/10'
            }`}
            aria-expanded={expandedSections.dataHandling}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                expandedSections.dataHandling
                  ? 'bg-white/70 dark:bg-slate-900 border-[#103B5C]/30 text-[#103B5C] dark:text-teal-300'
                  : 'bg-white/40 dark:bg-slate-900 border-[#111111]/15 text-teal-700 dark:text-teal-400'
              }`}>
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold block transition-colors duration-200 ${
                  expandedSections.dataHandling ? 'text-[#103B5C] dark:text-teal-200' : 'text-[#64748B] dark:text-slate-400'
                }`}>
                  Section 1 · Imaging Modalities &amp; Ingestion
                </span>
                <h3 className={`text-base font-bold transition-colors duration-200 ${
                  expandedSections.dataHandling ? 'text-[#0a273e] dark:text-white' : 'text-[#103B5C] dark:text-white'
                }`}>
                  Patient Data &amp; Medical Imaging Handling
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ease-in-out shrink-0 ${
                expandedSections.dataHandling ? 'text-[#0a273e] dark:text-white rotate-180' : 'text-[#103B5C] dark:text-white'
              }`}
            />
          </button>

          {expandedSections.dataHandling && (
            <div className="px-5 sm:px-6 pb-6 pt-4 text-xs text-[#25313D] dark:text-[#E2E8F0] space-y-4 leading-relaxed bg-white/15 dark:bg-[#0B253A]/15 backdrop-blur-xs">
              <p>
                Neuro Resonence AI is engineered specifically to process 3D multi-parametric Magnetic Resonance Imaging (mpMRI) datasets. The system strictly processes structural volume files conforming to the NIfTI-1 data standard.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1 backdrop-blur-xs">
                  <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-[11px] uppercase">
                    Supported Input Sequences
                  </h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    <li><strong>FLAIR:</strong> Fluid-Attenuated Inversion Recovery (peritumoral edema delineation)</li>
                    <li><strong>T1 Native:</strong> Pre-contrast longitudinal relaxation (anatomical reference)</li>
                    <li><strong>T1ce:</strong> Gadolinium-contrast enhanced T1 (active vascularized rim)</li>
                    <li><strong>T2-Weighted:</strong> Transverse relaxation (hyperintense non-enhancing lesion tissue)</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1 backdrop-blur-xs">
                  <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-[11px] uppercase">
                    Runtime Processing Boundary
                  </h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    <li><strong>Execution Host:</strong> Processed strictly on the local host instance (<code className="bg-white/40 dark:bg-black/30 px-1 rounded font-mono">127.0.0.1:8000</code>).</li>
                    <li><strong>Zero 3rd-Party AI Transmission:</strong> Voxel matrices are never transmitted to public LLMs or external cloud vision inference providers.</li>
                    <li><strong>Scratch Directory:</strong> Stored within localized runtime directory (<code className="bg-white/40 dark:bg-black/30 px-1 rounded font-mono">dashboard/backend/runtime/sessions/</code>).</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-[11px] font-mono flex items-start gap-2.5 backdrop-blur-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Deletion Request:</strong> Operators can immediately delete uploaded MRI sequences, predicted masks, and temporary marching cubes meshes at any time by clearing the session using the "Reset Session" control or clearing the runtime directory.
                </span>
              </div>
            </div>
          )}
        </article>

        {/* ----------------------------------------------------
            Section 2: Data De-identification
            ---------------------------------------------------- */}
        <article
          className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/35 border border-[#111111]/20 dark:border-[#1E4D6B]/50 shadow-xs overflow-hidden transition-all duration-200 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => toggleSection('deIdentification')}
            className={`w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ease-in-out ${
              expandedSections.deIdentification
                ? 'bg-[rgba(127,201,187,0.45)] hover:bg-[rgba(127,201,187,0.55)] dark:bg-[rgba(20,75,95,0.60)] dark:hover:bg-[rgba(20,75,95,0.70)] border-b border-[#111111]/18 dark:border-white/10'
                : 'bg-transparent hover:bg-white/20 dark:hover:bg-white/10'
            }`}
            aria-expanded={expandedSections.deIdentification}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                expandedSections.deIdentification
                  ? 'bg-white/70 dark:bg-slate-900 border-[#103B5C]/30 text-[#103B5C] dark:text-sky-300'
                  : 'bg-white/40 dark:bg-slate-900 border-[#111111]/15 text-sky-700 dark:text-sky-400'
              }`}>
                <EyeOff className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold block transition-colors duration-200 ${
                  expandedSections.deIdentification ? 'text-[#103B5C] dark:text-sky-200' : 'text-[#64748B] dark:text-slate-400'
                }`}>
                  Section 2 · PHI Mitigation &amp; Metadata
                </span>
                <h3 className={`text-base font-bold transition-colors duration-200 ${
                  expandedSections.deIdentification ? 'text-[#0a273e] dark:text-white' : 'text-[#103B5C] dark:text-white'
                }`}>
                  Data De-identification &amp; Protected Health Information (PHI)
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ease-in-out shrink-0 ${
                expandedSections.deIdentification ? 'text-[#0a273e] dark:text-white rotate-180' : 'text-[#103B5C] dark:text-white'
              }`}
            />
          </button>

          {expandedSections.deIdentification && (
            <div className="px-5 sm:px-6 pb-6 pt-4 text-xs text-[#25313D] dark:text-[#E2E8F0] space-y-4 leading-relaxed bg-white/15 dark:bg-[#0B253A]/15 backdrop-blur-xs">
              <p>
                Protection of patient privacy begins before file upload. Neuro Resonence AI is designed specifically for de-identified research volumes:
              </p>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1.5 backdrop-blur-xs">
                  <span className="font-bold text-[#103B5C] dark:text-white block font-mono text-xs">
                    NIfTI Format Inherent Protection
                  </span>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    Unlike clinical DICOM images which store 18 HIPAA Safe Harbor direct identifiers (e.g., Patient Name, Medical Record Number, Date of Birth, Treating Physician) embedded directly in image tags, NIfTI (.nii/.nii.gz) files store only matrix geometry (voxel dimensions, spatial affine transformation, and voxel intensity values). Direct demographic tags are absent from the NIfTI header standard.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1.5 backdrop-blur-xs">
                  <span className="font-bold text-[#103B5C] dark:text-white block font-mono text-xs">
                    Anonymized Session Keys &amp; Filename Scrubbing
                  </span>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    Uploaded volumes are mapped to programmatic pseudo-identifiers (e.g., <code className="bg-white/40 dark:bg-black/30 px-1 rounded font-mono">BraTS2021_01017</code> or <code className="bg-white/40 dark:bg-black/30 px-1 rounded font-mono">session_20261122_XXXX</code>). Clinical names and patient identifiers in original file paths are decoupled from analytical reporting.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#399DBA]/15 border border-[#399DBA]/35 text-[#103B5C] dark:text-blue-200 text-[11px] font-mono leading-relaxed backdrop-blur-xs">
                <strong>Crucial Clinical Notice on Craniofacial Features:</strong> Raw, non-skull-stripped full-head MRI scans can theoretically be rendered in 3D to reconstruct soft-tissue facial topography. Users must ensure that images uploaded for clinical research have undergone defacing or skull-stripping protocols (such as standard BraTS brain parenchyma extraction) prior to ingestion.
              </div>
            </div>
          )}
        </article>

        {/* ----------------------------------------------------
            Section 3: Encryption & Data Security
            ---------------------------------------------------- */}
        <article
          id="section-secure-processing"
          className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/35 border border-[#111111]/20 dark:border-[#1E4D6B]/50 shadow-xs overflow-hidden transition-all duration-200 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => toggleSection('encryption')}
            className={`w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ease-in-out ${
              expandedSections.encryption
                ? 'bg-[rgba(127,201,187,0.45)] hover:bg-[rgba(127,201,187,0.55)] dark:bg-[rgba(20,75,95,0.60)] dark:hover:bg-[rgba(20,75,95,0.70)] border-b border-[#111111]/18 dark:border-white/10'
                : 'bg-transparent hover:bg-white/20 dark:hover:bg-white/10'
            }`}
            aria-expanded={expandedSections.encryption}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                expandedSections.encryption
                  ? 'bg-white/70 dark:bg-slate-900 border-[#103B5C]/30 text-[#103B5C] dark:text-emerald-300'
                  : 'bg-white/40 dark:bg-slate-900 border-[#111111]/15 text-emerald-700 dark:text-emerald-400'
              }`}>
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold block transition-colors duration-200 ${
                  expandedSections.encryption ? 'text-[#103B5C] dark:text-emerald-200' : 'text-[#64748B] dark:text-slate-400'
                }`}>
                  Section 3 · Technical Safeguards &amp; Cryptography
                </span>
                <h3 className={`text-base font-bold transition-colors duration-200 ${
                  expandedSections.encryption ? 'text-[#0a273e] dark:text-white' : 'text-[#103B5C] dark:text-white'
                }`}>
                  Encryption, Transmission &amp; Host Safeguards
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ease-in-out shrink-0 ${
                expandedSections.encryption ? 'text-[#0a273e] dark:text-white rotate-180' : 'text-[#103B5C] dark:text-white'
              }`}
            />
          </button>

          {expandedSections.encryption && (
            <div className="px-5 sm:px-6 pb-6 pt-4 text-xs text-[#25313D] dark:text-[#E2E8F0] space-y-4 leading-relaxed bg-white/15 dark:bg-[#0B253A]/15 backdrop-blur-xs">
              <p>
                Neuro Resonence AI implements defense-in-depth engineering practices to protect system state and data integrity:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1 backdrop-blur-xs">
                  <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-[11px] uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>In-Transit Network Protection</span>
                  </h4>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    Production enterprise deployments require TLS 1.3 / HTTPS encryption for all browser-to-backend traffic, preventing network packet interception or man-in-the-middle tampering of slice buffers.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1 backdrop-blur-xs">
                  <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-[11px] uppercase flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Storage at Rest &amp; Host ACLs</span>
                  </h4>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    Runtime directories are restricted by operating system Access Control Lists (ACLs) to the authenticated application execution service account, backed by host full-disk encryption (BitLocker / dm-crypt).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1 backdrop-blur-xs">
                  <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-[11px] uppercase flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Strict Input Verification</span>
                  </h4>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    Incoming uploads are sanitized with magic byte validation (gzip/NIfTI header verification), maximum payload constraints (500 MB limit), and tensor dimension sanity bounds (min 128³, max 512³).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1 backdrop-blur-xs">
                  <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-[11px] uppercase flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cross-Origin Resource Sharing (CORS)</span>
                  </h4>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    API endpoints are governed by strict CORS policies allowing only authorized frontend origins, preventing unauthorized third-party script invocations against clinical endpoints.
                  </p>
                </div>
              </div>
            </div>
          )}
        </article>

        {/* ----------------------------------------------------
            Section 4: Role-Based Access Control (RBAC)
            ---------------------------------------------------- */}
        <article
          id="section-access-control"
          className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/35 border border-[#111111]/20 dark:border-[#1E4D6B]/50 shadow-xs overflow-hidden transition-all duration-200 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => toggleSection('rbac')}
            className={`w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ease-in-out ${
              expandedSections.rbac
                ? 'bg-[rgba(127,201,187,0.45)] hover:bg-[rgba(127,201,187,0.55)] dark:bg-[rgba(20,75,95,0.60)] dark:hover:bg-[rgba(20,75,95,0.70)] border-b border-[#111111]/18 dark:border-white/10'
                : 'bg-transparent hover:bg-white/20 dark:hover:bg-white/10'
            }`}
            aria-expanded={expandedSections.rbac}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                expandedSections.rbac
                  ? 'bg-white/70 dark:bg-slate-900 border-[#103B5C]/30 text-[#103B5C] dark:text-purple-300'
                  : 'bg-white/40 dark:bg-slate-900 border-[#111111]/15 text-purple-700 dark:text-purple-400'
              }`}>
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold block transition-colors duration-200 ${
                  expandedSections.rbac ? 'text-[#103B5C] dark:text-purple-200' : 'text-[#64748B] dark:text-slate-400'
                }`}>
                  Section 4 · Identity &amp; Authorization
                </span>
                <h3 className={`text-base font-bold transition-colors duration-200 ${
                  expandedSections.rbac ? 'text-[#0a273e] dark:text-white' : 'text-[#103B5C] dark:text-white'
                }`}>
                  Role-Based Access Control (RBAC) Architecture
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ease-in-out shrink-0 ${
                expandedSections.rbac ? 'text-[#0a273e] dark:text-white rotate-180' : 'text-[#103B5C] dark:text-white'
              }`}
            />
          </button>

          {expandedSections.rbac && (
            <div className="px-5 sm:px-6 pb-6 pt-4 text-xs text-[#25313D] dark:text-[#E2E8F0] space-y-4 leading-relaxed bg-white/15 dark:bg-[#0B253A]/15 backdrop-blur-xs">
              <p>
                Neuro Resonence AI establishes structured operational roles for multi-disciplinary clinical environments:
              </p>

              <div className="overflow-x-auto rounded-xl border border-[#111111]/15 bg-white/25 dark:bg-slate-900/30 backdrop-blur-xs">
                <table className="w-full border-collapse text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-[#111111]/20 bg-white/40 dark:bg-slate-900/60">
                      <th className="py-2.5 px-3 font-bold text-[#103B5C] dark:text-white">Role Tier</th>
                      <th className="py-2.5 px-3 font-bold text-[#103B5C] dark:text-white">Persona</th>
                      <th className="py-2.5 px-3 font-bold text-[#103B5C] dark:text-white">Permitted Operations</th>
                      <th className="py-2.5 px-3 font-bold text-[#103B5C] dark:text-white">Scope Restrictions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111111]/10 dark:divide-slate-800">
                    <tr className="hover:bg-white/20 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#103B5C] dark:text-teal-300">Tier 1 · Radiologist</td>
                      <td className="py-2 px-3">Senior Attending Neuroradiologist</td>
                      <td className="py-2 px-3">Full MPR Orthogonal View, 3D Mesh Inspection, Slice Annotation &amp; Contour Correction, Clinical Report PDF generation</td>
                      <td className="py-2 px-3 text-[#64748B]">Restricted to authorized patient cohorts</td>
                    </tr>
                    <tr className="hover:bg-white/20 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#103B5C] dark:text-teal-300">Tier 2 · Researcher</td>
                      <td className="py-2 px-3">AI / Imaging Research Fellow</td>
                      <td className="py-2 px-3">Model Lab Benchmark comparison (UNETR vs Self-Distillation), 10-epoch training dynamics, Dice metric analysis</td>
                      <td className="py-2 px-3 text-[#64748B]">Anonymized public benchmarks only</td>
                    </tr>
                    <tr className="hover:bg-white/20 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#103B5C] dark:text-teal-300">Tier 3 · Administrator</td>
                      <td className="py-2 px-3">Medical Physics / IT Specialist</td>
                      <td className="py-2 px-3">Workstation calibration, voice engine sensitivity, model checkpoint reloading, runtime cache clearing</td>
                      <td className="py-2 px-3 text-[#64748B]">Workstation system settings only</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-[#25313D] dark:text-[#CBD5E1] font-mono pt-1">
                <strong>Implementation Notice:</strong> Current releases enforce client-session authorization. Integration with institutional Single Sign-On (SSO) via SAML 2.0 / OpenID Connect (OIDC) is planned for multi-facility enterprise deployments.
              </p>
            </div>
          )}
        </article>

        {/* ----------------------------------------------------
            Section 5: Data Retention & Deletion Policy
            ---------------------------------------------------- */}
        <article
          className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/35 border border-[#111111]/20 dark:border-[#1E4D6B]/50 shadow-xs overflow-hidden transition-all duration-200 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => toggleSection('retention')}
            className={`w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ease-in-out ${
              expandedSections.retention
                ? 'bg-[rgba(127,201,187,0.45)] hover:bg-[rgba(127,201,187,0.55)] dark:bg-[rgba(20,75,95,0.60)] dark:hover:bg-[rgba(20,75,95,0.70)] border-b border-[#111111]/18 dark:border-white/10'
                : 'bg-transparent hover:bg-white/20 dark:hover:bg-white/10'
            }`}
            aria-expanded={expandedSections.retention}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                expandedSections.retention
                  ? 'bg-white/70 dark:bg-slate-900 border-[#103B5C]/30 text-[#103B5C] dark:text-orange-300'
                  : 'bg-white/40 dark:bg-slate-900 border-[#111111]/15 text-orange-700 dark:text-orange-400'
              }`}>
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold block transition-colors duration-200 ${
                  expandedSections.retention ? 'text-[#103B5C] dark:text-orange-200' : 'text-[#64748B] dark:text-slate-400'
                }`}>
                  Section 5 · Lifecycle &amp; Persistence
                </span>
                <h3 className={`text-base font-bold transition-colors duration-200 ${
                  expandedSections.retention ? 'text-[#0a273e] dark:text-white' : 'text-[#103B5C] dark:text-white'
                }`}>
                  Data Retention, Session Lifecycle &amp; Deletion
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ease-in-out shrink-0 ${
                expandedSections.retention ? 'text-[#0a273e] dark:text-white rotate-180' : 'text-[#103B5C] dark:text-white'
              }`}
            />
          </button>

          {expandedSections.retention && (
            <div className="px-5 sm:px-6 pb-6 pt-4 text-xs text-[#25313D] dark:text-[#E2E8F0] space-y-4 leading-relaxed bg-white/15 dark:bg-[#0B253A]/15 backdrop-blur-xs">
              <p>
                Neuro Resonence AI adheres to a minimal persistence principle:
              </p>

              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-xs">Volatile Memory Caches</h4>
                    <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                      Slice raster caches and 3D mesh vertex buffers reside in volatile memory (RAM) and are discarded when switching cases or closing the browser session.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-xs">Session Artifacts</h4>
                    <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                      Predicted probability volumes (<code className="bg-white/40 dark:bg-black/30 px-1 rounded font-mono">probabilities.nii.gz</code>) and extracted meshes are retained only within localized session directories to facilitate immediate review.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-[#103B5C] dark:text-white font-mono text-xs">Immediate Operator Purge</h4>
                    <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                      Clinical operators can delete all active upload sessions directly from the workstation interface without residual orphaned temporary files.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </article>

        {/* ----------------------------------------------------
            Section 6: Healthcare Standards & Regulatory Considerations
            ---------------------------------------------------- */}
        <article
          className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/35 border border-[#111111]/20 dark:border-[#1E4D6B]/50 shadow-xs overflow-hidden transition-all duration-200 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => toggleSection('standards')}
            className={`w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ease-in-out ${
              expandedSections.standards
                ? 'bg-[rgba(127,201,187,0.45)] hover:bg-[rgba(127,201,187,0.55)] dark:bg-[rgba(20,75,95,0.60)] dark:hover:bg-[rgba(20,75,95,0.70)] border-b border-[#111111]/18 dark:border-white/10'
                : 'bg-transparent hover:bg-white/20 dark:hover:bg-white/10'
            }`}
            aria-expanded={expandedSections.standards}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                expandedSections.standards
                  ? 'bg-white/70 dark:bg-slate-900 border-[#103B5C]/30 text-[#103B5C] dark:text-indigo-300'
                  : 'bg-white/40 dark:bg-slate-900 border-[#111111]/15 text-indigo-700 dark:text-indigo-400'
              }`}>
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold block transition-colors duration-200 ${
                  expandedSections.standards ? 'text-[#103B5C] dark:text-indigo-200' : 'text-[#64748B] dark:text-slate-400'
                }`}>
                  Section 6 · Governance Alignment
                </span>
                <h3 className={`text-base font-bold transition-colors duration-200 ${
                  expandedSections.standards ? 'text-[#0a273e] dark:text-white' : 'text-[#103B5C] dark:text-white'
                }`}>
                  Healthcare Standards &amp; Regulatory Considerations
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ease-in-out shrink-0 ${
                expandedSections.standards ? 'text-[#0a273e] dark:text-white rotate-180' : 'text-[#103B5C] dark:text-white'
              }`}
            />
          </button>

          {expandedSections.standards && (
            <div className="px-5 sm:px-6 pb-6 pt-4 text-xs text-[#25313D] dark:text-[#E2E8F0] space-y-4 leading-relaxed bg-white/15 dark:bg-[#0B253A]/15 backdrop-blur-xs">
              <p>
                To support research integrity and hospital IT evaluations, the platform architecture aligns with leading health data governance frameworks:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1.5 backdrop-blur-xs">
                  <span className="font-bold text-[#103B5C] dark:text-white font-mono text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>HIPAA Security Rule Alignment</span>
                  </span>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    Engineered to satisfy 45 CFR Part 164 Subpart C technical safeguards (access control § 164.312(a), audit controls § 164.312(b), data integrity § 164.312(c), and transmission security § 164.312(e)) within institutional deployments.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1.5 backdrop-blur-xs">
                  <span className="font-bold text-[#103B5C] dark:text-white font-mono text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>DICOM PS 3.15 Conformance</span>
                  </span>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">
                    Incorporates principles from DICOM Part 15 Annex E (Application-Level Confidentiality Profiles) for sanitizing non-anatomical header tags and spatial matrix preservation.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/30 dark:bg-slate-900/40 border border-[#111111]/15 text-[11px] text-[#25313D] dark:text-[#94A3B8] font-mono leading-relaxed backdrop-blur-xs">
                <strong>Regulatory Qualification:</strong> References to HIPAA, DICOM, or ISO frameworks denote architectural engineering alignment only. Reference to a standard does not establish independent legal certification, third-party attestation, or FDA 510(k) pre-market medical device clearance.
              </div>
            </div>
          )}
        </article>

        {/* ----------------------------------------------------
            Section 7: Clinical Use & Research Limitations (Investigational)
            ---------------------------------------------------- */}
        <article
          className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/35 border border-[#111111]/20 dark:border-[#1E4D6B]/50 shadow-xs overflow-hidden transition-all duration-200 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => toggleSection('clinicalUse')}
            className={`w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ease-in-out ${
              expandedSections.clinicalUse
                ? 'bg-[rgba(127,201,187,0.45)] hover:bg-[rgba(127,201,187,0.55)] dark:bg-[rgba(20,75,95,0.60)] dark:hover:bg-[rgba(20,75,95,0.70)] border-b border-[#111111]/18 dark:border-white/10'
                : 'bg-transparent hover:bg-white/20 dark:hover:bg-white/10'
            }`}
            aria-expanded={expandedSections.clinicalUse}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                expandedSections.clinicalUse
                  ? 'bg-amber-100/80 dark:bg-amber-900/60 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200'
                  : 'bg-amber-100/50 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold block transition-colors duration-200 ${
                  expandedSections.clinicalUse ? 'text-amber-950 dark:text-amber-200' : 'text-amber-800 dark:text-amber-300'
                }`}>
                  Section 7 · Investigational Status &amp; Disclaimer
                </span>
                <h3 className={`text-base font-bold transition-colors duration-200 ${
                  expandedSections.clinicalUse ? 'text-amber-950 dark:text-amber-100 font-extrabold' : 'text-amber-950 dark:text-amber-100'
                }`}>
                  Clinical Use, Research Limitations &amp; Diagnostic Scope
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ease-in-out shrink-0 ${
                expandedSections.clinicalUse ? 'text-amber-950 dark:text-amber-200 rotate-180' : 'text-amber-800 dark:text-amber-300'
              }`}
            />
          </button>

          {expandedSections.clinicalUse && (
            <div className="px-5 sm:px-6 pb-6 pt-4 text-xs text-amber-950 dark:text-amber-100 space-y-3.5 leading-relaxed bg-white/15 dark:bg-[#0B253A]/15 backdrop-blur-xs">
              <p className="font-medium">
                Neuro Resonence AI is an investigational software platform designed for clinical research, self-distillation algorithm benchmarking, and multi-parametric visualization.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="p-3 rounded-lg bg-white/35 dark:bg-slate-900/50 border border-amber-300/40 dark:border-amber-800/40 space-y-1 backdrop-blur-xs">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">Algorithmic Predictions</h4>
                  <p className="text-amber-800/90 dark:text-amber-300/80">
                    Segmented whole tumor (WT), tumor core (TC), and enhancing tumor (ET) regions represent probabilistic spatial boundaries generated by deep neural networks. Predictions must be reviewed by a board-certified neuroradiologist.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white/35 dark:bg-slate-900/50 border border-amber-300/40 dark:border-amber-800/40 space-y-1 backdrop-blur-xs">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">Histological Grading</h4>
                  <p className="text-amber-800/90 dark:text-amber-300/80">
                    Volumetric spatial extents ($cm^3$) do not establish histological WHO grade (Grade 1–4) or molecular status (IDH1/2, 1p/19q codeletion, MGMT methylation), which require surgical biopsy and laboratory neuropathology.
                  </p>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed pt-1">
                This system is not authorized or certified as a primary standalone diagnostic medical device. It is intended to assist medical imaging researchers, imaging scientists, and healthcare trainees under qualified professional supervision.
              </p>
            </div>
          )}
        </article>

        {/* ----------------------------------------------------
            Section 8: Privacy Inquiries & Support
            ---------------------------------------------------- */}
        <article
          className="rounded-2xl bg-white/30 dark:bg-[#0B253A]/35 border border-[#111111]/20 dark:border-[#1E4D6B]/50 shadow-xs overflow-hidden transition-all duration-200 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => toggleSection('governance')}
            className={`w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ease-in-out ${
              expandedSections.governance
                ? 'bg-[rgba(127,201,187,0.45)] hover:bg-[rgba(127,201,187,0.55)] dark:bg-[rgba(20,75,95,0.60)] dark:hover:bg-[rgba(20,75,95,0.70)] border-b border-[#111111]/18 dark:border-white/10'
                : 'bg-transparent hover:bg-white/20 dark:hover:bg-white/10'
            }`}
            aria-expanded={expandedSections.governance}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                expandedSections.governance
                  ? 'bg-white/70 dark:bg-slate-900 border-[#103B5C]/30 text-[#103B5C] dark:text-slate-300'
                  : 'bg-white/40 dark:bg-slate-900 border-[#111111]/15 text-slate-700 dark:text-slate-300'
              }`}>
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold block transition-colors duration-200 ${
                  expandedSections.governance ? 'text-[#103B5C] dark:text-slate-200' : 'text-[#64748B] dark:text-slate-400'
                }`}>
                  Section 8 · Contacts &amp; Audit Trail
                </span>
                <h3 className={`text-base font-bold transition-colors duration-200 ${
                  expandedSections.governance ? 'text-[#0a273e] dark:text-white' : 'text-[#103B5C] dark:text-white'
                }`}>
                  Privacy Inquiries, Audits &amp; Governance Contacts
                </h3>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ease-in-out shrink-0 ${
                expandedSections.governance ? 'text-[#0a273e] dark:text-white rotate-180' : 'text-[#103B5C] dark:text-white'
              }`}
            />
          </button>

          {expandedSections.governance && (
            <div className="px-5 sm:px-6 pb-6 pt-4 text-xs text-[#25313D] dark:text-[#E2E8F0] space-y-4 leading-relaxed bg-white/15 dark:bg-[#0B253A]/15 backdrop-blur-xs">
              <p>
                For institutional inquiries regarding security architecture, algorithmic validation protocols, or clinical research collaboration agreements:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1 backdrop-blur-xs">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Clinical Research &amp; Governance</span>
                  <p className="font-semibold text-[#103B5C] dark:text-white">Neuro Resonence AI Development Group</p>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">Adaptive Self-Distillation 3D Brain Tumor Project</p>
                  <p className="text-[11px] text-[#1B6284] pt-1">governance@neuroresonence.internal</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/35 dark:bg-slate-900/40 border border-[#111111]/15 space-y-1 backdrop-blur-xs">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Hospital Sandbox Security Inquiries</span>
                  <p className="font-semibold text-[#103B5C] dark:text-white">Workstation Security Operations</p>
                  <p className="text-[11px] text-[#25313D] dark:text-[#94A3B8]">FastAPI Localhost Sandbox Runtime</p>
                  <p className="text-[11px] text-[#1B6284] pt-1">security@neuroresonence.internal</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#25313D] dark:text-[#CBD5E1] border-t border-[#111111]/15 dark:border-slate-800/40">
                <span>Version 1.2 · Evaluated November 2026</span>
                <span>Neuro Resonence AI Healthcare Portal</span>
              </div>
            </div>
          )}
        </article>

      </div>

      {/* ========================================================
          5. FOOTER QUICK ACTION
          ======================================================== */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#111111]/15 text-xs font-mono">
        <span className="text-[#25313D] font-medium">
          Need technical documentation on the self-distillation architecture?
        </span>
        <button
          type="button"
          onClick={() => (onNavigate ? onNavigate('about') : null)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#103B5C] hover:bg-[#1B6284] text-white font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
        >
          <span>View Methodology &amp; Viva Documentation</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
