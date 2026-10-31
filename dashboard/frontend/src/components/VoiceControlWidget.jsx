import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Sparkles,
  Command,
  ChevronDown,
  ChevronUp,
  Layers,
  RotateCw,
  Sliders,
  ZoomIn,
  Navigation,
  Compass,
  FolderOpen
} from 'lucide-react';
import { VOICE_COMMANDS_HELP } from '../services/voiceCommandParser';
import { useVoiceContext } from '../context/VoiceControlContext';

export default function VoiceControlWidget({
  voiceControl,
  activeTab = 'viewer',
  onHelpOpen,
}) {
  const { viewerStatus, registerLayoutHandler } = useVoiceContext();

  if (!voiceControl) {
    return null;
  }

  const {
    isListening,
    transcript,
    lastCommand,
    status,
    errorMessage,
    isSupported,
    permissionDenied,
    audioFeedbackEnabled,
    setAudioFeedbackEnabled,
    toggleListening,
    stopListening,
  } = voiceControl;

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeHelpCategory, setActiveHelpCategory] = useState('All');
  const [isExpanded, setIsExpanded] = useState(true);

  // Listen for voice layout commands targeting the help panel
  useEffect(() => {
    if (!registerLayoutHandler) return;
    const unregister = registerLayoutHandler((action) => {
      if (action.type === 'OPEN_HELP_MODAL') {
        setShowHelpModal(true);
      } else if (action.type === 'CLOSE_HELP_MODAL') {
        setShowHelpModal(false);
      }
    });
    return unregister;
  }, [registerLayoutHandler]);

  // Global keyboard shortcut 'v' or 'm' to toggle voice control (when not typing in an input)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening]);

  if (!isSupported) {
    return (
      <div className="relative group">
        <button
          disabled
          className="p-1.5 rounded-lg bg-medical-card/60 border border-medical-border/60 text-medical-muted/40 cursor-not-allowed opacity-50 flex items-center gap-1.5 text-xs font-mono"
          title="Speech Recognition is not supported in this browser"
        >
          <MicOff className="w-4 h-4" />
          <span className="hidden xl:inline">Voice Unavailable</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 1. HEADER MIC PILL */}
      <div className="relative flex items-center gap-1.5">
        <button
          onClick={toggleListening}
          type="button"
          aria-label={isListening ? 'Stop Voice Control (V)' : 'Start Voice Control (V)'}
          title={isListening ? 'Stop Voice Recognition (Press V)' : 'Start Voice Control (Press V)'}
          className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-2xs ${
            isListening
              ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm'
              : status === 'success'
              ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
              : 'bg-white hover:bg-[#EEF4F8] border-[#DCE6F0] hover:border-[#2563EB]/40 text-[#16324F]'
          }`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
              </span>
              <Mic className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span className="font-semibold text-rose-800 hidden sm:inline">Listening...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden sm:inline font-medium">Voice</span>
            </>
          )}
        </button>

        {/* Quick Voice Help Button */}
        <button
          onClick={() => setShowHelpModal(true)}
          type="button"
          aria-label="Voice Commands Guide"
          title="Voice Commands Guide"
          className="p-1.5 rounded-lg bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-[#64748B] hover:text-[#16324F] transition-all shadow-2xs"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
        </button>

        {/* Audio Speech Synthesis Feedback Toggle */}
        <button
          onClick={() => setAudioFeedbackEnabled((prev) => !prev)}
          type="button"
          aria-label={audioFeedbackEnabled ? 'Mute Voice Audio Feedback' : 'Enable Voice Audio Feedback'}
          title={audioFeedbackEnabled ? 'Voice confirmations enabled' : 'Voice confirmations muted'}
          className={`p-1.5 rounded-lg border transition-all shadow-2xs ${
            audioFeedbackEnabled
              ? 'bg-[#E3EEFF] border-[#2563EB]/40 text-[#2563EB]'
              : 'bg-white border-[#DCE6F0] text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8]'
          }`}
        >
          {audioFeedbackEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-[#2563EB]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#64748B]" />
          )}
        </button>
      </div>

      {/* 2. FLOATING HUD FEEDBACK BAR (When Listening, Processing, or Command Executed) */}
      {(isListening || status !== 'idle' || errorMessage) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-slideUp">
          <div className="bg-white/95 border border-[#DCE6F0] backdrop-blur-md rounded-2xl shadow-xl p-3.5 text-xs text-[#16324F] flex flex-col gap-2 ring-1 ring-[#2563EB]/15">
            {/* Top Row: State Indicator, Transcript, and Dismiss */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {status === 'listening' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Listening
                  </span>
                ) : status === 'processing' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-bold uppercase tracking-wider">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-600" />
                    Processing
                  </span>
                ) : status === 'success' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    Success
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                    <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                    Notice
                  </span>
                )}

                {/* Live Speech Transcript */}
                <div className="truncate text-[#16324F] text-xs font-semibold">
                  {transcript ? (
                    <span className="text-[#16324F] italic">"{transcript}"</span>
                  ) : isListening ? (
                    <span className="text-[#64748B]">Say a command (e.g., "Show FLAIR", "Next slice")...</span>
                  ) : (
                    <span className="text-[#64748B]">Voice control standby</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-[#F8FAFC] border border-[#DCE6F0] text-[11px] font-medium text-blue-700 shadow-xs transition-colors"
                  title="View Command Help"
                >
                  Commands
                </button>
                <button
                  onClick={stopListening}
                  className="p-1 rounded-md hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#16324F] transition-colors"
                  title="Close Feedback"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Middle Row: Clinical Telemetry Chips (Case, View Plane, Coordinates) */}
            {viewerStatus && (
              <div className="flex items-center gap-2 pt-1 border-t border-[#DCE6F0] text-[10px] overflow-x-auto no-scrollbar">
                {viewerStatus.selectedPatientId && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#DCE6F0] text-blue-700 shrink-0 font-medium">
                    <FolderOpen className="w-2.5 h-2.5 text-blue-600" />
                    <span>Case: {viewerStatus.selectedPatientId}</span>
                  </span>
                )}
                {viewerStatus.activePlane && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#DCE6F0] text-cyan-700 shrink-0 font-medium">
                    <Compass className="w-2.5 h-2.5 text-cyan-600" />
                    <span>Plane: {viewerStatus.activePlane}</span>
                  </span>
                )}
                {viewerStatus.coordinates && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#DCE6F0] text-[#16324F] shrink-0 font-mono">
                    <span className="text-[#64748B]">XYZ:</span>
                    <span className="text-emerald-700 font-semibold">{viewerStatus.coordinates.x}</span>
                    <span className="text-[#CBD5E1]">/</span>
                    <span className="text-blue-700 font-semibold">{viewerStatus.coordinates.y}</span>
                    <span className="text-[#CBD5E1]">/</span>
                    <span className="text-purple-700 font-semibold">{viewerStatus.coordinates.z}</span>
                  </span>
                )}
              </div>
            )}

            {/* Bottom Row: Last Executed Command, Feedback or Error Banner */}
            {errorMessage ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span className="truncate">{errorMessage}</span>
              </div>
            ) : viewerStatus?.lastFeedback ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900">
                <span className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="text-blue-800 font-medium truncate">{viewerStatus.lastFeedback}</span>
                </span>
                {lastCommand && (
                  <span className="text-[10px] text-[#64748B] shrink-0 ml-2">{lastCommand.timestamp}</span>
                )}
              </div>
            ) : lastCommand && lastCommand.success ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-900">
                <span className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="text-[#16324F] font-semibold">Executed:</span>
                  <span className="text-emerald-800 truncate">{lastCommand.label || lastCommand.text}</span>
                </span>
                <span className="text-[10px] text-[#64748B] shrink-0 ml-2">{lastCommand.timestamp}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 3. PERMISSION DENIED BANNER */}
      {permissionDenied && (
        <div className="fixed top-18 right-4 z-50 max-w-sm p-4 rounded-xl bg-white border border-rose-200 shadow-2xl backdrop-blur-md animate-fadeIn text-xs text-[#16324F] space-y-2">
          <div className="flex items-center justify-between text-rose-700 font-bold">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Microphone Access Denied
            </span>
            <button onClick={() => stopListening()} className="text-[#64748B] hover:text-[#16324F]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Browser permissions for microphone recording are blocked. Click the lock/tune icon in your address bar and select "Allow" for Microphone.
          </p>
        </div>
      )}

      {/* 4. COMPACT VOICE COMMANDS GUIDE MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[85vh] bg-white border border-[#DCE6F0] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#16324F]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-white border-b border-[#DCE6F0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Mic className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#16324F]">Voice Command Reference</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Speak naturally to control MRI slices, modalities, rotation, and segmentation</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#16324F] hover:bg-[#F8FAFC] transition-colors"
                aria-label="Close Help"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Drop-down Menu */}
            <div className="px-4 sm:px-6 py-3.5 bg-[#F8FAFC] border-b border-[#DCE6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16324F] shrink-0">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Category:</span>
                </div>
                <div className="relative flex-1 max-w-sm">
                  <select
                    value={activeHelpCategory}
                    onChange={(e) => setActiveHelpCategory(e.target.value)}
                    className="w-full appearance-none pl-3.5 pr-9 py-2 bg-white border border-[#DCE6F0] rounded-xl text-xs font-semibold text-[#16324F] shadow-xs hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
                  >
                    <option value="All">
                      All Categories ({VOICE_COMMANDS_HELP.reduce((acc, c) => acc + c.commands.length, 0)} commands)
                    </option>
                    {VOICE_COMMANDS_HELP.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category} ({c.commands.length} commands)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                {activeHelpCategory !== 'All' && (
                  <button
                    onClick={() => setActiveHelpCategory('All')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-xs font-medium text-[#64748B] hover:text-[#16324F] transition-colors shrink-0 shadow-xs"
                    title="Reset to All Categories"
                  >
                    Show All
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#64748B] shrink-0 font-medium">
                <span>Displaying:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px]">
                  {activeHelpCategory === 'All'
                    ? `${VOICE_COMMANDS_HELP.reduce((acc, c) => acc + c.commands.length, 0)} commands`
                    : `${VOICE_COMMANDS_HELP.find((c) => c.category === activeHelpCategory)?.commands.length || 0} commands`}
                </span>
              </div>
            </div>

            {/* Commands List Body */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-white">
              {VOICE_COMMANDS_HELP.filter(
                (c) => activeHelpCategory === 'All' || c.category === activeHelpCategory
              ).map((cat) => (
                <div key={cat.category} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#DCE6F0]">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {cat.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {cat.commands.length} commands
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cat.commands.map((cmd) => (
                      <div
                        key={cmd.speech}
                        className="p-3.5 rounded-xl bg-[#F8FAFC] hover:bg-[#EEF4F8] border border-[#E2E8F0] hover:border-blue-300 transition-all shadow-xs flex flex-col justify-between space-y-1.5"
                      >
                        <div className="text-xs sm:text-sm font-bold text-[#16324F] flex items-center gap-1">
                          <span className="text-blue-600 font-bold">"</span>
                          <span className="text-[#16324F]">{cmd.speech}</span>
                          <span className="text-blue-600 font-bold">"</span>
                        </div>
                        <p className="text-xs text-[#64748B] leading-relaxed">
                          {cmd.effect}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-[#F8FAFC] border-t border-[#DCE6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#64748B] shrink-0">
              <span className="flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-blue-600" />
                Press <kbd className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#16324F] font-semibold shadow-xs">V</kbd> anywhere to toggle voice listening
              </span>
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
