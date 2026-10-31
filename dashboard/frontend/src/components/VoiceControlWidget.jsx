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
  Navigation
} from 'lucide-react';
import { VOICE_COMMANDS_HELP } from '../services/voiceCommandParser';

export default function VoiceControlWidget({
  voiceControl,
  activeTab = 'viewer',
  onHelpOpen,
}) {
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
          className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-sm ${
            isListening
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
              : status === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
              : 'bg-medical-card hover:bg-medical-surface border-medical-border hover:border-medical-teal/50 text-white'
          }`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="font-semibold text-rose-200 hidden sm:inline">Listening...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-medical-teal" />
              <span className="hidden sm:inline font-medium">Voice Control</span>
            </>
          )}
        </button>

        {/* Quick Voice Help Button */}
        <button
          onClick={() => setShowHelpModal(true)}
          type="button"
          aria-label="Voice Commands Guide"
          title="Voice Commands Guide"
          className="p-1.5 rounded-lg bg-medical-card hover:bg-medical-surface border border-medical-border text-medical-muted hover:text-white transition-all shadow-sm"
        >
          <HelpCircle className="w-3.5 h-3.5 text-medical-teal" />
        </button>

        {/* Audio Speech Synthesis Feedback Toggle */}
        <button
          onClick={() => setAudioFeedbackEnabled((prev) => !prev)}
          type="button"
          aria-label={audioFeedbackEnabled ? 'Mute Voice Audio Feedback' : 'Enable Voice Audio Feedback'}
          title={audioFeedbackEnabled ? 'Voice confirmations enabled' : 'Voice confirmations muted'}
          className={`p-1.5 rounded-lg border transition-all ${
            audioFeedbackEnabled
              ? 'bg-medical-teal/15 border-medical-teal/40 text-medical-tealLight'
              : 'bg-medical-card border-medical-border text-medical-muted hover:text-white'
          }`}
        >
          {audioFeedbackEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-medical-teal" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-medical-muted" />
          )}
        </button>
      </div>

      {/* 2. FLOATING HUD FEEDBACK BAR (When Listening, Processing, or Command Executed) */}
      {(isListening || status !== 'idle' || errorMessage) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-slideUp">
          <div className="bg-medical-darkest/95 border border-medical-border/90 backdrop-blur-md rounded-2xl shadow-2xl p-3 text-xs font-mono text-white flex flex-col gap-2 ring-1 ring-medical-teal/20">
            {/* Top Row: State Indicator, Transcript, and Dismiss */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {status === 'listening' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Listening
                  </span>
                ) : status === 'processing' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase tracking-wider">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Processing
                  </span>
                ) : status === 'success' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    Success
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider">
                    <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                    Notice
                  </span>
                )}

                {/* Live Speech Transcript */}
                <div className="truncate text-white text-xs font-medium">
                  {transcript ? (
                    <span className="text-white italic">"{transcript}"</span>
                  ) : isListening ? (
                    <span className="text-medical-muted">Say a command (e.g., "Show FLAIR", "Next slice")...</span>
                  ) : (
                    <span className="text-medical-muted">Voice control standby</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="px-2 py-1 rounded bg-medical-card hover:bg-medical-surface border border-medical-border text-[10px] text-medical-teal hover:text-white"
                  title="View Command Help"
                >
                  Commands
                </button>
                <button
                  onClick={stopListening}
                  className="p-1 rounded hover:bg-medical-surface text-medical-muted hover:text-white"
                  title="Close Feedback"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Last Executed Command or Error Banner */}
            {errorMessage ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span className="truncate">{errorMessage}</span>
              </div>
            ) : lastCommand && lastCommand.success ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-medical-card/80 border border-medical-border/60 text-[11px] text-medical-muted">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-white font-medium">Executed:</span>
                  <span className="text-medical-tealLight truncate">{lastCommand.label || lastCommand.text}</span>
                </span>
                <span className="text-[10px] font-mono text-medical-muted/60">{lastCommand.timestamp}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 3. PERMISSION DENIED BANNER */}
      {permissionDenied && (
        <div className="fixed top-18 right-4 z-50 max-w-sm p-4 rounded-xl bg-medical-darkest/95 border border-rose-500/50 shadow-2xl backdrop-blur-md animate-fadeIn text-xs font-mono text-white space-y-2">
          <div className="flex items-center justify-between text-rose-400 font-bold">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Microphone Access Denied
            </span>
            <button onClick={() => stopListening()} className="text-medical-muted hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-medical-muted">
            Browser permissions for microphone recording are blocked. Click the lock/tune icon in your address bar and select "Allow" for Microphone.
          </p>
        </div>
      )}

      {/* 4. COMPACT VOICE COMMANDS GUIDE MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[85vh] bg-medical-darkest border border-medical-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-medical-base border-b border-medical-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-medical-teal/15 border border-medical-teal/30 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-medical-teal" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Voice Command Reference</h3>
                  <p className="text-xs text-medical-muted font-mono">Speak naturally to control MRI slices, modalities, rotation, and segmentation</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-lg text-medical-muted hover:text-white hover:bg-medical-surface transition-colors"
                aria-label="Close Help"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="p-3 bg-medical-card/40 border-b border-medical-border/60 flex items-center gap-1.5 overflow-x-auto text-xs font-mono shrink-0">
              {['All', ...VOICE_COMMANDS_HELP.map((c) => c.category)].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveHelpCategory(cat)}
                  className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                    activeHelpCategory === cat
                      ? 'bg-medical-teal text-medical-darkest font-semibold shadow-sm'
                      : 'bg-medical-base text-medical-muted hover:text-white hover:bg-medical-surface'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Commands List Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {VOICE_COMMANDS_HELP.filter(
                (c) => activeHelpCategory === 'All' || c.category === activeHelpCategory
              ).map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-medical-border/40">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-medical-teal">
                      {cat.category}
                    </span>
                    <span className="text-[10px] text-medical-muted font-mono">
                      ({cat.commands.length} commands)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {cat.commands.map((cmd) => (
                      <div
                        key={cmd.speech}
                        className="p-2.5 rounded-xl bg-medical-card/60 hover:bg-medical-card border border-medical-border/60 transition-colors flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-white">
                          <span className="text-medical-teal">"</span>
                          <span className="text-medical-tealLight">{cmd.speech}</span>
                          <span className="text-medical-teal">"</span>
                        </div>
                        <p className="text-[11px] text-medical-muted mt-1 leading-snug">
                          {cmd.effect}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-medical-base border-t border-medical-border flex items-center justify-between text-xs font-mono text-medical-muted shrink-0">
              <span className="flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-medical-teal" />
                Press <kbd className="px-1.5 py-0.5 rounded bg-medical-card border border-medical-border text-white">V</kbd> anywhere to toggle voice listening
              </span>
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 rounded-lg bg-medical-teal hover:bg-medical-tealLight text-medical-darkest font-semibold transition-all"
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
