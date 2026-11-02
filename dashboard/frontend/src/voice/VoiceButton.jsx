/**
 * NeuroVision AI - Voice Header Button & Floating HUD
 *
 * Preserves exact visual styling and layout:
 * - Header Voice button with Ctrl+V indicator, pulsing listening badge
 * - Dedicated Voice Manual button immediately beside it
 * - Text-to-speech audio feedback toggle
 * - Floating HUD feedback bar displaying live speech transcript, interpreted action, and telemetry
 */

import React, { useState } from 'react';
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
          className="p-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-1.5 text-xs font-mono"
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
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] text-[#16324F] transition-all shadow-2xs"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
          <span className="hidden sm:inline font-mono font-medium text-[11px]">Manual</span>
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
          ) : isStarting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span className="font-medium text-blue-700 hidden sm:inline">Starting...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden sm:inline font-medium">Voice</span>
              <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] font-mono text-[#64748B] bg-[#F1F5F9] border border-[#CBD5E1] rounded">
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
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EEF4F8] border border-[#DCE6F0] hover:border-[#2563EB]/40 text-[#16324F] transition-all shadow-2xs"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
          <span className="hidden sm:inline font-mono font-medium text-[11px]">Manual</span>
        </button>

        {/* Audio Speech Synthesis Feedback Toggle */}
        <button
          onClick={() => setAudioFeedbackEnabled((prev) => !prev)}
          type="button"
          aria-label={audioFeedbackEnabled ? 'Mute Voice Audio Feedback' : 'Enable Voice Audio Feedback'}
          title={audioFeedbackEnabled ? 'Spoken confirmations enabled' : 'Spoken confirmations muted'}
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

      {/* 2. FLOATING HUD FEEDBACK BAR */}
      {(isListening || (status !== 'standby' && status !== 'idle') || errorMessage || pendingConfirmation) && (
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
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold uppercase tracking-wider">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-sky-600" />
                    Processing
                  </span>
                ) : status === 'executing' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-600" />
                    Executing
                  </span>
                ) : status === 'success' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    Success
                  </span>
                ) : status === 'error' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
                    <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                    Error
                  </span>
                ) : status === 'starting' ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-600" />
                    Starting
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                    <Mic className="w-2.5 h-2.5 text-slate-500" />
                    Standby
                  </span>
                )}

                {/* Live Speech Transcript */}
                <div className="truncate text-[#16324F] text-xs font-semibold">
                  {transcript ? (
                    <span className="text-[#16324F] italic">"{transcript}"</span>
                  ) : isListening ? (
                    <span className="text-[#64748B]">Say a command (e.g., "Scroll down", "Show FLAIR", "Stop")...</span>
                  ) : (
                    <span className="text-[#64748B]">Voice control standby</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowManualModal(true)}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-[#F8FAFC] border border-[#DCE6F0] text-[11px] font-medium text-blue-700 shadow-xs transition-colors flex items-center gap-1"
                  title="View Command Manual & Interactive Console"
                >
                  <BookOpen className="w-3 h-3 text-[#2563EB]" />
                  <span>Manual</span>
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

            {/* Pending Confirmation Banner */}
            {pendingConfirmation && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 animate-fadeIn">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Confirmation Required:</span>
                </div>
                <p className="text-[11px] text-amber-800">{pendingConfirmation.prompt}</p>
                <div className="text-[10px] font-mono font-semibold text-amber-900 pt-1">
                  Say <strong>"Confirm"</strong> to proceed or <strong>"Cancel"</strong> to abort.
                </div>
              </div>
            )}

            {/* Clinical Telemetry Chips */}
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

            {/* Bottom Row: Executed Feedback or Error Banner */}
            {errorMessage ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span className="truncate">{errorMessage}</span>
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

      {/* 3. OFFICIAL VOICE CONTROL MANUAL MODAL */}
      <VoiceManualModal isOpen={showManualModal} onClose={() => setShowManualModal(false)} />
    </>
  );
}
