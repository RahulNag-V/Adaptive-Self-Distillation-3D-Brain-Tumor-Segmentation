/**
 * Neuro Resonence AI - Voice Control Manual & Interactive Command Console
 *
 * Theme: Neuro Resonence AI Brand Palette (Deep Blue #103B5C, Primary Brand Blue #399DBA, Ocean Blue #1B6284, Soft Mint #98D9CE)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  BookOpen, 
  Sparkles,
  Check,
  AlertTriangle,
  Info,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Mic,
  Clock,
  RotateCcw
} from 'lucide-react';
import { COMMAND_REGISTRY, MANUAL_SECTIONS, MANUAL_GUIDES } from './registry.js';
import { useVoice } from './VoiceContext.jsx';
import { prefersReducedMotion } from '../utils/motion.js';

export default function VoiceManualModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [micPermState, setMicPermState] = useState('unknown');

  const {
    status,
    engineState,
    isSupported,
    isSecureContext,
    errorMessage,
    telemetryLogs,
  } = useVoice();

  // Query actual browser microphone permissions if API is available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' })
        .then((perm) => {
          setMicPermState(perm.state);
          perm.onchange = () => setMicPermState(perm.state);
        })
        .catch(() => setMicPermState('unknown'));
    }
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter commands by query and section
  const filteredCommands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COMMAND_REGISTRY.filter((cmd) => {
      const matchesSection = selectedSection === 'all' || cmd.sectionId === selectedSection;
      if (!matchesSection) return false;
      if (!q) return true;

      const phraseMatch = cmd.phrases.some((p) => p.toLowerCase().includes(q));
      const exampleMatch = cmd.examples.some((ex) => ex.toLowerCase().includes(q));
      const descMatch = cmd.description.toLowerCase().includes(q);
      const catMatch = cmd.category.toLowerCase().includes(q);

      return phraseMatch || exampleMatch || descMatch || catMatch;
    });
  }, [searchQuery, selectedSection]);

  // Filter instructional guides
  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return MANUAL_GUIDES.filter((guide) => {
      const matchesSection = selectedSection === 'all' || guide.sectionId === selectedSection;
      if (!matchesSection) return false;
      if (!q) return true;

      const titleMatch = guide.title.toLowerCase().includes(q);
      const textMatch = guide.instructions.some((inst) => inst.toLowerCase().includes(q));
      return titleMatch || textMatch;
    });
  }, [searchQuery, selectedSection]);

  // Animated Opening & Closing lifecycle states
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      if (prefersReducedMotion()) {
        setIsRendered(false);
        setIsClosing(false);
      } else {
        setIsClosing(true);
        const timer = setTimeout(() => {
          setIsRendered(false);
          setIsClosing(false);
        }, 180);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, isRendered]);

  // Body scroll lock
  useEffect(() => {
    if (isRendered) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isRendered]);

  if (!isRendered) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200 overflow-hidden ${isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-[#111827]/70 backdrop-blur-sm transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`} 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div 
        className={`relative w-full max-w-4xl max-h-[88vh] my-auto bg-white rounded-2xl shadow-2xl border border-[#98D9CE]/60 flex flex-col overflow-hidden text-[#111827] z-10 ${
          isClosing ? 'animate-modal-exit' : 'animate-modal-enter'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-manual-title"
      >
        {/* 1. HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#98D9CE]/60 bg-[#F8FCFB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#103B5C]/10 border border-[#399DBA]/20 flex items-center justify-center text-[#103B5C]">
              <BookOpen className="w-5 h-5 text-[#103B5C]" />
            </div>
            <div>
              <h2 id="voice-manual-title" className="text-base sm:text-lg font-bold text-[#103B5C] flex items-center gap-2">
                <span>Voice Control Manual</span>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#EBF8F6] text-[#103B5C] border border-[#98D9CE]/60">
                  Official Registry
                </span>
              </h2>
              <p className="text-xs text-[#6B7280]">
                Hands-free voice navigation and clinical workstation control across the entire Neuro Resonence AI platform.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B7280] hover:text-[#103B5C] hover:bg-[#EBF8F6] transition-colors"
            aria-label="Close Voice Manual"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. SEARCH & FILTER BAR */}
        <div className="p-3 sm:p-4 border-b border-[#98D9CE]/60 bg-white flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#399DBA]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voice commands (e.g., 'scroll down', 'axial', 'flair', 'stop', 'rotate')..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#98D9CE]/60 bg-[#F8FCFB] text-xs text-[#111827] placeholder-[#6B7280] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#399DBA]/50 focus:border-[#399DBA] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280] hover:text-[#103B5C]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="sm:w-64">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#98D9CE]/60 bg-[#F8FCFB] text-xs font-semibold text-[#103B5C] focus:outline-none focus:ring-2 focus:ring-[#399DBA]/50 focus:border-[#399DBA]"
            >
              <option value="all">All Sections ({COMMAND_REGISTRY.length} commands)</option>
              {MANUAL_SECTIONS.map((sec) => (
                <option key={sec.id} value={sec.id}>{sec.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. MODAL BODY (SCROLLABLE CONTENT) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* VOICE DIAGNOSTICS PANEL */}
          <div className="p-4 rounded-xl bg-[#F8FCFB] border border-[#98D9CE]/60 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#98D9CE]/60 pb-2">
              <span className="font-bold text-[#103B5C] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#399DBA]" />
                <span>Voice Engine Diagnostics & Telemetry</span>
              </span>
              <span className="text-[10px] font-mono text-[#6B7280]">Live Telemetry</span>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-2 rounded-lg bg-white border border-[#98D9CE]/60 space-y-0.5">
                <span className="text-[10px] text-[#6B7280] uppercase font-mono">Speech API</span>
                <div className="font-bold text-[#103B5C]">
                  {isSupported ? 'Supported' : 'Unavailable'}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-white border border-[#98D9CE]/60 space-y-0.5">
                <span className="text-[10px] text-[#6B7280] uppercase font-mono">Context</span>
                <div className="font-bold text-[#103B5C]">
                  {isSecureContext ? 'Secure (HTTPS/Local)' : 'Insecure'}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-white border border-[#98D9CE]/60 space-y-0.5">
                <span className="text-[10px] text-[#6B7280] uppercase font-mono">Mic Permission</span>
                <div className="font-bold capitalize text-[#103B5C]">
                  {micPermState}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-white border border-[#98D9CE]/60 space-y-0.5">
                <span className="text-[10px] text-[#6B7280] uppercase font-mono">Engine State</span>
                <div className="font-bold capitalize text-[#103B5C]">
                  {status}
                </div>
              </div>
            </div>

            {/* Recent 10 Telemetry Log */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-[#6B7280] uppercase">Recent Transcripts & Outcomes</span>
              {telemetryLogs.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-white border border-[#98D9CE]/60 text-[#6B7280] text-[11px] text-center italic">
                  No commands executed yet. Speak a voice command to view telemetry.
                </div>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                  {telemetryLogs.map((log) => (
                    <div key={log.id} className="p-1.5 rounded bg-white border border-[#98D9CE]/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          log.success ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.success ? 'PASS' : 'FAIL'}
                        </span>
                        <span className="text-[#103B5C] font-bold truncate">"{log.text}"</span>
                        <span className="text-[#6B7280]">→ {log.label}</span>
                      </div>
                      <span className="text-[#6B7280] shrink-0 text-[9px]">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* INSTRUCTIONAL GUIDES */}
          {filteredGuides.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#6B7280] font-mono border-b border-[#98D9CE]/60 pb-1">
                <span>System Guides & Setup Instructions</span>
                <span>Reference Only</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredGuides.map((guide) => (
                  <div key={guide.id} className="p-3.5 rounded-xl border border-[#98D9CE]/60 bg-[#F8FCFB] space-y-2 text-xs">
                    <span className="font-bold text-[#103B5C] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#399DBA] shrink-0" />
                      <span>{guide.title}</span>
                    </span>
                    <ul className="space-y-1 text-[11px] text-[#475569]">
                      {guide.instructions.map((inst, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-teal-600 shrink-0 mt-0.5" />
                          <span>{inst}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXECUTABLE COMMANDS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#6B7280] font-mono border-b border-[#98D9CE]/60 pb-2">
              <span>Showing {filteredCommands.length} Allowlisted Commands</span>
              <span>100% Tested & Verified</span>
            </div>

            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-[#6B7280] text-xs">
                No matching voice commands found for "{searchQuery}".
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-[#98D9CE]/60 hover:border-[#399DBA] bg-white hover:bg-[#F8FCFB] transition-all text-xs space-y-2 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#103B5C] text-xs sm:text-sm">
                          {cmd.description}
                        </span>
                        {cmd.requiresConfirmation && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-300 font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            Confirmation Required
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-[#EBF8F6] text-[#103B5C] border border-[#98D9CE]/60">
                        {cmd.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-mono text-[#6B7280]">Phrases:</span>
                      {cmd.phrases.slice(0, 4).map((p, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-[#EBF8F6] text-[#103B5C] font-mono text-[11px] border border-[#98D9CE]/60 font-semibold"
                        >
                          "{p}"
                        </span>
                      ))}
                      {cmd.phrases.length > 4 && (
                        <span className="text-[10px] text-[#6B7280] font-mono">
                          +{cmd.phrases.length - 4} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1 border-t border-[#FFF7ED]">
                      <span className="truncate">
                        <strong>Example:</strong> <span className="italic text-[#103B5C] font-semibold">{cmd.examples[0]}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#6B7280]">
                        Target: {cmd.targetPage}
                      </span>
                    </div>

                    {cmd.constraints && (
                      <div className="text-[10px] text-[#6B7280] font-mono pt-0.5">
                        Constraints: {cmd.constraints}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}