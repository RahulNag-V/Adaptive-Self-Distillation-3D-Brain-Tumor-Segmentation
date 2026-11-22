/**
 * Neuro Resonence AI - Voice Header Button & Floating HUD
 *
 * Theme: Neuro Resonence AI Brand Palette (Deep Blue #103B5C, Primary Brand Blue #399DBA, Ocean Blue #1B6284, Soft Mint #98D9CE)
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  BookOpen,
  FolderOpen,
  Compass
} from 'lucide-react';
import { useVoice } from './VoiceContext.jsx';
import VoiceManualModal from './VoiceManualModal.jsx';

export default function VoiceButton() {
  const {
    isListening,
    isStarting,
    status,
    transcript,
    lastCommand,
    errorMessage,
    pendingConfirmation,
    isSupported,
    audioFeedbackEnabled,
    setAudioFeedbackEnabled,
    toggleListening,
    stopListening,
    viewerStatus,
    registerLayoutHandler,
  } = useVoice();

  const [showManualModal, setShowManualModal] = useState(false);

  // Synchronize manual modal with voice open/close commands
  React.useEffect(() => {
    if (!registerLayoutHandler) return;
    return registerLayoutHandler((action) => {
      if (action.type === 'OPEN_MANUAL') {
        setShowManualModal(true);
      } else if (action.type === 'CLOSE_MANUAL') {
        setShowManualModal(false);
      }
    });
  }, [registerLayoutHandler]);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          disabled
          type="button"
          className="p-1.5 rounded-lg bg-[#F8FCFB] border border-[#98D9CE]/60 text-[#6B7280] cursor-not-allowed opacity-60 flex items-center gap-1.5 text-xs font-mono"
          title="Web Speech Recognition API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari."
        >
          <MicOff className="w-4 h-4" />
          <span className="hidden xl:inline">Voice Unavailable</span>
        </button>

        <button
          onClick={() => setShowManualModal(true)}
          type="button"
          aria-label="Voice Control Manual"
          title="Voice Control Manual & Interactive Command Console"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F8FCFB] hover:bg-[#EBF8F6] border border-[#98D9CE]/60 text-[#103B5C] transition-all shadow-xs"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#399DBA]" />
          <span className="hidden sm:inline font-mono font-bold text-[11px]">Manual</span>
        </button>

        <VoiceManualModal isOpen={showManualModal} onClose={() => setShowManualModal(false)} />
      </div>
    );
  }

  return (
    <>
      {/* 1. HEADER VOICE & MANUAL BUTTON GROUP */}
      <div className="relative flex items-center gap-1.5">
        {/* Voice Button */}
        <button
          onClick={toggleListening}
          type="button"
          aria-label={isListening ? 'Stop Voice Control (Ctrl+V)' : 'Start Voice Control (Ctrl+V)'}
          title={isListening ? 'Stop Voice Recognition (Press Ctrl+V)' : 'Start Voice Control (Press Ctrl+V)'}
          className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-xs ${
            isListening
              ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm animate-pulse'
              : status === 'success'
              ? 'bg-teal-50 border-teal-400 text-teal-800'
              : 'bg-[#F8FCFB] hover:bg-[#EBF8F6] border-[#98D9CE]/60 hover:border-[#399DBA] text-[#103B5C]'
          }`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <Mic className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span className="font-bold text-rose-700 hidden sm:inline">Listening...</span>
            </>
          ) : isStarting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-[#103B5C] animate-spin" />
              <span className="font-bold text-[#103B5C] hidden sm:inline">Starting...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-[#103B5C]" />
              <span className="hidden sm:inline font-bold">Voice</span>
              <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] font-mono text-[#103B5C] bg-white border border-[#98D9CE]/60 rounded font-bold">
                Ctrl+V
              </kbd>
            </>
          )}
        </button>

        {/* Voice Control Manual Button Immediately Beside Voice Button */}
        <button
          onClick={() => setShowManualModal(true)}
          type="button"
          aria-label="Voice Control Manual"
          title="Open Voice Control Manual & Interactive Command Console"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F8FCFB] hover:bg-[#EBF8F6] border border-[#98D9CE]/60 hover:border-[#399DBA] text-[#103B5C] transition-all shadow-xs"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#399DBA]" />
          <span className="hidden sm:inline font-mono font-bold text-[11px]">Manual</span>
        </button>

        {/* Audio Speech Synthesis Feedback Toggle */}
        <button
          onClick={() => setAudioFeedbackEnabled((prev) => !prev)}
          type="button"
          aria-label={audioFeedbackEnabled ? 'Mute Voice Audio Feedback' : 'Enable Voice Audio Feedback'}
          title={audioFeedbackEnabled ? 'Spoken confirmations enabled' : 'Spoken confirmations muted'}
          className={`p-1.5 rounded-lg border transition-all shadow-xs ${
            audioFeedbackEnabled
              ? 'bg-[#EBF8F6] border-[#399DBA] text-[#103B5C]'
              : 'bg-[#F8FCFB] border-[#98D9CE]/60 text-[#6B7280] hover:text-[#103B5C] hover:bg-[#EBF8F6]'
          }`}
        >
          {audioFeedbackEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-[#103B5C]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#6B7280]" />
          )}
        </button>
      </div>

      {/* 2. FLOATING HUD FEEDBACK BAR */}
      {(isListening || (status !== 'standby' && status !== 'idle') || errorMessage || pendingConfirmation) && (
        typeof document !== 'undefined' ? createPortal(
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-xl px-4 pointer-events-auto animate-fadeIn">
            <div className="bg-white/95 border border-[#98D9CE]/60 backdrop-blur-md rounded-2xl shadow-clinical-lg p-3.5 text-xs text-[#111827] flex flex-col gap-2 ring-1 ring-[#399DBA]/30">
              {/* Top Row: State Indicator, Transcript, and Dismiss */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {status === 'listening' ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-300 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      Listening
                    </span>
                  ) : status === 'processing' ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-[#103B5C]" />
                      Processing
                    </span>
                  ) : status === 'executing' ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-300 text-[10px] font-bold uppercase tracking-wider">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-[#103B5C]" />
                      Executing
                    </span>
                  ) : status === 'success' ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-300 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                      Success
                    </span>
                  ) : status === 'error' ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-300 text-[10px] font-bold uppercase tracking-wider">
                      <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                      Error
                    </span>
                  ) : status === 'starting' ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-300 text-[10px] font-bold uppercase tracking-wider">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-[#103B5C]" />
                      Starting
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F8FCFB] text-[#103B5C] border border-[#98D9CE]/60 text-[10px] font-bold uppercase tracking-wider">
                      <Mic className="w-2.5 h-2.5 text-[#103B5C]" />
                      Standby
                    </span>
                  )}

                  {/* Live Speech Transcript */}
                  <div className="truncate text-[#111827] text-xs font-semibold">
                    {transcript ? (
                      <span className="text-[#103B5C] font-bold italic">"{transcript}"</span>
                    ) : isListening ? (
                      <span className="text-[#6B7280]">Say a command (e.g., "Scroll down", "Show FLAIR", "Stop")...</span>
                    ) : (
                      <span className="text-[#6B7280]">Voice control standby</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowManualModal(true)}
                    className="px-2.5 py-1 rounded-md bg-[#F8FCFB] hover:bg-[#EBF8F6] border border-[#98D9CE]/60 text-[11px] font-bold text-[#103B5C] shadow-xs transition-colors flex items-center gap-1"
                    title="View Command Manual & Interactive Console"
                  >
                    <BookOpen className="w-3 h-3 text-[#399DBA]" />
                    <span>Manual</span>
                  </button>
                  <button
                    onClick={stopListening}
                    className="p-1 rounded-md hover:bg-[#F8FCFB] text-[#6B7280] hover:text-[#103B5C] transition-colors"
                    title="Close Feedback"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pending Confirmation Banner */}
              {pendingConfirmation && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 animate-fadeIn">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Confirmation Required:</span>
                  </div>
                  <p className="text-[11px] text-amber-800">{pendingConfirmation.prompt}</p>
                  <div className="text-[10px] font-mono font-bold text-amber-900 pt-1">
                    Say <strong>"Confirm"</strong> to proceed or <strong>"Cancel"</strong> to abort.
                  </div>
                </div>
              )}

              {/* Clinical Telemetry Chips */}
              {viewerStatus && (
                <div className="flex items-center gap-2 pt-1 border-t border-[#98D9CE]/60 text-[10px] overflow-x-auto no-scrollbar">
                  {viewerStatus.selectedPatientId && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FCFB] border border-[#98D9CE]/60 text-[#103B5C] shrink-0 font-bold font-mono">
                      <FolderOpen className="w-2.5 h-2.5 text-[#399DBA]" />
                      <span>Case: {viewerStatus.selectedPatientId}</span>
                    </span>
                  )}
                  {viewerStatus.activePlane && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FCFB] border border-[#98D9CE]/60 text-[#059669] shrink-0 font-bold font-mono">
                      <Compass className="w-2.5 h-2.5 text-[#059669]" />
                      <span>Plane: {viewerStatus.activePlane}</span>
                    </span>
                  )}
                  {viewerStatus.coordinates && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FCFB] border border-[#98D9CE]/60 text-[#111827] shrink-0 font-mono">
                      <span className="text-[#6B7280]">XYZ:</span>
                      <span className="text-[#059669] font-bold">{viewerStatus.coordinates.x}</span>
                      <span className="text-[#98D9CE]">/</span>
                      <span className="text-[#103B5C] font-bold">{viewerStatus.coordinates.y}</span>
                      <span className="text-[#98D9CE]">/</span>
                      <span className="text-[#399DBA] font-bold">{viewerStatus.coordinates.z}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Bottom Row: Executed Feedback or Error Banner */}
              {errorMessage ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-[11px] text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span className="truncate">{errorMessage}</span>
                </div>
              ) : lastCommand && lastCommand.success ? (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-300 text-[11px] text-teal-900">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
                    <span className="text-[#103B5C] font-bold">Executed:</span>
                    <span className="text-teal-800 font-medium truncate">{lastCommand.label || lastCommand.text}</span>
                  </span>
                  <span className="text-[10px] text-[#6B7280] shrink-0 ml-2 font-mono">{lastCommand.timestamp}</span>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        ) : null
      )}

      {/* 3. OFFICIAL VOICE CONTROL MANUAL MODAL */}
      <VoiceManualModal isOpen={showManualModal} onClose={() => setShowManualModal(false)} />
    </>
  );
}