import React, { useState, useEffect } from 'react';
import {
  ArrowUp,
  Box,
  UploadCloud,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  LayoutDashboard,
  Cpu,
  Activity,
  RefreshCw,
  Settings,
  Info,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import WorkspaceNavbar from '../components/workspace/WorkspaceNavbar';
import { smoothScrollToTop } from '../utils/motion';

export const NAV_GROUPS = [
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
      { id: 'faq', label: 'Frequently Asked Questions', icon: HelpCircle },
      { id: 'security', label: 'Privacy & Security', icon: ShieldCheck },
    ],
  },
];

export default function AppLayout({
  activeTab = 'overview',
  onTabChange,
  children,
}) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Monitor scroll for smooth scroll-to-top button
  useEffect(() => {
    const scrollContainer = document.getElementById('neurovision-main-scroll');
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (scrollContainer.scrollTop > 320) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const isViewerTab = activeTab === 'viewer';

  // Dedicated Full-Viewport Homepage Experience (Overview Page)
  if (activeTab === 'overview') {
    return (
      <div className="w-full min-h-screen md:h-screen overflow-y-auto md:overflow-hidden relative bg-[var(--app-background-deep-mint)]">
        {/* Precision Clinical Grid Lines */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          aria-hidden="true"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(16, 59, 92, 0.07) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(16, 59, 92, 0.07) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 w-full min-h-screen md:h-screen">
          {children}
        </div>
      </div>
    );
  }

  // Workstation Pages: AI Segmentation, 3D Workspace, Results, Model Lab, etc.
  // NO SIDEBAR across all pages; unified Workspace Navbar at top; Precision Clinical Grid Background everywhere.
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-[var(--app-background-deep-mint)] text-[#111827] font-sans relative">
      {/* Precision Clinical Grid Background across all pages including 3D Workspace */}
      <div
        className="fixed inset-0 pointer-events-none z-0 print:hidden"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(16, 59, 92, 0.07) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(16, 59, 92, 0.07) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Unified Professional Workspace Navbar across all pages */}
      <div className="print:hidden">
        <WorkspaceNavbar activeTab={activeTab} onNavigate={onTabChange} />
      </div>

      {/* Dynamic Page Content */}
      <main
        id="neurovision-main-scroll"
        className={`flex-1 min-h-0 relative z-10 w-full pt-14 print:pt-0 print:overflow-visible print:h-auto ${isViewerTab
          ? 'overflow-hidden mri-viewport flex flex-col'
          : 'overflow-y-auto'
          }`}
      >
        <div className={isViewerTab ? 'h-full flex-1 flex flex-col min-h-0' : 'min-h-full'}>
          {children}
        </div>

        {/* Floating Smooth Scroll-to-Top Button for long scrollable pages */}
        {showScrollTop && !isViewerTab && (
          <button
            onClick={() => smoothScrollToTop()}
            type="button"
            className="fixed bottom-6 right-6 z-40 print:hidden px-3 py-2 rounded-xl bg-white/60 hover:bg-[rgba(226,247,242,0.70)] text-[#103B5C] border border-[#111111]/30 shadow-md transition-all duration-200 active:scale-95 group flex items-center gap-1.5 text-xs font-mono animate-fadeIn backdrop-blur-sm cursor-pointer"
            title="Smooth scroll to top"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-3.5 h-3.5 text-[#103B5C] group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-bold">Top</span>
          </button>
        )}
      </main>
    </div>
  );
}
