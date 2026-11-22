import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Cpu,
  Box,
  UploadCloud,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  Activity,
  RefreshCw,
  Settings,
  Info,
  HelpCircle
} from 'lucide-react';
import { useServerStatus } from '../../hooks/useServerStatus';
import {
  Curve,
  NavLinkLetterText,
  menuSlideVariants,
  navItemVariants
} from '../ui/curved-menu';

const WORKSPACE_NAV_GROUPS = [
  {
    category: 'CLINICAL WORKSPACE',
    items: [
      { id: 'viewer', label: '3D Workspace', desc: 'Active multiplanar 3D volumetric workstation', icon: Box },
      { id: 'upload', label: 'AI Segmentation', desc: 'Multimodal NIfTI scan ingestion & inference', icon: UploadCloud },
      { id: 'results', label: 'Analysis Results', desc: 'Quantitative Dice & HD95 validation metrics', icon: CheckCircle2 },
      { id: 'classify', label: '2D Pathology', desc: 'EfficientNet-B0 slice classification', icon: ImageIcon },
      { id: 'reports', label: 'Clinical Reports', desc: 'Sub-compartment volumetrics & export', icon: FileText },
    ],
  },
  {
    category: 'RESEARCH & BENCHMARKS',
    items: [
      { id: 'models', label: 'Model Lab', desc: 'BraTS 2021 cohort evaluation & UNETR ViT', icon: Cpu },
      { id: 'analytics', label: 'Training Dynamics', desc: 'Multi-objective loss curves & convergence', icon: Activity },
      { id: 'adaptive', label: 'Adaptive Learning', desc: 'Human-in-the-loop clinical review queue', icon: RefreshCw },
    ],
  },
  {
    category: 'SYSTEM & SPECIFICATIONS',
    items: [
      { id: 'settings', label: 'Workstation Settings', desc: 'Display preferences & voice settings', icon: Settings },
      { id: 'about', label: 'Methodology & Viva', desc: 'MONAI UNETR ViT & EMA loss research', icon: Info },
      { id: 'faq', label: 'Frequently Asked Questions', desc: 'Architecture, clinical workflow & FAQs', icon: HelpCircle },
    ],
  },
];

export default function WorkspaceMenu({
  isOpen,
  onClose,
  activeTab = 'viewer',
  onNavigate,
}) {
  const containerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  const { status: serverStatus } = useServerStatus();

  // Determine theme color for seamless SVG curve fill
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const scrollContainer = document.getElementById('neurovision-main-scroll');
      const originalScrollOverflow = scrollContainer ? scrollContainer.style.overflow : '';
      if (scrollContainer) {
        scrollContainer.style.overflow = 'hidden';
      }

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        if (scrollContainer) {
          scrollContainer.style.overflow = originalScrollOverflow;
        }
      };
    }
  }, [isOpen]);

  // Focus management: Trap & restore focus
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement;
      if (closeBtnRef.current) {
        closeBtnRef.current.focus();
      }
    } else if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
      previouslyFocusedElementRef.current.focus();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Prevent immediate re-trigger if click was on the toggle button itself
        const toggleBtn = document.querySelector('[aria-label*="Workspace Navigation Menu"]');
        if (toggleBtn && toggleBtn.contains(e.target)) {
          return;
        }
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleItemClick = (id) => {
    onClose();
    if (onNavigate) {
      onNavigate(id);
    }
  };

  // Flattened index tracker for staggered animations across categories
  let globalItemIndex = 0;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed inset-0 bg-[#092B47]/60 backdrop-blur-xs z-50 cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Curved Sliding Navigation Panel */}
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace Navigation Menu"
            variants={menuSlideVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="fixed top-0 right-0 h-screen w-full max-w-sm sm:max-w-md bg-[#F4FCFA] dark:bg-[#092B47] text-[#111827] dark:text-slate-100 z-50 flex flex-col justify-between overflow-visible select-none shadow-[0_0_50px_rgba(9,43,71,0.22)] border-l border-transparent"
          >
            {/* Morphing Curved SVG Leading Edge */}
            <Curve color={isDarkMode ? '#092B47' : '#F4FCFA'} />

            {/* Header: Prominent Logo and Name Section */}
            <div className="h-16 px-4 bg-white/70 dark:bg-black/30 border-b border-[#111111]/20 dark:border-white/10 flex items-center justify-between shrink-0 z-10 pr-14">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => handleItemClick('overview')}
                  className="p-1.5 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 border border-[#111111]/10 dark:border-white/10 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                  title="Return to Neuro Resonence AI Homepage"
                >
                  <img
                    src="/nrai-logo.png"
                    alt="Neuro Resonence AI Logo"
                    className="w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain"
                  />
                </button>
                <div className="min-w-0">
                  <div className="font-bold text-sm sm:text-base text-[#103B5C] dark:text-slate-100 flex items-center gap-1.5 leading-snug tracking-tight">
                    <span>Neuro Resonence</span>
                    <span className="text-[#FF3030] font-black">AI</span>
                  </div>
                  <span className="text-[10px] sm:text-[10.5px] text-[#64748B] dark:text-slate-400 font-mono block -mt-0.5 truncate tracking-wide font-medium">
                    Workspace Navigation Menu
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Groups with Highlighted Categories (Zero Scrolling, Fits 1 Screen) */}
            <div className="flex-1 overflow-hidden px-3 py-2 space-y-2 z-10 flex flex-col justify-between">
              {WORKSPACE_NAV_GROUPS.map((group) => (
                <div key={group.category} className="space-y-0.5">
                  {/* Highlighted & Larger Category Banner */}
                  <div className="flex items-center justify-between px-2.5 py-1 mb-1 rounded-lg bg-[#399DBA]/10 dark:bg-[#399DBA]/20 border border-[#399DBA]/25 dark:border-[#399DBA]/35 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#399DBA] dark:bg-cyan-400 shadow-[0_0_6px_rgba(57,157,186,0.5)] shrink-0" />
                      <span className="text-[10.5px] sm:text-[11px] font-mono font-extrabold uppercase tracking-wider text-[#103B5C] dark:text-cyan-300 truncate">
                        {group.category}
                      </span>
                    </div>
                    <span className="text-[8.5px] font-mono font-semibold text-[#103B5C]/70 dark:text-teal-300/70 shrink-0 uppercase tracking-tight">
                      {group.items.length} {group.items.length === 1 ? 'module' : 'modules'}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const itemIndex = globalItemIndex++;
                      const isHovered = hoveredId === item.id;

                      return (
                        <motion.div
                          key={item.id}
                          custom={itemIndex}
                          variants={navItemVariants}
                          initial="initial"
                          animate="enter"
                          exit="exit"
                        >
                          <button
                            type="button"
                            onClick={() => handleItemClick(item.id)}
                            onMouseEnter={() => setHoveredId(item.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-left transition-all cursor-pointer ${isActive
                              ? 'bg-[#399DBA]/20 dark:bg-[#399DBA]/30 border border-[#399DBA] text-[#103B5C] dark:text-cyan-300 font-bold shadow-xs'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent text-[#111827] dark:text-slate-200'
                              }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1 rounded-md shrink-0 transition-colors ${isActive
                                ? 'bg-[#399DBA] text-white'
                                : 'bg-black/5 dark:bg-white/10 text-[#103B5C] dark:text-slate-300'
                                }`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate leading-tight flex items-center gap-1.5">
                                  {/* Letter-by-letter spring hover text */}
                                  <NavLinkLetterText text={item.label} isHovered={isHovered} />
                                  {isActive && (
                                    <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-[#103B5C] dark:bg-cyan-600 text-white font-mono font-bold">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9.5px] text-[#64748B] dark:text-slate-400 font-mono block truncate leading-none mt-0.5">
                                  {item.desc}
                                </span>
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Engine Telemetry Footer */}
            <div className="p-2.5 border-t border-[#111111]/20 dark:border-white/10 bg-white/60 dark:bg-black/20 shrink-0 z-10">
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[#111111]/10 dark:border-white/10 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Cpu className="w-3.5 h-3.5 text-[#103B5C] dark:text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-bold text-[#103B5C] dark:text-slate-200 truncate">
                      Adaptive UNETR • GPU FP16
                    </div>
                    <div className="text-[8.5px] text-[#64748B] dark:text-slate-400 font-mono truncate">
                      MONAI 1.6 • PyTorch + CUDA
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'ready' ? 'bg-[#059669]' : 'bg-[#D97706]'
                    }`} />
                  <span className="text-[9.5px] font-mono font-bold text-[#103B5C] dark:text-slate-200">
                    {serverStatus === 'ready' ? 'Ready' : 'UI Demo'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
