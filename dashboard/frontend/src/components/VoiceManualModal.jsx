import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  Mic, 
  Compass, 
  Sliders, 
  RotateCw, 
  Box, 
  Crosshair, 
  Eye, 
  ShieldAlert, 
  FileText, 
  Sparkles,
  Check,
  ChevronRight,
  AlertTriangle,
  Info,
  Laptop
} from 'lucide-react';
import { COMMAND_REGISTRY, MANUAL_SECTIONS } from '../services/commandRegistry';

export default function VoiceManualModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter commands by search query and active section
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#16324F]/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-[#DCE6F0] flex flex-col overflow-hidden text-[#16324F] z-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-manual-title"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#DCE6F0] bg-[#F7FAFC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="voice-manual-title" className="text-base sm:text-lg font-bold text-[#16324F] flex items-center gap-2">
                <span>Voice Control Manual & Command Reference</span>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-[#E3EEFF] text-[#2563EB] border border-[#BFDBFE]">
                  Official Registry
                </span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Natural-language hands-free voice control across the entire NeuroVision AI platform.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8] transition-colors"
            aria-label="Close Voice Manual"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="p-4 border-b border-[#DCE6F0] bg-white flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voice commands (e.g., 'scroll down', 'axial', 'flair', 'stop', 'rotate')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCE6F0] bg-[#F7FAFC] text-xs text-[#16324F] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#64748B]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="sm:w-64">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#DCE6F0] bg-[#F7FAFC] text-xs font-medium text-[#16324F] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="all">All 20 Guide Sections ({COMMAND_REGISTRY.length} commands)</option>
              {MANUAL_SECTIONS.map((sec) => (
                <option key={sec.id} value={sec.id}>{sec.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* MODAL BODY (Scrollable content) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* KEY RULES & ACTIVATION GUIDE BANNER */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 text-xs text-[#16324F] space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-blue-900 border-b border-blue-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <span>Quick Activation & Interaction Guide</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 border border-blue-300/60">
                Shortcut: Ctrl + V
              </span>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2.5 text-[11px] text-[#475569]">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Activate / Deactivate:</strong> Press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white border border-gray-300 rounded shadow-2xs">Ctrl + V</kbd> (or Cmd+V on Mac) anywhere outside text fields, or click the <strong>Voice</strong> button in the top bar.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Listening Indicator:</strong> Recognition is active when the Voice button pulses red and the bottom HUD displays <span className="font-bold text-rose-600">● LISTENING</span>.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Microphone Permissions:</strong> If blocked, click the padlock/tune icon on the left of the address bar, set Microphone to <strong>"Allow"</strong>, and reload.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Preserved Typing & Paste:</strong> Pressing <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white border border-gray-300 rounded shadow-2xs">Ctrl + V</kbd> inside text inputs or search fields pastes normally without toggling voice.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Natural variations:</strong> Say <em>"Can you please open the 3D viewer"</em> or simply <em>"3D workspace"</em>.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Instant Stop:</strong> Say <em>"Stop"</em> or <em>"Freeze"</em> to cancel continuous scrolling or camera spinning; say <em>"Stop listening"</em> to pause the microphone.</span>
              </li>
            </ul>
          </div>

          {/* COMMANDS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#64748B] font-mono border-b border-[#EEF4F8] pb-2">
              <span>Showing {filteredCommands.length} commands</span>
              <span>Allowlisted Clinical Intent Schema</span>
            </div>

            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] text-xs">
                No matching voice commands found for "{searchQuery}". Try searching for "scroll", "axial", "flair", or "zoom".
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-[#DCE6F0] hover:border-[#2563EB]/40 bg-white hover:bg-[#F8FAFC] transition-all text-xs space-y-2 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#16324F] text-xs sm:text-sm">
                          {cmd.description}
                        </span>
                        {cmd.requiresConfirmation && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-300 font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            Confirmation Required
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#EEF4F8] text-[#64748B] border border-[#DCE6F0]">
                        {cmd.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-mono text-[#64748B]">Phrases:</span>
                      {cmd.phrases.slice(0, 4).map((p, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-[#E3EEFF] text-[#2563EB] font-mono text-[11px] border border-[#BFDBFE]"
                        >
                          "{p}"
                        </span>
                      ))}
                      {cmd.phrases.length > 4 && (
                        <span className="text-[10px] text-[#94A3B8] font-mono">
                          +{cmd.phrases.length - 4} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                      <span className="truncate">
                        <strong>Example:</strong> <span className="italic text-[#16324F]">{cmd.examples[0]}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-mono text-[#94A3B8]">
                        Target: {cmd.targetPage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PERMISSIONS & TROUBLESHOOTING SECTION */}
          <div className="border-t border-[#DCE6F0] pt-6 space-y-4">
            <h3 className="text-sm font-bold text-[#16324F] flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#2563EB]" />
              <span>Microphone Permissions & Browser Compatibility</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-[#DCE6F0] bg-[#F7FAFC] space-y-1.5">
                <div className="font-semibold text-[#16324F] flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Microphone Access</span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Click the lock icon in your browser address bar and toggle Microphone to <strong>"Allow"</strong>. Ensure your Windows system microphone privacy settings permit browser access.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#DCE6F0] bg-[#F7FAFC] space-y-1.5">
                <div className="font-semibold text-[#16324F] flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Supported Browsers</span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Google Chrome, Microsoft Edge, and Safari natively support the W3C Web Speech API. Firefox requires enabling experimental flags.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 sm:p-4 border-t border-[#DCE6F0] bg-[#F7FAFC] flex items-center justify-between text-xs text-[#64748B] shrink-0">
          <span className="text-[11px] font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#DCE6F0] font-bold text-[#16324F]">V</kbd> to toggle voice control • <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#DCE6F0] font-bold text-[#16324F]">ESC</kbd> to close manual
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

