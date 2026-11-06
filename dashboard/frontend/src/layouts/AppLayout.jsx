import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  LayoutDashboard, 
  UploadCloud, 
  Box, 
  BarChart3, 
  Info, 
  Menu, 
  X, 
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Activity,
  Cpu,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Film,
  FileText,
  Settings,
  Sparkles,
  ArrowUp
} from 'lucide-react';
import { useServerStatus } from '../hooks/useServerStatus';
import VoiceButton from '../voice/VoiceButton';
import { useVoice } from '../voice/VoiceContext';
import { smoothScrollToTop } from '../utils/motion';

const NAV_GROUPS = [
  {
    category: 'CLINICAL WORKSPACE',
    items: [
      { id: 'viewer', label: '3D Workspace', icon: Box },
      { id: 'upload', label: 'AI Segmentation', icon: UploadCloud },
      { id: 'results', label: 'Analysis Results', icon: CheckCircle2 },
      { id: 'classify', label: '2D Pathology', icon: ImageIcon },
      { id: 'reports', label: 'Clinical Reports', icon: FileText },
    ],
  },
  {
    category: 'RESEARCH & BENCHMARKS',
    items: [
      { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard },
      { id: 'models', label: 'Model Lab', icon: Cpu },
      { id: 'analytics', label: 'Training Dynamics', icon: Activity },
      { id: 'adaptive', label: 'Adaptive Learning', icon: RefreshCw },
    ],
  },
  {
    category: 'SYSTEM & SPECIFICATIONS',
    items: [
      { id: 'settings', label: 'Workstation Settings', icon: Settings },
      { id: 'about', label: 'Methodology & Viva', icon: Info },
    ],
  },
];

const ROUTE_METADATA = {
  overview: {
    section: 'PLATFORM',
    title: 'Platform Overview & Clinical Setup',
    subtitle: 'Adaptive Self-Distillation • UNETR 3D • Multi-Modal MRI Benchmark',
  },
  upload: {
    section: 'INGESTION',
    title: 'Scan Ingestion & Pre-processing Pipeline',
    subtitle: 'Multimodal NIfTI (FLAIR, T1, T1ce, T2) & Volumetric CT',
  },
  viewer: {
    section: 'WORKSTATION',
    title: 'Multiplanar MPR & 3D Volumetric Segmentation',
    subtitle: 'Synchronized Axial, Coronal, Sagittal & Surface Mesh',
  },
  models: {
    section: 'BENCHMARK LAB',
    title: 'Baseline vs. Proposed Self-Distillation',
    subtitle: 'BraTS 2021 cohort evaluation • UNETR ViT-B/16 vs Online Tokenizer & Dense Predictor',
  },
  analytics: {
    section: 'TRAINING DYNAMICS',
    title: 'Multi-Objective Loss Dynamics & Convergence',
    subtitle: '10 Epochs • AdamW • Auxiliary Tokenizer & Dense Predictor loss progression',
  },
  adaptive: {
    section: 'SUPERVISORY QUEUE',
    title: 'Continual Distillation & Human-in-the-Loop',
    subtitle: 'Clinical review queue, model candidates & versioned promotion',
  },
  classify: {
    section: 'PATHOLOGY',
    title: '2D Brain MRI Slice Classification',
    subtitle: 'EfficientNet-B0 histopathological inference & class probabilities',
  },
  reports: {
    section: 'CLINICAL & RESEARCH REPORT',
    title: 'Quantitative Tumor Burden & Validation Report',
    subtitle: 'Sub-compartment volumetrics (cm³), orthogonal snapshots & print-ready export',
  },
  settings: {
    section: 'WORKSTATION CONFIG',
    title: 'Display Preferences & Voice Control',
    subtitle: 'MPR crosshairs, display settings & natural language voice control',
  },
  results: {
    section: 'QUANTITATIVE REPORT',
    title: 'Volumetric Burden & Validation Metrics',
    subtitle: 'Dice Similarity Coefficients, HD95 & tissue compartment volumes',
  },
  about: {
    section: 'SPECIFICATIONS',
    title: 'Research Methodology & Viva Presentation',
    subtitle: 'MONAI UNETR ViT, EMA loss balancing & BraTS 2021 cohort',
  },
};

function isEditableElement(target) {
  if (!target) return false;
  const tagName = target.tagName ? target.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) return true;
  if (typeof target.closest === 'function') {
    return !!target.closest('[contenteditable="true"], [contenteditable=""], [role="textbox"]');
  }
  return false;
}

export default function AppLayout({ activeTab, onTabChange, onPlayIntro, children }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const currentMeta = ROUTE_METADATA[activeTab] || ROUTE_METADATA.overview;
  const { registerLayoutHandler } = useVoice();
  
  // Collapsible sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neurovision_sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Track scroll position of main viewport for compact navbar and floating scroll-to-top
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const scrollEl = document.getElementById('neurovision-main-scroll');
    if (!scrollEl) return;

    let rafId = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        const top = scrollEl.scrollTop;
        setIsScrolled((prev) => top > (prev ? 16 : 36));
        setShowScrollTop(top > 300);
        rafId = null;
      });
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const { status: serverStatus } = useServerStatus();

  // Voice Control Layout Handler (Sidebar, Menu, Panels)
  useEffect(() => {
    if (!registerLayoutHandler) return;
    const unregister = registerLayoutHandler((action) => {
      if (action.type === 'TOGGLE_SIDEBAR') {
        setIsCollapsed((prev) => {
          const next = action.collapsed !== undefined ? action.collapsed : !prev;
          if (typeof window !== 'undefined') {
            localStorage.setItem('neurovision_sidebar_collapsed', String(next));
          }
          return next;
        });
      } else if (action.type === 'TOGGLE_MENU') {
        setMobileDrawerOpen((prev) => (action.open !== undefined ? action.open : !prev));
      }
    });
    return unregister;
  }, [registerLayoutHandler]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('neurovision_sidebar_collapsed', String(next));
      }
      return next;
    });
  }, []);

  // Global Ctrl+\ / Cmd+\ Keyboard Shortcut for Sidebar Collapse / Expansion
  // Preserves form typing inside input fields, textareas, selects, and contenteditable elements
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isBackslash = e.key === '\\' || e.code === 'Backslash';

      if (isCtrlOrMeta && isBackslash && !e.altKey) {
        if (isEditableElement(e.target)) return;

        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleSidebar]);

  const handleNavClick = (id) => {
    onTabChange(id);
    setMobileDrawerOpen(false);
  };

  const isViewerTab = activeTab === 'viewer';

  return (
    <div className="flex h-screen bg-[#080B12] text-[#F4F7FC] overflow-hidden font-sans">
      {/* MOBILE DRAWER BACKDROP (SMOOTH FADE) */}
      <div 
        className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
          mobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* REFINED CLINICAL WORKSTATION SIDEBAR */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-[#101722] border-r border-[#1C2636] shadow-clinical-md flex flex-col justify-between transition-all duration-300 ease-in-out select-none ${
          mobileDrawerOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-[68px]' : 'lg:w-64'
        }`}
      >
        {/* TOP SECTION: BRANDING & NAVIGATION */}
        <div className="flex flex-col min-h-0">
          {/* Header Bar */}
          <div className="h-14 border-b border-[#1C2636] flex items-center shrink-0 px-3.5 bg-[#101722] justify-between transition-all duration-300">
            {/* Logo + Product Name */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={isCollapsed ? toggleSidebar : undefined}
                className={`p-0.5 rounded-full ring-1 ring-[#4C8DFF]/30 hover:scale-105 transition-transform shrink-0 ${
                  isCollapsed ? 'cursor-pointer' : 'cursor-default'
                }`}
                title={isCollapsed ? "Expand sidebar • NeuroVision AI" : "NeuroVision AI Logo"}
              >
                <img 
                  src="/logo-circle.png" 
                  alt="NeuroVision AI Logo" 
                  className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" 
                />
              </button>
              
              <div className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap min-w-0 ${
                isCollapsed ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none' : 'max-w-[150px] opacity-100 translate-x-0'
              }`}>
                <div className="font-semibold text-sm tracking-tight text-[#F4F7FC] flex items-center gap-1 leading-tight truncate">
                  <span>NeuroVision</span>
                  <span className="text-[#4C8DFF]">AI</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#8496AC] font-mono block -mt-0.5 truncate font-medium">
                  Clinical AI Platform
                </span>
              </div>
            </div>

            {/* Collapse / Expand Toggle Button */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-1.5 rounded-lg text-[#8496AC] hover:text-[#F4F7FC] hover:bg-[#151E2B] transition-colors active:scale-95"
                title={isCollapsed ? "Expand sidebar (Ctrl+\\)" : "Collapse sidebar (Ctrl+\\)"}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-[#4C8DFF]" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>

              <button 
                className="lg:hidden p-1.5 rounded-lg text-[#8496AC] hover:text-[#F4F7FC] hover:bg-[#151E2B] active:scale-95 transition-transform"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* QUICK-ACTION BUTTON */}
          <div className="p-3 shrink-0 flex justify-center">
            <div className="relative group w-full flex justify-center">
              <button
                onClick={() => handleNavClick('upload')}
                className={`flex items-center rounded-xl bg-[#4C8DFF] hover:bg-[#3A7AEB] text-white text-xs font-semibold transition-all duration-300 shadow-clinical-sm active:scale-[0.98] group overflow-hidden ${
                  isCollapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full px-3 py-2.5 gap-2.5 justify-start'
                }`}
                title={isCollapsed ? undefined : "Start a new MRI scan analysis"}
                aria-label="New Scan Analysis"
              >
                <Plus className="w-4 h-4 text-white group-hover:rotate-90 transition-transform shrink-0" />
                <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap text-left ${
                  isCollapsed ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none' : 'max-w-[140px] opacity-100 translate-x-0'
                }`}>
                  New Scan Analysis
                </span>
              </button>

              {/* Collapsed Tooltip */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#151E2B] border border-[#243348] text-xs text-[#F4F7FC] shadow-clinical-lg z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2">
                  <span className="font-semibold">New Scan Analysis</span>
                </div>
              )}
            </div>
          </div>

          {/* MAIN NAVIGATION LIST (GROUPED HIERARCHY FOR ALL 11 APPLICATION VIEWS) */}
          <nav className="space-y-3 px-3 overflow-y-auto no-scrollbar pb-3">
            {NAV_GROUPS.map((group, gIdx) => (
              <div key={group.category} className="space-y-0.5">
                <div className={`px-2 text-[10px] font-bold uppercase tracking-wider text-[#8496AC] font-mono transition-all duration-300 overflow-hidden whitespace-nowrap ${
                  isCollapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-6 opacity-100 py-1'
                } ${gIdx > 0 ? 'mt-2' : ''}`}>
                  {group.category}
                </div>

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <div key={item.id} className="relative group flex justify-center my-0.5">
                      <button
                        onClick={() => handleNavClick(item.id)}
                        data-nav-id={item.id}
                        className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 relative group overflow-hidden active:scale-[0.98] ${
                          isCollapsed
                            ? 'w-10 h-10 p-0 justify-center'
                            : 'w-full px-3 py-2 gap-3 justify-start'
                        } ${
                          isActive
                            ? 'bg-[#151E2B] text-[#F4F7FC] font-semibold border-l-2 border-[#4C8DFF] shadow-xs'
                            : 'text-[#9BA9BA] hover:text-[#F4F7FC] hover:bg-[#151E2B]/70'
                        }`}
                        aria-label={item.label}
                      >
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-[#4C8DFF]' : 'text-[#8496AC] group-hover:text-[#F4F7FC]'
                        }`} />
                        <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap text-left ${
                          isCollapsed ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none' : 'max-w-[170px] opacity-100 translate-x-0'
                        }`}>
                          {item.label}
                        </span>
                      </button>

                      {/* Collapsed Tooltip */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#151E2B] border border-[#243348] text-xs text-[#F4F7FC] shadow-clinical-lg z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#4C8DFF]" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* BOTTOM SECTION: SYSTEM TELEMETRY */}
        <div className="border-t border-[#1C2636] shrink-0 bg-[#101722] p-3 flex justify-center transition-all duration-300">
          {isCollapsed ? (
            <div className="relative group flex justify-center">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#151E2B] border border-[#243348] hover:border-[#4C8DFF]/40 transition-colors shadow-clinical-sm relative active:scale-95"
                aria-label="Engine Status"
              >
                <Cpu className="w-4 h-4 text-[#4C8DFF]" />
                <span 
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-[#101722] ${
                    serverStatus === 'ready' ? 'bg-[#35B982]' : 'bg-[#F4B860]'
                  }`}
                />
              </button>

              <div className="absolute left-full bottom-0 ml-3 w-56 p-3 rounded-xl bg-[#151E2B] border border-[#243348] text-xs text-[#F4F7FC] shadow-clinical-lg z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 space-y-2">
                <div className="flex items-center justify-between border-b border-[#243348] pb-1.5">
                  <span className="font-semibold text-[#F4F7FC]">Adaptive UNETR</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101722] text-[#4C8DFF] border border-[#243348]">
                    GPU FP16
                  </span>
                </div>
                <div className="text-[11px] text-[#8496AC] font-mono space-y-0.5">
                  <div>Framework: MONAI 1.6</div>
                  <div>Backend: PyTorch 2.11 + CUDA</div>
                </div>
                <div className="pt-1.5 border-t border-[#243348] flex items-center justify-between text-[11px]">
                  <span className="text-[#8496AC]">Engine:</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#35B982]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#35B982]" />
                    {serverStatus === 'ready' ? 'Ready (Active)' : serverStatus === 'checking' ? 'Connecting...' : 'UI Demo'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-3 rounded-xl bg-[#151E2B] border border-[#243348] shadow-clinical-sm text-xs space-y-1.5 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8496AC] font-semibold">Engine</span>
                <Cpu className="w-3.5 h-3.5 text-[#4C8DFF] shrink-0" />
              </div>
              <div className="font-semibold text-[#F4F7FC] text-xs truncate">
                Adaptive Self-Distillation
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#243348]/60">
                <span className="text-[10px] text-[#8496AC] font-mono">UNETR + MONAI</span>
                <span className="inline-flex items-center gap-1.5 shrink-0 font-medium text-[10px]">
                  {serverStatus === 'ready' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#35B982]" />
                      <span className="text-[#35B982] font-semibold">Ready</span>
                    </>
                  ) : serverStatus === 'checking' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F4B860] animate-pulse" />
                      <span className="text-[#F4B860]">Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F4B860]" />
                      <span className="text-[#F4B860]">UI Demo</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
        {/* Top Header (Consistent Fixed Height: 56px / h-14) */}
        <header className="h-14 bg-[#101722]/95 backdrop-blur-md border-b border-[#1C2636] px-4 lg:px-6 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#8496AC] hover:text-[#F4F7FC] hover:bg-[#151E2B] active:scale-95 transition-transform"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div key={activeTab} className="min-w-0 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#4C8DFF] px-2 py-0.5 rounded-md bg-[#151E2B] border border-[#243348]">
                  {currentMeta.section}
                </span>
                <h1 className="text-sm lg:text-base font-semibold text-[#F4F7FC] tracking-tight truncate">
                  {currentMeta.title}
                </h1>
              </div>
              <p className="text-xs text-[#8496AC] mt-0.5 truncate hidden sm:block">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Voice Control Button Group */}
            <VoiceButton />

            {/* Play Intro Button */}
            {onPlayIntro && (
              <button
                onClick={onPlayIntro}
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#151E2B] hover:bg-[#1B2635] border border-[#243348] text-[#9BA9BA] hover:text-[#F4F7FC] text-[11px] font-mono transition-all duration-150 shadow-clinical-sm active:scale-95"
                title="Play 4K Cinematic Intro Video"
              >
                <Film className="w-3.5 h-3.5 text-[#4C8DFF]" />
                <span className="hidden sm:inline font-medium">Intro</span>
              </button>
            )}

            {/* Study Cohort Tag (Preserved Dynamic Metadata Structure) */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#151E2B] border border-[#243348] text-[11px] font-mono text-[#9BA9BA]">
              <span className="text-[#F4F7FC] font-semibold">BraTS2021</span>
              <span className="text-[#243348]">•</span>
              <span className="text-[#35C6B0] font-medium">1.0mm³ Iso</span>
            </div>

            {/* Engine Status Badge (Connected to dynamic useServerStatus hook) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#151E2B] border border-[#243348] text-xs shadow-clinical-sm transition-all">
              <span className={`w-2 h-2 rounded-full ${
                serverStatus === 'ready' ? 'bg-[#35B982]' : 'bg-[#F4B860]'
              }`} />
              <span className={`font-semibold text-[11px] ${
                serverStatus === 'ready' ? 'text-[#35B982]' : 'text-[#F4B860]'
              }`}>
                {serverStatus === 'ready' ? 'Engine Ready' : serverStatus === 'checking' ? 'Connecting...' : 'UI Demo'}
              </span>
              {serverStatus === 'offline' && (
                <span className="text-[10px] text-[#8496AC] font-mono border-l border-[#243348] pl-2">
                  (Demo)
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content (Unified Dark Clinical Canvas) */}
        <main id="neurovision-main-scroll" className={`flex-1 overflow-y-auto bg-[#080B12] text-[#F4F7FC] ${
          isViewerTab ? 'mri-viewport' : ''
        }`}>
          <div className="h-full">
            {children}
          </div>

          {/* Floating Smooth Scroll-to-Top Button */}
          {showScrollTop && (
            <button
              onClick={() => smoothScrollToTop()}
              type="button"
              className="fixed bottom-6 right-6 z-40 px-3 py-2 rounded-xl bg-[#151E2B]/95 hover:bg-[#1B2635] text-[#F4F7FC] hover:text-[#4C8DFF] border border-[#243348] shadow-clinical-md transition-all duration-200 active:scale-95 group flex items-center gap-1.5 text-xs font-mono animate-fadeIn backdrop-blur-sm"
              title="Smooth scroll to top"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-3.5 h-3.5 text-[#4C8DFF] group-hover:-translate-y-0.5 transition-transform" />
              <span className="font-semibold">Top</span>
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
