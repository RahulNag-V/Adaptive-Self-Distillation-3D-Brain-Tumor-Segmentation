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
  Film
} from 'lucide-react';
import { useServerStatus } from '../hooks/useServerStatus';
import VoiceControlWidget from '../components/VoiceControlWidget';
import { useVoiceContext } from '../context/VoiceControlContext';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload Scan', icon: UploadCloud },
  { id: 'viewer', label: '3D Viewer', icon: Box },
  { id: 'adaptive', label: 'Adaptive Learning', icon: RefreshCw },
  { id: 'classify', label: '2D Classification', icon: ImageIcon },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'about', label: 'About', icon: Info },
];

const ROUTE_METADATA = {
  overview: {
    section: 'WORKSPACE',
    title: 'Platform Overview & Experimental Setup',
    subtitle: 'Adaptive Self-Distillation • UNETR 3D • EfficientNet-B0 2D',
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
  results: {
    section: 'QUANTITATIVE REPORT',
    title: 'Volumetric Burden & Validation Metrics',
    subtitle: 'Dice Similarity Coefficients, HD95 & tissue compartment volumes',
  },
  about: {
    section: 'SPECIFICATIONS',
    title: 'Research Methodology & Model Architecture',
    subtitle: 'MONAI UNETR ViT, EMA loss balancing & BraTS 2021 cohort',
  },
};

export default function AppLayout({ activeTab, onTabChange, onPlayIntro, children }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const currentMeta = ROUTE_METADATA[activeTab] || ROUTE_METADATA.overview;
  const { voiceControl } = useVoiceContext();
  
  // Collapsible sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neurovision_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const { status: serverStatus } = useServerStatus();

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

  return (
    <div className="flex h-screen bg-medical-darkest text-medical-text overflow-hidden font-sans">
      {/* MOBILE DRAWER BACKDROP */}
      {mobileDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* CHATGPT-STYLE COLLAPSIBLE SIDEBAR */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-medical-base border-r border-medical-border/80 flex flex-col justify-between transition-[width,transform] duration-300 ease-in-out select-none ${
          /* Mobile Drawer Positioning */
          mobileDrawerOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          /* Desktop Width Toggle */
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'
        }`}
      >
        {/* TOP SECTION: BRANDING & SIDEBAR TOGGLE */}
        <div className="flex flex-col min-h-0">
          {/* Header Bar */}
          <div className={`h-16 border-b border-medical-border/70 flex items-center shrink-0 px-3.5 ${
            isCollapsed ? 'lg:justify-center' : 'justify-between'
          }`}>
            {/* Expanded Header: Logo + Product Name */}
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'lg:hidden' : 'flex'}`}>
              <img 
                src="/logo-circle.png" 
                alt="NeuroVision AI Logo" 
                className="w-9 h-9 rounded-full object-cover shrink-0 shadow-md ring-1 ring-medical-teal/40 hover:scale-105 transition-transform" 
              />
              <div className="min-w-0 truncate">
                <div className="font-bold text-base tracking-tight text-white flex items-center gap-1 leading-tight truncate">
                  <span>NeuroVision</span>
                  <span className="text-medical-teal">AI</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-medical-muted font-mono block -mt-0.5 truncate">
                  AI For A Healthier Tomorrow
                </span>
              </div>
            </div>

            {/* Collapsed Header: Centered Logo with Expand Tooltip/Action */}
            {isCollapsed && (
              <div className="hidden lg:flex items-center justify-center">
                <button
                  onClick={toggleSidebar}
                  className="p-1 rounded-full text-medical-muted hover:ring-2 hover:ring-medical-teal/60 transition-all group"
                  title="Expand sidebar • NeuroVision AI"
                  aria-label="Expand sidebar"
                >
                  <img 
                    src="/logo-circle.png" 
                    alt="NeuroVision AI Logo" 
                    className="w-9 h-9 rounded-full object-cover shrink-0 shadow-md group-hover:scale-105 transition-transform" 
                  />
                </button>
              </div>
            )}

            {/* Expanded Header Controls: Desktop Collapse Button & Mobile Close Button */}
            <div className={`flex items-center gap-1 ${isCollapsed ? 'lg:hidden' : 'flex'}`}>
              {/* Desktop Collapse Button */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-1.5 rounded-lg text-medical-muted hover:text-white hover:bg-medical-surface border border-transparent hover:border-medical-border/70 transition-colors"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>

              {/* Mobile Close Button */}
              <button 
                className="lg:hidden p-1.5 rounded-lg text-medical-muted hover:text-white hover:bg-medical-surface"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* QUICK-ACTION SECTION (Inspired by ChatGPT's "+ New Chat") */}
          <div className={`p-3 shrink-0 ${isCollapsed ? 'lg:px-2.5' : ''}`}>
            {!isCollapsed ? (
              <button
                onClick={() => handleNavClick('upload')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-medical-teal/15 hover:bg-medical-teal/25 border border-medical-teal/40 text-medical-tealLight text-xs font-semibold transition-all shadow-sm group text-left"
                title="Start a new MRI scan analysis"
              >
                <Plus className="w-4 h-4 text-medical-teal group-hover:rotate-90 transition-transform shrink-0" />
                <span className="truncate">New Scan Analysis</span>
              </button>
            ) : (
              <div className="relative group flex justify-center">
                <button
                  onClick={() => handleNavClick('upload')}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-medical-teal/15 hover:bg-medical-teal/25 border border-medical-teal/40 text-medical-tealLight transition-all shadow-sm group"
                  aria-label="New Scan Analysis"
                >
                  <Plus className="w-4 h-4 text-medical-teal group-hover:rotate-90 transition-transform" />
                </button>
                {/* Floating Tooltip */}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-medical-card border border-medical-border text-xs text-white shadow-xl z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2">
                  <span className="font-semibold text-medical-tealLight">New Scan Analysis</span>
                </div>
              </div>
            )}
          </div>

          {/* MAIN NAVIGATION LIST */}
          <nav className={`space-y-1 px-3 overflow-y-auto ${isCollapsed ? 'lg:px-2.5' : ''}`}>
            {!isCollapsed && (
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-medical-muted/60 font-mono">
                Navigation
              </div>
            )}

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (isCollapsed) {
                /* COLLAPSED ICON RAIL ITEM (Centered with floating tooltip) */
                return (
                  <div key={item.id} className="relative group flex justify-center">
                    <button
                      onClick={() => handleNavClick(item.id)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                        isActive
                          ? 'bg-medical-teal/20 text-medical-tealLight border border-medical-teal/50 shadow-sm shadow-medical-teal/10'
                          : 'text-medical-muted hover:text-white hover:bg-medical-surface'
                      }`}
                      aria-label={item.label}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-medical-teal' : 'text-medical-muted group-hover:text-white'}`} />
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-medical-teal" />
                      )}
                    </button>

                    {/* Floating Tooltip */}
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-medical-card border border-medical-border text-xs text-white shadow-xl z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-medical-teal" />}
                    </div>
                  </div>
                );
              }

              /* EXPANDED FULL ITEM (Clean, minimal, no bulky borders) */
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all relative group text-left ${
                    isActive
                      ? 'bg-medical-teal/15 text-medical-tealLight font-semibold shadow-sm'
                      : 'text-medical-muted hover:text-white hover:bg-medical-surface/80'
                  }`}
                >
                  {/* Crisp active left indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-medical-teal" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-medical-teal' : 'text-medical-muted group-hover:text-white'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SECTION: RESTRAINED STATUS & ARCHITECTURE AREA */}
        <div className={`border-t border-medical-border/70 shrink-0 bg-medical-darkest/40 ${
          isCollapsed ? 'p-2.5 flex justify-center' : 'p-3'
        }`}>
          {!isCollapsed ? (
            /* EXPANDED BOTTOM STATUS PROFILE */
            <div className="p-2.5 rounded-lg bg-medical-card/80 border border-medical-border/60 hover:border-medical-border text-xs space-y-1.5 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-medical-muted/80">Architecture</span>
                <Cpu className="w-3.5 h-3.5 text-medical-cyan shrink-0" />
              </div>
              <div className="font-semibold text-white text-xs truncate">
                Adaptive Self-Distillation
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-medical-border/50">
                <span className="text-[10px] text-medical-muted font-mono truncate">UNETR + MONAI</span>
                <span className="inline-flex items-center gap-1.5 shrink-0 font-medium text-[10px]">
                  {serverStatus === 'ready' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 font-semibold">Engine Ready</span>
                    </>
                  ) : serverStatus === 'checking' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-amber-400">Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-amber-400">UI Demo</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          ) : (
            /* COLLAPSED BOTTOM STATUS BUTTON (With hovering details card) */
            <div className="relative group flex justify-center">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-medical-surface/80 border border-medical-border/80 hover:border-medical-teal/40 transition-colors"
                aria-label="Engine Status"
              >
                <Cpu className="w-4 h-4 text-medical-cyan" />
                <span 
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-medical-base ${
                    serverStatus === 'ready' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
              </button>

              {/* Floating Architecture & Status Card */}
              <div className="absolute left-full bottom-0 ml-3 w-56 p-3 rounded-lg bg-medical-card border border-medical-border text-xs text-white shadow-2xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 space-y-2">
                <div className="flex items-center justify-between border-b border-medical-border/60 pb-1.5">
                  <span className="font-semibold text-white">Adaptive UNETR</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-medical-surface text-medical-tealLight">
                    GPU
                  </span>
                </div>
                <div className="text-[11px] text-medical-muted font-mono space-y-0.5">
                  <div>Framework: MONAI 1.6</div>
                  <div>Backend: PyTorch 2.11 + CUDA</div>
                </div>
                <div className="pt-1.5 border-t border-medical-border/60 flex items-center justify-between text-[11px]">
                  <span className="text-medical-muted">Engine:</span>
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
        {/* Top Clinical Header */}
        <header className="h-16 bg-medical-base border-b border-medical-border px-4 lg:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-medical-muted hover:text-white hover:bg-medical-surface"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-medical-teal px-1.5 py-0.2 rounded bg-medical-teal/10 border border-medical-teal/20">
                  {currentMeta.section}
                </span>
                <h1 className="text-sm lg:text-base font-semibold text-white tracking-tight truncate">
                  {currentMeta.title}
                </h1>
              </div>
              <p className="text-xs text-medical-muted mt-0.5 truncate hidden sm:block">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Voice Control Clinical HUD Widget */}
            <VoiceControlWidget voiceControl={voiceControl} activeTab={activeTab} />

            {/* Play Intro Button */}
            {onPlayIntro && (
              <button
                onClick={onPlayIntro}
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-border hover:border-medical-teal/40 text-medical-muted hover:text-white text-[11px] font-mono transition-all shadow-sm"
                title="Play 4K Cinematic Intro Video"
              >
                <Film className="w-3.5 h-3.5 text-medical-teal" />
                <span className="hidden sm:inline font-medium">Intro</span>
              </button>
            )}

            {/* Study Cohort Tag */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-medical-card border border-medical-border text-[11px] font-mono text-medical-muted">
              <span className="text-white font-medium">BraTS2021</span>
              <span className="text-medical-border">•</span>
              <span className="text-medical-cyan">1.0mm³ Iso</span>
            </div>

            {/* Server & Engine Status indicator badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-medical-card border border-medical-border text-xs shadow-sm">
              <span className={`w-2 h-2 rounded-full ${
                serverStatus === 'ready' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              <span className={`font-medium text-[11px] ${
                serverStatus === 'ready' ? 'text-emerald-300' : 'text-amber-300'
              }`}>
                {serverStatus === 'ready' ? 'Engine Ready' : 'Connecting...'}
              </span>
              {serverStatus === 'offline' && (
                <span className="text-[10px] text-amber-400/90 font-mono border-l border-medical-border pl-2">
                  (Demo Mode)
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-medical-darkest">
          {children}
        </main>
      </div>
    </div>
  );
}
