import React, { useState } from 'react';
import { 
  Brain, 
  LayoutDashboard, 
  UploadCloud, 
  Box, 
  BarChart3, 
  Info, 
  Menu, 
  X, 
  Activity,
  CheckCircle2,
  Cpu,
  Image as ImageIcon
} from 'lucide-react';
import { useServerStatus } from '../hooks/useServerStatus';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload Scan', icon: UploadCloud },
  { id: 'viewer', label: '3D Viewer', icon: Box },
  { id: 'classify', label: '2D Classification', icon: ImageIcon },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'about', label: 'About', icon: Info },
];

export default function AppLayout({ activeTab, onTabChange, children }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { status: serverStatus } = useServerStatus();

  const handleNavClick = (id) => {
    onTabChange(id);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="flex h-screen bg-medical-darkest text-medical-text overflow-hidden font-sans">
      {/* MOBILE BACKDROP */}
      {mobileDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-medical-base border-r border-medical-border flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Area */}
          <div className="h-16 px-6 border-b border-medical-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-medical-teal/15 border border-medical-teal/40 flex items-center justify-center text-medical-tealLight">
                <Brain className="w-5 h-5 text-medical-teal" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  NeuroSeg <span className="text-medical-teal">3D</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-medical-muted block -mt-1 font-mono">
                  Medical AI Platform
                </span>
              </div>
            </div>
            <button 
              className="lg:hidden p-1.5 rounded-lg text-medical-muted hover:text-white hover:bg-medical-surface"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-medical-muted/70 font-mono">
              Navigation
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-medical-teal/15 text-medical-tealLight border border-medical-teal/40 shadow-sm shadow-medical-teal/10'
                      : 'text-medical-muted hover:text-white hover:bg-medical-surface hover:border-medical-border border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-medical-teal' : 'text-medical-muted'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Model Info & Status */}
        <div className="p-4 border-t border-medical-border bg-medical-darkest/40">
          <div className="p-3.5 rounded-lg bg-medical-card border border-medical-border/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-medical-muted font-mono uppercase text-[10px] tracking-wider">Active Architecture</span>
              <Cpu className="w-3.5 h-3.5 text-medical-cyan" />
            </div>
            <div className="font-semibold text-white truncate">
              Adaptive Self-Distillation
            </div>
            <div className="text-[11px] text-medical-muted font-mono flex items-center gap-1.5">
              <span>UNETR + MONAI</span>
            </div>
            <div className="pt-2 border-t border-medical-border/60 flex items-center justify-between text-[11px]">
              <span className="text-medical-muted">Engine Status</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-medical-base border-b border-medical-border px-4 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-medical-muted hover:text-white hover:bg-medical-surface"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-semibold text-white tracking-tight leading-none">
                3D Brain Tumor Segmentation
              </h1>
              <p className="text-xs text-medical-muted mt-1 hidden sm:block">
                AI-assisted volumetric analysis • Multimodal MRI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-medical-card border border-medical-border text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-emerald-300 text-[11px]">Model Ready</span>
              {serverStatus === 'offline' && (
                <span className="text-[10px] text-amber-400/90 font-mono border-l border-medical-border pl-2">
                  (UI Demo Mode)
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
