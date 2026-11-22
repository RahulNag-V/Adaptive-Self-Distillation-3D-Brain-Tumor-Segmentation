import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope,
  FlaskConical,
  Settings,
  ChevronDown,
  Box,
  UploadCloud,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  Cpu,
  Activity,
  RefreshCw,
  Info,
  HelpCircle,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import InteractiveBrainHero from '../components/InteractiveBrainHero';
import InteractiveCancerCell from '../components/InteractiveCancerCell';
import AnimatedDropdown from '../components/ui/animated-dropdown';
import { GlyphBackground } from '../components/ui/backgrounds-glyph';
import { ClinicalProfileDropdown } from '../components/ui/clinical-profile-dropdown';
import HandwritingText from '../components/ui/handwriting-text';

// Research Paper Benchmark Link (U-Net biomedical image segmentation benchmark reference)
const RESEARCH_PAPER_URL = "https://arxiv.org/abs/1505.04597";

// GitHub SVG Logo Icon matching screenshot
function GithubIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

// Navigation Dropdown Definitions mapped to existing routes
const NAV_CATEGORIES = [
  {
    id: 'clinical',
    title: 'CLINICAL WORKSPACE',
    icon: Stethoscope,
    items: [
      { id: 'viewer', label: '3D Brain Viewer', icon: Box, desc: 'Synchronized multiplanar MPR & 3D mesh' },
      { id: 'upload', label: 'AI Segmentation', icon: UploadCloud, desc: 'Multimodal NIfTI scan ingestion' },
      { id: 'results', label: 'Segmentation Results', icon: CheckCircle2, desc: 'Volumetric burden & validation' },
      { id: 'classify', label: '2D Slice Pathology', icon: ImageIcon, desc: 'Histopathological classification' },
      { id: 'reports', label: 'Clinical Reports', icon: FileText, desc: 'Sub-compartment quantitative report' },
    ],
  },
  {
    id: 'research',
    title: 'RESEARCH & BENCHMARKS',
    icon: FlaskConical,
    items: [
      { id: 'models', label: 'Model Lab', icon: Cpu, desc: 'Baseline UNETR vs Proposed Self-Distillation' },
      { id: 'analytics', label: 'Training Dynamics', icon: Activity, desc: '10 Epoch loss & convergence curves' },
      { id: 'adaptive', label: 'Adaptive Learning', icon: RefreshCw, desc: 'Continual distillation & HITL queue' },
    ],
  },
  {
    id: 'system',
    title: 'SYSTEM & SPECIFICATIONS',
    icon: Settings,
    items: [
      { id: 'settings', label: 'Workstation Settings', icon: Settings, desc: 'Display preferences & voice controls' },
      { id: 'about', label: 'Methodology & Viva', icon: Info, desc: 'UNETR ViT, EMA balancing & academic guide' },
      { id: 'faq', label: 'Frequently Asked Questions', icon: HelpCircle, desc: 'Architecture, imaging workflow & FAQ' },
      { id: 'security', label: 'Privacy & Clinical Security', icon: ShieldCheck, desc: 'Data protection, de-identification & sandbox policy' },
    ],
  },
];

export default function OverviewPage({ onNavigate }) {
  const [activeDropdown, setActiveDropdown] = useState(null); // 'clinical' | 'research' | 'system' | null
  const headerNavRef = useRef(null);

  // Ensure default light mode and remove any residual dark class
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle or open a specific dropdown
  const handleToggleDropdown = (catId) => {
    setActiveDropdown((prev) => (prev === catId ? null : catId));
  };

  // Navigate to an existing page and close dropdown
  const handleItemSelect = (routeId) => {
    setActiveDropdown(null);
    if (onNavigate) {
      onNavigate(routeId);
    }
  };

  // Click-outside & Escape key handlers to close open dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerNavRef.current && !headerNavRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      className="min-h-screen md:h-screen w-screen overflow-y-auto md:overflow-hidden flex flex-col justify-between select-none transition-colors duration-300 relative hero-radial-mint text-[#000000]"
    >
      {/* ========================================================
          0. BACKGROUND GLYPH ANIMATION LAYER (TRANSPARENT MINT)
          Positioned behind all content (z-0), preserving hero-radial-mint
          ======================================================== */}
      <GlyphBackground
        className="absolute inset-0 z-0 pointer-events-auto"
        fontSize={9}
        glowColor="#3D8B7D"
        shapeColor="#2D7366"
        interactive={true}
      />

      {/* ========================================================
          0B. PRECISION CLINICAL GRID BACKGROUND
          ======================================================== */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(16, 59, 92, 0.07) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(16, 59, 92, 0.07) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ========================================================
          1. TOP HEADER (BRANDING, ENTER WORKSPACE & CLINICAL PROFILE)
          ======================================================== */}
      <header className="w-full px-[20px] pt-[20px] pb-2 relative z-30 shrink-0">
        <div className="w-full flex items-center justify-between gap-4">
          {/* Left: Brain-Shaped NRAI Logo & Brand Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="relative flex items-center justify-center">
              <img
                src="/nrai-logo.png"
                alt="Neuro Resonence AI Logo"
                className="h-9 sm:h-10 w-auto object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-transform hover:scale-105"
              />
            </div>
            <span className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-[#111827] whitespace-nowrap">
              <span className="neuro-underline">
                <HandwritingText text="Neuro" delay={0.0} stagger={0.025} duration={0.18} />
              </span>{' '}
              <HandwritingText text="Resonence AI" delay={0.16} stagger={0.022} duration={0.18} />
            </span>
          </div>

          {/* Center: Navigation Buttons (Enter Workspace & Research Paper) */}
          <div className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2 z-20">
            {/* 1. Enter Workspace Button */}
            <button
              type="button"
              onClick={() => handleItemSelect('upload')}
              className="px-6 py-2 rounded-full bg-white/70 hover:bg-white text-[#103B5C] hover:text-[#092B47] border border-[#111111]/30 hover:border-[#103B5C] font-mono font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-2.5 cursor-pointer active:scale-95 group backdrop-blur-md"
              title="Enter Neuro Resonence AI Workspace (AI Segmentation)"
            >
              <Sparkles className="w-4 h-4 text-[#399DBA] group-hover:rotate-12 transition-transform handwriting-icon" style={{ animationDelay: '0.22s' }} />
              <HandwritingText text="Enter Workspace" delay={0.25} stagger={0.02} duration={0.18} />
              <ArrowRight className="w-4 h-4 text-[#103B5C] group-hover:translate-x-1 transition-transform handwriting-icon" style={{ animationDelay: '0.55s' }} />
            </button>

            {/* 2. Research Paper Button */}
            <a
              href={RESEARCH_PAPER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 rounded-full bg-white/70 hover:bg-white text-[#103B5C] hover:text-[#092B47] border border-[#111111]/30 hover:border-[#103B5C] font-mono font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-2.5 cursor-pointer active:scale-95 group backdrop-blur-md"
              title="View Research Paper on arXiv (opens in new tab)"
            >
              <FileText className="w-4 h-4 text-[#399DBA] group-hover:scale-110 transition-transform handwriting-icon" style={{ animationDelay: '0.28s' }} />
              <HandwritingText text="Research Paper" delay={0.32} stagger={0.02} duration={0.18} />
              <ArrowUpRight className="w-4 h-4 text-[#103B5C] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform handwriting-icon" style={{ animationDelay: '0.62s' }} />
            </a>
          </div>

          {/* Right: Premium Clinical Profile Dropdown (Top-Right Corner of Navbar) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto z-10">
            <ClinicalProfileDropdown onNavigate={handleItemSelect} />
          </div>
        </div>

        {/* Mobile Navigation Buttons (Enter Workspace & Research Paper) */}
        <div className="md:hidden flex flex-wrap items-center justify-center gap-2.5 mt-3 py-1">
          <button
            type="button"
            onClick={() => handleItemSelect('upload')}
            className="px-4 py-2 rounded-full bg-white/70 hover:bg-white text-[#103B5C] border border-[#111111]/30 font-mono font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 group backdrop-blur-md"
            title="Enter Neuro Resonence AI Workspace (AI Segmentation)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#399DBA] handwriting-icon" style={{ animationDelay: '0.22s' }} />
            <HandwritingText text="Enter Workspace" delay={0.25} stagger={0.02} duration={0.18} />
            <ArrowRight className="w-3.5 h-3.5 text-[#103B5C] handwriting-icon" style={{ animationDelay: '0.55s' }} />
          </button>

          <a
            href={RESEARCH_PAPER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full bg-white/70 hover:bg-white text-[#103B5C] border border-[#111111]/30 font-mono font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 group backdrop-blur-md"
            title="View Research Paper on arXiv (opens in new tab)"
          >
            <FileText className="w-3.5 h-3.5 text-[#399DBA] handwriting-icon" style={{ animationDelay: '0.28s' }} />
            <HandwritingText text="Research Paper" delay={0.32} stagger={0.02} duration={0.18} />
            <ArrowUpRight className="w-3.5 h-3.5 text-[#103B5C] handwriting-icon" style={{ animationDelay: '0.62s' }} />
          </a>
        </div>
      </header>

      {/* ========================================================
          2. MIDDLE SECTION: CENTRAL 3D BRAIN
          ======================================================== */}
      <main className="flex-1 w-full mx-auto flex items-center justify-center relative z-10 min-h-0">
        {/* Middle Center: Large Realistic Orange 3D Brain */}
        <div className="flex-1 flex items-center justify-center relative min-h-0 min-w-0">
          <InteractiveBrainHero />
        </div>
      </main>

      {/* Mobile View: Stationary Educational Facts (Stationary, guaranteed >= 20px gap from borders) */}
      <div className="flex md:hidden flex-col gap-3 px-6 py-1.5 w-full max-w-sm mx-auto text-left z-20 shrink-0 select-none">
        {/* Fact 1 */}
        <div className="border-l border-[#103B5C] pl-3 text-xs font-medium text-[#25313D] leading-snug handwriting-fact-border" style={{ animationDelay: '1.60s' }}>
          <p><HandwritingText text="Your brain generates ~20 watts of power," delay={1.65} stagger={0.014} duration={0.15} /></p>
          <p><HandwritingText text="enough to light a small bulb." delay={1.95} stagger={0.014} duration={0.15} /></p>
        </div>

        {/* Fact 2 */}
        <div className="border-l border-[#103B5C] pl-3 text-xs font-medium text-[#25313D] leading-snug handwriting-fact-border" style={{ animationDelay: '2.10s' }}>
          <p><HandwritingText text="A brain tumor is an abnormal growth of cells" delay={2.15} stagger={0.014} duration={0.15} /></p>
          <p><HandwritingText text="that can affect thinking, memory, and vision." delay={2.45} stagger={0.014} duration={0.15} /></p>
        </div>
      </div>

      {/* ========================================================
          3. BOTTOM SECTION: "Soundless. Alive." & GITHUB LINK
          ======================================================== */}
      <footer className="w-full px-[20px] pb-[20px] pt-2 relative z-20 shrink-0">
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          {/* Bottom Left: "Soundless. Alive." Composition with 3D Cancer Cell positioned above */}
          <div className="flex flex-col text-left relative">
            {/* 3D Cancer Cell: moved exactly 30px upward and 30px to the right */}
            <div
              className="block absolute bottom-[calc(100%+55px)] left-[40px] z-30 pointer-events-auto"
            >
              <InteractiveCancerCell />
            </div>

            {/* Top Line: Soundless. */}
            <div
              className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] font-bold tracking-normal leading-[1.05] text-[#111827] dark:text-white font-audiowide"
              style={{ fontFamily: '"Audiowide", cursive, system-ui, sans-serif' }}
            >
              <HandwritingText text="Soundless." delay={0.60} stagger={0.035} duration={0.22} />
            </div>

            {/* Second Line: Alive. + Divider + Subtitle */}
            <div className="flex items-center gap-3 sm:gap-3.5 mt-0.5 sm:mt-1">
              <div
                className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] font-bold tracking-normal leading-[1.05] text-[#111827] dark:text-white font-audiowide shrink-0"
                style={{ fontFamily: '"Audiowide", cursive, system-ui, sans-serif' }}
              >
                <HandwritingText text="Alive." delay={1.10} stagger={0.035} duration={0.22} />
              </div>

              {/* Thin Vertical Divider with Smooth Reveal */}
              <div
                className="h-6 sm:h-7 w-[1.5px] bg-[#103B5C]/75 dark:bg-white/75 shrink-0 self-center handwriting-divider"
                style={{ animationDelay: '1.25s' }}
              />

              {/* Supporting Subtitle */}
              <div className="text-[11px] sm:text-xs lg:text-[13px] font-normal text-[#164D70] dark:text-[#98D9CE] leading-tight select-none">
                <div>
                  <HandwritingText text="A thousand small movements." delay={1.30} stagger={0.018} duration={0.16} />
                </div>
                <div>
                  <HandwritingText text="One living sculpture." delay={1.65} stagger={0.018} duration={0.16} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Right: GitHub Project Link with Educational Facts anchored 100px above */}
          <div className="relative flex flex-col items-end">
            {/* Desktop Facts: Positioned exactly 100px above GitHub link & 40px from right border */}
            <div className="hidden md:flex flex-col gap-6 justify-center text-left shrink-0 w-max z-20 absolute bottom-[calc(100%+100px)] right-[20px] pointer-events-auto select-none">
              {/* Fact 1 */}
              <div className="border-l border-[#103B5C] pl-4 text-xs lg:text-sm font-medium text-[#25313D] leading-snug whitespace-nowrap handwriting-fact-border" style={{ animationDelay: '1.60s' }}>
                <p><HandwritingText text="Your brain generates" delay={1.65} stagger={0.015} duration={0.15} /></p>
                <p><HandwritingText text="~20 watts of power," delay={1.85} stagger={0.015} duration={0.15} /></p>
                <p><HandwritingText text="enough to light a small bulb." delay={2.05} stagger={0.015} duration={0.15} /></p>
              </div>

              {/* Fact 2 */}
              <div className="border-l border-[#103B5C] pl-4 text-xs lg:text-sm font-medium text-[#25313D] leading-snug whitespace-nowrap handwriting-fact-border" style={{ animationDelay: '1.90s' }}>
                <p><HandwritingText text="A brain tumor is an abnormal" delay={1.95} stagger={0.014} duration={0.15} /></p>
                <p><HandwritingText text="growth of cells in the brain" delay={2.15} stagger={0.014} duration={0.15} /></p>
                <p><HandwritingText text="that can affect thinking," delay={2.35} stagger={0.014} duration={0.15} /></p>
                <p><HandwritingText text="memory, movement, and vision." delay={2.55} stagger={0.014} duration={0.15} /></p>
              </div>
            </div>

            <a
              href="https://github.com/RahulNag-V/Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1B6284] hover:text-[#103B5C] hover:opacity-80 transition-opacity cursor-pointer group pb-1 shrink-0"
              title="View project on GitHub"
            >
              <GithubIcon className="w-5 h-5 shrink-0 text-[#1B6284] handwriting-icon" style={{ animationDelay: '2.15s' }} />
              <HandwritingText text="View project on GitHub" delay={2.20} stagger={0.02} duration={0.18} as="span" />
              <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform text-[#1B6284] handwriting-icon" style={{ animationDelay: '2.75s' }} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
