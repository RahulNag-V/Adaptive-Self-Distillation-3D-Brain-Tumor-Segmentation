import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useServerStatus } from '../hooks/useServerStatus';
import VoiceControlWidget from '../components/VoiceControlWidget';
import GestureControlWidget from '../components/GestureControlWidget';
import { useVoiceContext } from '../context/VoiceControlContext';

const NAV_ITEMS = [
  { id: 'overview', label: 'Home / Overview', icon: LayoutDashboard },
  { id: 'viewer', label: '3D Workspace', icon: Box },
  { id: 'upload', label: 'AI Segmentation', icon: UploadCloud },
  { id: 'models', label: 'Model Lab', icon: Cpu },
  { id: 'analytics', label: 'Analytics', icon: Activity },
  { id: 'adaptive', label: 'Adaptive Learning', icon: RefreshCw },
  { id: 'classify', label: '2D Pathology', icon: ImageIcon },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'about', label: 'About & Viva', icon: Info },
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
    title: 'Display Preferences & Touchless Interaction',
    subtitle: 'MPR crosshairs, natural language voice control & sterile hand gesture system',
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

export default function AppLayout({ activeTab, onTabChange, onPlayIntro, children }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const currentMeta = ROUTE_METADATA[activeTab] || ROUTE_METADATA.overview;
  const { voiceControl, registerLayoutHandler } = useVoiceContext();
  
  // Collapsible sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neurovision_sidebar_collapsed') === 'true';
    }
    return false;
  });

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

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('neurovision_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const handleNavClick = (id) => {
    onTabChange(id);
    setMobileDrawerOpen(false);
  };

  const isViewerTab = activeTab === 'viewer';

  return (
    <div className="flex h-screen bg-[#F7FAFC] text-[#16324F] overflow-hidden font-sans">
      {/* MOBILE DRAWER BACKDROP */}
      {mobileDrawerOpen && (
        <div 
          className="fixed inset-0 bg-[#16324F]/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* REFINED MEDICAL SAAS SIDEBAR */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-white border-r border-[#DCE6F0] shadow-sm flex flex-col justify-between transition-[width,transform] duration-250 ease-in-out select-none ${
          mobileDrawerOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'
        }`}
      >
        {/* TOP SECTION: BRANDING & NAVIGATION */}
        <div className="flex flex-col min-h-0">
          {/* Header Bar */}
          <div className={`h-16 border-b border-[#DCE6F0] flex items-center shrink-0 px-3.5 bg-white ${
            isCollapsed ? 'lg:justify-center' : 'justify-between'
          }`}>
            {/* Expanded Header: Logo + Product Name */}
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'lg:hidden' : 'flex'}`}>
              <img 
                src="/logo-circle.png" 
                alt="NeuroVision AI Logo" 
                className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm ring-1 ring-[#2563EB]/30 hover:scale-105 transition-transform" 
              />
              <div className="min-w-0 truncate">
                <div className="font-bold text-base tracking-tight text-[#16324F] flex items-center gap-1 leading-tight truncate">
                  <span>NeuroVision</span>
                  <span className="text-[#2563EB]">AI</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-mono block -mt-0.5 truncate font-medium">
                  Clinical AI Platform
                </span>
              </div>
            </div>

            {/* Collapsed Header: Centered Logo with Expand Tooltip */}
            {isCollapsed && (
              <div className="hidden lg:flex items-center justify-center">
                <button
                  onClick={toggleSidebar}
                  className="p-1 rounded-full text-[#64748B] hover:ring-2 hover:ring-[#2563EB]/40 transition-all group"
                  title="Expand sidebar • NeuroVision AI"
                  aria-label="Expand sidebar"
                >
                  <img 
                    src="/logo-circle.png" 
                    alt="NeuroVision AI Logo" 
                    className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm group-hover:scale-105 transition-transform" 
                  />
                </button>
              </div>
            )}

            {/* Expanded Header Controls */}
            <div className={`flex items-center gap-1 ${isCollapsed ? 'lg:hidden' : 'flex'}`}>
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-1.5 rounded-lg text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8] transition-colors"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>

              <button 
                className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8]"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* QUICK-ACTION SECTION */}
          <div className={`p-3 shrink-0 ${isCollapsed ? 'lg:px-2.5' : ''}`}>
            {!isCollapsed ? (
              <button
                onClick={() => handleNavClick('upload')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-all shadow-sm group text-left"
                title="Start a new MRI scan analysis"
              >
                <Plus className="w-4 h-4 text-white group-hover:rotate-90 transition-transform shrink-0" />
                <span className="truncate">New Scan Analysis</span>
              </button>
            ) : (
              <div className="relative group flex justify-center">
                <button
                  onClick={() => handleNavClick('upload')}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-all shadow-sm group"
                  aria-label="New Scan Analysis"
                >
                  <Plus className="w-4 h-4 text-white group-hover:rotate-90 transition-transform" />
                </button>
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#16324F] text-xs text-white shadow-xl z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2">
                  <span className="font-semibold">New Scan Analysis</span>
                </div>
              </div>
            )}
          </div>

          {/* MAIN NAVIGATION LIST */}
          <nav className={`space-y-0.5 px-3 overflow-y-auto ${isCollapsed ? 'lg:px-2.5' : ''}`}>
            {!isCollapsed && (
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] font-mono">
                Workspace
              </div>
            )}

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (isCollapsed) {
                return (
                  <div key={item.id} className="relative group flex justify-center my-0.5">
                    <button
                      onClick={() => handleNavClick(item.id)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#E3EEFF] text-[#2563EB] shadow-sm font-semibold'
                          : 'text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8]'
                      }`}
                      aria-label={item.label}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#16324F]'}`} />
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#2563EB]" />
                      )}
                    </button>

                    <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#16324F] text-xs text-white shadow-xl z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all relative group text-left ${
                    isActive
                      ? 'bg-[#E3EEFF] text-[#2563EB] font-semibold shadow-xs'
                      : 'text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#2563EB]" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#16324F]'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SECTION: SYSTEM TELEMETRY */}
        <div className={`border-t border-[#DCE6F0] shrink-0 bg-[#F7FAFC] ${
          isCollapsed ? 'p-2.5 flex justify-center' : 'p-3'
        }`}>
          {!isCollapsed ? (
            <div className="p-3 rounded-xl bg-white border border-[#DCE6F0] shadow-2xs text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">Engine</span>
                <Cpu className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              </div>
              <div className="font-semibold text-[#16324F] text-xs truncate">
                Adaptive Self-Distillation
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#EEF4F8]">
                <span className="text-[10px] text-[#64748B] font-mono">UNETR + MONAI</span>
                <span className="inline-flex items-center gap-1.5 shrink-0 font-medium text-[10px]">
                  {serverStatus === 'ready' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16866A]" />
                      <span className="text-[#16866A] font-semibold">Ready</span>
                    </>
                  ) : serverStatus === 'checking' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F] animate-pulse" />
                      <span className="text-[#B7791F]">Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F]" />
                      <span className="text-[#B7791F]">UI Demo</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="relative group flex justify-center">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#DCE6F0] hover:border-[#2563EB]/40 transition-colors shadow-2xs"
                aria-label="Engine Status"
              >
                <Cpu className="w-4 h-4 text-[#2563EB]" />
                <span 
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white ${
                    serverStatus === 'ready' ? 'bg-[#16866A]' : 'bg-[#B7791F]'
                  }`}
                />
              </button>

              <div className="absolute left-full bottom-0 ml-3 w-56 p-3 rounded-xl bg-[#16324F] text-xs text-white shadow-2xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="font-semibold text-white">Adaptive UNETR</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#7DD3FC]">
                    GPU FP16
                  </span>
                </div>
                <div className="text-[11px] text-[#A7B5C8] font-mono space-y-0.5">
                  <div>Framework: MONAI 1.6</div>
                  <div>Backend: PyTorch 2.11 + CUDA</div>
                </div>
                <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-[#A7B5C8]">Engine:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {serverStatus === 'ready' ? 'Ready (Active)' : 'Offline / Demo'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#DCE6F0] px-4 lg:px-6 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#2563EB] px-2 py-0.5 rounded-md bg-[#E3EEFF] border border-[#BFDBFE]">
                  {currentMeta.section}
                </span>
                <h1 className="text-sm lg:text-base font-bold text-[#16324F] tracking-tight truncate">
                  {currentMeta.title}
                </h1>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5 truncate hidden sm:block">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Voice Control Widget */}
            <VoiceControlWidget voiceControl={voiceControl} activeTab={activeTab} />

            {/* Contactless Hand Gesture Widget */}
            <GestureControlWidget onNavigateSettings={handleNavClick} />

            {/* Play Intro Button */}
            {onPlayIntro && (
              <button
                onClick={onPlayIntro}
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-[#64748B] hover:text-[#16324F] text-[11px] font-mono transition-all shadow-2xs"
                title="Play 4K Cinematic Intro Video"
              >
                <Film className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="hidden sm:inline font-medium">Intro</span>
              </button>
            )}

            {/* Study Cohort Tag */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#EEF4F8] border border-[#DCE6F0] text-[11px] font-mono text-[#64748B]">
              <span className="text-[#16324F] font-semibold">BraTS2021</span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="text-[#06B6D4] font-medium">1.0mm³ Iso</span>
            </div>

            {/* Engine Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#DCE6F0] text-xs shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${
                serverStatus === 'ready' ? 'bg-[#16866A]' : 'bg-[#B7791F]'
              }`} />
              <span className={`font-semibold text-[11px] ${
                serverStatus === 'ready' ? 'text-[#16866A]' : 'text-[#B7791F]'
              }`}>
                {serverStatus === 'ready' ? 'Engine Ready' : 'Connecting...'}
              </span>
              {serverStatus === 'offline' && (
                <span className="text-[10px] text-[#B7791F] font-mono border-l border-[#DCE6F0] pl-2">
                  (Demo)
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content (Light SaaS background or Dark MRI Viewing Environment) */}
        <main className={`flex-1 overflow-y-auto ${
          isViewerTab ? 'bg-[#101B2D] text-[#F1F5F9] mri-viewport' : 'bg-[#F7FAFC] text-[#16324F]'
        }`}>
          <div className="animate-page-in h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
