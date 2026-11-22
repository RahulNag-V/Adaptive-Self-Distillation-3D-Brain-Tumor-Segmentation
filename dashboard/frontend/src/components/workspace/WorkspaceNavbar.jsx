import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  BookOpen,
  Sparkles,
  Cpu
} from 'lucide-react';
import { useVoice } from '../../voice/VoiceContext';
import VoiceManualModal from '../../voice/VoiceManualModal';
import WorkspaceMenu from './WorkspaceMenu';
import { MenuToggleButton } from '../ui/curved-menu';

const PAGE_CONFIG = {
  viewer: {
    title: '3D Workspace',
    description: 'Interactive MRI Visualization & Tumor Segmentation',
    badge: 'BraTS 2021',
  },
  upload: {
    title: 'AI Segmentation',
    description: 'Multimodal NIfTI Scan Ingestion & MONAI UNETR Pipeline',
    badge: 'UNETR 3D',
  },
  results: {
    title: 'Analysis Results',
    description: 'Quantitative Dice & HD95 Volumetric Validation Metrics',
    badge: 'BraTS 2021',
  },
  classify: {
    title: '2D Pathology',
    description: 'Histopathological Slice Classification & Probabilities',
    badge: 'EfficientNet',
  },
  reports: {
    title: 'Clinical Reports',
    description: 'Sub-Compartment Volumetrics & Print-Ready Export',
    badge: 'Report',
  },
  models: {
    title: 'Model Lab',
    description: 'Baseline UNETR vs Proposed Adaptive Self-Distillation',
    badge: 'ViT-B/16',
  },
  analytics: {
    title: 'Training Dynamics',
    description: 'Multi-Objective Loss Curves & Convergence Progress',
    badge: '10 Epochs',
  },
  adaptive: {
    title: 'Adaptive Learning',
    description: 'Continual Distillation & Human-in-the-Loop Review Queue',
    badge: 'Active Queue',
  },
  settings: {
    title: 'Workstation Settings',
    description: 'Display Preferences, Voice Controls & System Config',
    badge: 'Settings',
  },
  about: {
    title: 'Methodology & Viva',
    description: 'MONAI UNETR ViT, EMA Loss Balancing & BraTS 2021 Cohort',
    badge: 'Research',
  },
  faq: {
    title: 'Frequently Asked Questions',
    description: 'Clinical Workflow, Architecture & Research Answers',
    badge: 'Documentation',
  },
  security: {
    title: 'Privacy & Clinical Security',
    description: 'Data Protection, Zero-Cloud PHI & Governance Policy',
    badge: 'Security',
  },
  privacy: {
    title: 'Privacy & Clinical Security',
    description: 'Data Protection, Zero-Cloud PHI & Governance Policy',
    badge: 'Security',
  },
};

export default function WorkspaceNavbar({ activeTab = 'viewer', onNavigate }) {
  const {
    isListening,
    toggleListening,
    isSupported,
  } = useVoice();

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isWorkspaceFullscreen, setIsWorkspaceFullscreen] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.body.classList.contains('workspace-fullscreen-active');
    }
    return false;
  });

  // Hide navbar in fullscreen workspace mode
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const checkFullscreen = () => {
      setIsWorkspaceFullscreen(document.body.classList.contains('workspace-fullscreen-active'));
    };
    const handleFsEvent = (e) => {
      setIsWorkspaceFullscreen(!!e.detail?.isFullscreen);
    };

    window.addEventListener('workspace-fullscreen-change', handleFsEvent);
    const observer = new MutationObserver(checkFullscreen);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('workspace-fullscreen-change', handleFsEvent);
      observer.disconnect();
    };
  }, []);

  // Permanently stuck in place; track scroll only to subtly enhance frosted glass surface over passing content
  useEffect(() => {
    const scrollContainer = document.getElementById('neurovision-main-scroll');

    const handleScroll = () => {
      const currentScrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
      setIsScrolled(currentScrollY > 10);
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

  const config = PAGE_CONFIG[activeTab] || PAGE_CONFIG.viewer;

  if (isWorkspaceFullscreen) {
    return null;
  }

  return (
    <>
      <header
        className={`h-14 apple-glass-navbar print:hidden ${isScrolled ? 'scrolled' : ''} px-3 sm:px-4 lg:px-6 flex items-center justify-between shrink-0 select-none z-[60] relative`}
      >
        {/* ZONE 1: LEFT — Existing Neuro Resonence AI Logo and Name */}
        <div className="flex items-center gap-2.5 min-w-0 z-10">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('overview')}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-black/5 transition-all cursor-pointer group"
            title="Return to Neuro Resonence AI Homepage"
          >
            <img
              src="/nrai-logo.png"
              alt="Neuro Resonence AI Logo"
              className="w-8 h-8 object-contain filter drop-shadow-[0_0_6px_rgba(16,59,92,0.25)] group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="text-left">
              <div className="font-bold text-sm tracking-tight text-[#103B5C] flex items-center leading-none">
                <span>Neuro Resonence</span>
                <span className="text-[#FF3030] font-black ml-1">AI</span>
              </div>
              <span className="text-[10px] text-[#64748B] font-mono block tracking-wider uppercase">
                Medical AI Workstation
              </span>
            </div>
          </button>
        </div>

        {/* ZONE 2: CENTER — Placed precisely in the center of the application */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center px-2 pointer-events-none z-10 max-w-[50vw]">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-[#103B5C] animate-pulse shrink-0" />
            <h1 className="text-sm sm:text-base font-bold text-[#103B5C] tracking-tight truncate">
              {config.title}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/60 border border-[#111111]/20 text-[#103B5C] font-semibold hidden md:inline-block shrink-0">
              {config.badge}
            </span>
          </div>
          <p className="text-[11px] text-[#334155] font-mono truncate hidden sm:block pointer-events-auto">
            {config.description}
          </p>
        </div>

        {/* ZONE 3: RIGHT — In Exact Order: 1. Voice, 2. Manual, 3. Menu */}
        <div className="flex items-center gap-2 shrink-0 z-10 ml-auto">
          {/* 1. Voice — microphone icon and existing voice functionality */}
          <button
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? 'Stop Voice Control (Ctrl+V)' : 'Start Voice Control (Ctrl+V)'}
            title={isListening ? 'Stop Voice Recognition (Press Ctrl+V)' : 'Start Voice Control (Press Ctrl+V)'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${isListening
              ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm animate-pulse'
              : 'bg-white/50 hover:bg-white/80 border-[#111111]/30 text-[#103B5C]'
              }`}
          >
            <Mic className={`w-4 h-4 ${isListening ? 'text-rose-600 animate-bounce' : 'text-[#103B5C]'}`} />
            <span className="hidden md:inline">{isListening ? 'Listening...' : 'Voice'}</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-black/5 text-[#103B5C] font-mono hidden xl:inline">
              Ctrl+V
            </span>
          </button>

          {/* 2. Manual — book icon that opens workspace instructions */}
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            aria-label="Workspace Manual & Instructions"
            title="Workspace Instructions & Voice Command Manual"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/80 border border-[#111111]/30 text-[#103B5C] text-xs font-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-[#103B5C]" />
            <span className="hidden sm:inline">Manual</span>
          </button>

          {/* 3. Menu — animated hamburger into close (X) icon */}
          <MenuToggleButton
            isOpen={isWorkspaceMenuOpen}
            onClick={() => setIsWorkspaceMenuOpen((prev) => !prev)}
          />
        </div>
      </header>

      {/* Workspace Instructions & Voice Manual Modal */}
      <VoiceManualModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />

      {/* Workspace Navigation Menu (Replaces old sidebar across all pages) */}
      <WorkspaceMenu
        isOpen={isWorkspaceMenuOpen}
        onClose={() => setIsWorkspaceMenuOpen(false)}
        activeTab={activeTab}
        onNavigate={onNavigate}
      />
    </>
  );
}
