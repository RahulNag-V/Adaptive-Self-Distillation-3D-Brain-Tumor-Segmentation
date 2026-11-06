import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Mic, 
  Sliders, 
  Monitor, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Sparkles,
  Volume2,
  Eye,
  Layers,
  ChevronRight,
  ShieldCheck,
  Terminal,
  Activity,
  HardDrive
} from 'lucide-react';
import { useVoice } from '../voice/VoiceContext';
import { useServerStatus } from '../hooks/useServerStatus';
import { parseVoiceCommand } from '../voice/parser';

export default function SettingsPage({ onNavigate }) {
  const {
    isListening,
    audioFeedbackEnabled,
    setAudioFeedbackEnabled,
    registerPageActionHandler,
  } = useVoice();

  const { status: serverStatus } = useServerStatus();

  // Local interactive settings state
  const [crosshairVisible, setCrosshairVisible] = useState(true);
  const [sliceStep, setSliceStep] = useState(5);
  const [defaultOpacity, setDefaultOpacity] = useState(75);
  const [voiceTestInput, setVoiceTestInput] = useState('');
  const [voiceTestResult, setVoiceTestResult] = useState(null);

  useEffect(() => {
    if (!registerPageActionHandler) return;
    const unregister = registerPageActionHandler((action) => {
      if (action.type === 'TOGGLE_CROSSHAIR') {
        setCrosshairVisible((prev) => !prev);
      }
    });
    return unregister;
  }, [registerPageActionHandler]);

  const handleTestVoiceCommand = (e) => {
    e.preventDefault();
    if (!voiceTestInput.trim()) return;
    const res = parseVoiceCommand(voiceTestInput);
    setVoiceTestResult(res);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 animate-fadeIn text-[#F4F7FC]">
      {/* 1. HEADER */}
      <section className="rounded-xl bg-[#101722] border border-[#1C2636] p-6 shadow-medical-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C2636] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#4C8DFF]">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold bg-blue-500/10 text-[#4C8DFF] border border-blue-500/20">
                  System Preferences
                </span>
                <span className="text-xs text-[#627D98] font-mono">Workstation Configuration</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#F4F7FC] tracking-tight mt-1">
                Workstation Preferences & Interaction Controls
              </h1>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Configure 3D MPR multiplanar visualization, natural language voice intent parsing, and runtime parameters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-[#151E2B] border border-[#1C2636] text-[11px] font-mono text-[#94A3B8]">
              v1.0.0 Clinical Workstation
            </span>
          </div>
        </div>
      </section>

      {/* 2. THREE-COLUMN PREFERENCE GRID: VOICE, RENDERING, TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* PANEL A: NATURAL LANGUAGE VOICE CONTROL */}
        <div className="rounded-xl bg-[#101722] border border-[#1C2636] p-6 shadow-medical-card space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#4C8DFF]" />
                <h2 className="text-sm font-semibold text-[#F4F7FC]">Clinical Voice Control Engine</h2>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                isListening 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse' 
                  : 'bg-[#151E2B] text-[#94A3B8] border border-[#1C2636]'
              }`}>
                {isListening ? 'Listening' : 'Standby'}
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Hands-free clinical voice parser with complete test coverage across 529 command variations.
              Controls slice coordinates, MRI modalities, 3D orbits, and application routing.
            </p>

            {/* Audio Feedback Chime Toggle */}
            <div className="p-3.5 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#4C8DFF]" />
                <div>
                  <span className="text-xs font-semibold text-[#F4F7FC] block">Acoustic Execution Feedback</span>
                  <span className="text-[11px] text-[#94A3B8]">Audio chime on recognized voice command</span>
                </div>
              </div>
              <button
                onClick={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
                className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all ${
                  audioFeedbackEnabled
                    ? 'bg-[#4C8DFF] text-white shadow-md shadow-blue-500/20'
                    : 'bg-[#0B1019] text-[#627D98] border border-[#1C2636]'
                }`}
              >
                {audioFeedbackEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Test Voice Command Parser Box */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-mono text-[#94A3B8] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#4C8DFF]" />
                <span>Command Parser Sandbox:</span>
              </label>
              <form onSubmit={handleTestVoiceCommand} className="flex gap-2">
                <input
                  type="text"
                  placeholder='e.g., "Set axial to 50", "Show FLAIR", "Rotate left"'
                  value={voiceTestInput}
                  onChange={(e) => setVoiceTestInput(e.target.value)}
                  className="flex-1 bg-[#0B1019] border border-[#1C2636] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F7FC] placeholder-[#475569] focus:outline-none focus:border-[#4C8DFF] transition-colors"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-[#4C8DFF] hover:bg-[#3B7AE8] text-white text-xs font-mono font-semibold transition-colors shadow-sm shadow-blue-500/20"
                >
                  Parse
                </button>
              </form>

              {voiceTestResult && (
                <div className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 ${
                  voiceTestResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="font-bold flex items-center gap-1.5">
                    {voiceTestResult.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>{voiceTestResult.success ? 'Success: Intent Recognized' : 'Parsing Rejected'}</span>
                  </div>
                  {voiceTestResult.success && (
                    <div className="text-[11px] text-[#F4F7FC]/90">
                      Action Type: <strong className="text-[#38BDF8]">{voiceTestResult.action?.type}</strong> • Label: {voiceTestResult.action?.label}
                    </div>
                  )}
                  {voiceTestResult.error && (
                    <div className="text-[11px] text-rose-400">
                      Reason: {voiceTestResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1C2636] flex items-center justify-between text-xs font-mono text-[#94A3B8]">
            <span>Speech Recognition:</span>
            <span className="text-[#F4F7FC] font-semibold">Web Speech API (Native)</span>
          </div>
        </div>

        {/* PANEL B: WORKSTATION RENDERING PREFERENCES */}
        <div className="rounded-xl bg-[#101722] border border-[#1C2636] p-6 shadow-medical-card space-y-5">
          <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#4C8DFF]" />
              <h2 className="text-sm font-semibold text-[#F4F7FC]">Rendering & MPR Display</h2>
            </div>
            <span className="text-[11px] font-mono text-[#94A3B8]">Multiplanar Orthogonal</span>
          </div>

          <div className="space-y-5 font-mono text-xs">
            {/* Slice step slider */}
            <div className="space-y-2 p-3.5 rounded-lg bg-[#151E2B]/80 border border-[#1C2636]">
              <div className="flex justify-between text-[#94A3B8] text-[11px]">
                <span className="font-sans font-medium text-[#F4F7FC]">Slice Navigation Step:</span>
                <span className="text-[#38BDF8] font-bold font-mono">{sliceStep} slices</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sliceStep}
                onChange={(e) => setSliceStep(parseInt(e.target.value, 10))}
                className="w-full accent-[#4C8DFF] cursor-pointer bg-[#0B1019] h-2 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-[#627D98]">
                <span>1 slice (fine)</span>
                <span>10 slices (fast)</span>
              </div>
            </div>

            {/* Default opacity slider */}
            <div className="space-y-2 p-3.5 rounded-lg bg-[#151E2B]/80 border border-[#1C2636]">
              <div className="flex justify-between text-[#94A3B8] text-[11px]">
                <span className="font-sans font-medium text-[#F4F7FC]">Segmentation Mask Opacity:</span>
                <span className="text-emerald-400 font-bold font-mono">{defaultOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={defaultOpacity}
                onChange={(e) => setDefaultOpacity(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer bg-[#0B1019] h-2 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-[#627D98]">
                <span>10% (translucent)</span>
                <span>100% (opaque)</span>
              </div>
            </div>

            {/* Crosshair toggle */}
            <div className="p-3.5 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] flex items-center justify-between">
              <div>
                <span className="font-sans font-semibold text-[#F4F7FC] block">Synchronized Orthogonal Crosshairs</span>
                <span className="font-sans text-[11px] text-[#94A3B8]">Display planar intersection guides on 2D slices</span>
              </div>
              <button
                onClick={() => setCrosshairVisible(!crosshairVisible)}
                className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all ${
                  crosshairVisible
                    ? 'bg-[#4C8DFF] text-white shadow-md shadow-blue-500/20'
                    : 'bg-[#0B1019] text-[#627D98] border border-[#1C2636]'
                }`}
              >
                {crosshairVisible ? 'VISIBLE' : 'HIDDEN'}
              </button>
            </div>
          </div>
        </div>

        {/* PANEL C: HARDWARE & MODEL BACKEND SPECIFICATIONS (READ-ONLY TELEMETRY) */}
        <div className="rounded-xl bg-[#101722] border border-[#1C2636] p-6 shadow-medical-card space-y-5">
          <div className="flex items-center justify-between border-b border-[#1C2636] pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#4C8DFF]" />
              <h2 className="text-sm font-semibold text-[#F4F7FC]">Hardware & Model Engine Telemetry</h2>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
              serverStatus === 'ready' 
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              {serverStatus === 'ready' ? 'Online' : 'Checking'}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#4C8DFF]" />
                <span className="text-[#94A3B8]">Backend Service:</span>
              </div>
              <span className="text-[#F4F7FC] font-bold">FastAPI (Port 8000)</span>
            </div>

            <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[#94A3B8]">PyTorch & Accelerator:</span>
              </div>
              <span className="text-emerald-400 font-bold">PyTorch 2.11 + CUDA (FP16)</span>
            </div>

            <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="text-[#94A3B8]">DL Framework:</span>
              </div>
              <span className="text-[#38BDF8] font-bold">Project MONAI 1.6</span>
            </div>

            <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[#94A3B8]">Active Checkpoint:</span>
              </div>
              <span className="text-purple-400 font-bold truncate max-w-[170px]" title="checkpoints/adaptive/best.pth">
                checkpoints/adaptive/best.pth
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#151E2B]/80 border border-[#1C2636] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4C8DFF]" />
                <span className="text-[#94A3B8]">Model Architecture:</span>
              </div>
              <span className="text-[#F4F7FC] font-bold">UNETR ViT-B/16</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
