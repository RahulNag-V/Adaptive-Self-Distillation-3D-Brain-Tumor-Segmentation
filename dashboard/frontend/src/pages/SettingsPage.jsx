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
  HardDrive,
  Keyboard,
  Info
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 animate-fadeIn text-[#111827]">
      {/* 1. HEADER */}
      <section className="card-transparent rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#111111]/20 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-white/20 border border-[#111111]/30 text-[#103B5C] shadow-inner">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-white/20 text-[#103B5C] border border-[#111111]/30">
                  Workstation Configuration
                </span>
                <span className="text-xs text-slate-700 font-mono">System Preferences &amp; Telemetry</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#103B5C] tracking-tight mt-1">
                Workstation Preferences &amp; Interaction Controls
              </h1>
              <p className="text-xs text-slate-700 mt-0.5">
                Configure 3D MPR multiplanar visualization, natural language voice intent parsing, and runtime parameters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-white/20 border border-[#111111] text-[11px] font-mono text-[#103B5C] font-semibold shadow-xs">
              v1.0.0 Clinical Workstation
            </span>
          </div>
        </div>
      </section>

      {/* 2. THREE-COLUMN PREFERENCE GRID: VOICE, RENDERING, TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* PANEL A: NATURAL LANGUAGE VOICE CONTROL */}
        <div className="card-transparent rounded-2xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#103B5C]" />
                <h2 className="text-sm font-bold text-[#103B5C]">Clinical Voice Control Engine</h2>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border border-[#111111] ${
                isListening 
                  ? 'bg-emerald-200 text-emerald-950 animate-pulse' 
                  : 'bg-white/20 text-[#103B5C]'
              }`}>
                {isListening ? 'Listening' : 'Standby'}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Hands-free clinical voice parser with complete test coverage across 529 command variations.
              Controls slice coordinates, MRI modalities, 3D orbits, and application routing.
            </p>

            {/* Audio Feedback Chime Toggle */}
            <div className="p-3.5 rounded-xl bg-white/20 border border-[#111111]/30 flex items-center justify-between hover:bg-[rgba(226,247,242,0.45)] transition-colors">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#103B5C]" />
                <div>
                  <span className="text-xs font-bold text-[#103B5C] block">Acoustic Execution Feedback</span>
                  <span className="text-[11px] text-slate-600">Audio chime on recognized voice command</span>
                </div>
              </div>
              <button
                onClick={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
                className={`px-3 py-1 rounded-full font-mono text-xs font-bold border border-[#111111] transition-all cursor-pointer ${
                  audioFeedbackEnabled
                    ? 'bg-[#103B5C] hover:bg-[#0c2c45] text-white shadow-xs'
                    : 'bg-white/20 text-slate-700'
                }`}
              >
                {audioFeedbackEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Test Voice Command Parser Box */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-mono font-semibold text-[#103B5C] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#103B5C]" />
                <span>Command Parser Sandbox:</span>
              </label>
              <form onSubmit={handleTestVoiceCommand} className="flex gap-2">
                <input
                  type="text"
                  placeholder='e.g., "Set axial to 50", "Show FLAIR", "Rotate left"'
                  value={voiceTestInput}
                  onChange={(e) => setVoiceTestInput(e.target.value)}
                  className="flex-1 bg-white/40 border border-[#111111] rounded-lg px-3 py-2 text-xs font-mono text-[#111827] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#103B5C] transition-colors"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-[#103B5C] hover:bg-[#0c2c45] border border-[#111111] text-white text-xs font-mono font-semibold transition-all shadow-xs cursor-pointer"
                >
                  Parse
                </button>
              </form>

              {voiceTestResult && (
                <div className={`p-2.5 rounded-lg border border-[#111111] text-xs font-mono space-y-1 ${
                  voiceTestResult.success 
                    ? 'bg-emerald-100/80 text-emerald-950' 
                    : 'bg-rose-100/80 text-rose-950'
                }`}>
                  <div className="font-bold flex items-center gap-1.5">
                    {voiceTestResult.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                    )}
                    <span>{voiceTestResult.success ? 'Success: Intent Recognized' : 'Parsing Rejected'}</span>
                  </div>
                  {voiceTestResult.success && (
                    <div className="text-[11px] text-slate-800">
                      Action Type: <strong className="text-[#103B5C]">{voiceTestResult.action?.type}</strong> • Label: {voiceTestResult.action?.label}
                    </div>
                  )}
                  {voiceTestResult.error && (
                    <div className="text-[11px] text-rose-900">
                      Reason: {voiceTestResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#111111]/20 flex items-center justify-between text-xs font-mono text-slate-600">
            <span>Speech Recognition:</span>
            <span className="text-[#103B5C] font-bold">Web Speech API (Native)</span>
          </div>
        </div>

        {/* PANEL B: WORKSTATION RENDERING PREFERENCES */}
        <div className="card-transparent rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#103B5C]" />
              <h2 className="text-sm font-bold text-[#103B5C]">Rendering &amp; MPR Display</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-600">Multiplanar Orthogonal</span>
          </div>

          <div className="space-y-5 font-mono text-xs">
            {/* Slice step slider */}
            <div className="space-y-2 p-3.5 rounded-xl bg-white/20 border border-[#111111]/30">
              <div className="flex justify-between text-slate-700 text-[11px]">
                <span className="font-sans font-bold text-[#103B5C]">Slice Navigation Step:</span>
                <span className="text-[#103B5C] font-bold font-mono">{sliceStep} slices</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sliceStep}
                onChange={(e) => setSliceStep(parseInt(e.target.value, 10))}
                className="w-full accent-[#103B5C] cursor-pointer bg-slate-300 h-2 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-sans">
                <span>1 slice (fine)</span>
                <span>10 slices (fast)</span>
              </div>
            </div>

            {/* Default opacity slider */}
            <div className="space-y-2 p-3.5 rounded-xl bg-white/20 border border-[#111111]/30">
              <div className="flex justify-between text-slate-700 text-[11px]">
                <span className="font-sans font-bold text-[#103B5C]">Segmentation Mask Opacity:</span>
                <span className="text-[#103B5C] font-bold font-mono">{defaultOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={defaultOpacity}
                onChange={(e) => setDefaultOpacity(parseInt(e.target.value, 10))}
                className="w-full accent-[#103B5C] cursor-pointer bg-slate-300 h-2 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-sans">
                <span>10% (translucent)</span>
                <span>100% (opaque)</span>
              </div>
            </div>

            {/* Crosshair toggle */}
            <div className="p-3.5 rounded-xl bg-white/20 border border-[#111111]/30 flex items-center justify-between hover:bg-[rgba(226,247,242,0.45)] transition-colors">
              <div>
                <span className="font-sans font-bold text-[#103B5C] block">Synchronized Orthogonal Crosshairs</span>
                <span className="font-sans text-[11px] text-slate-600">Display planar intersection guides on 2D slices</span>
              </div>
              <button
                onClick={() => setCrosshairVisible(!crosshairVisible)}
                className={`px-3 py-1 rounded-full font-mono text-xs font-bold border border-[#111111] transition-all cursor-pointer ${
                  crosshairVisible
                    ? 'bg-[#103B5C] hover:bg-[#0c2c45] text-white shadow-xs'
                    : 'bg-white/20 text-slate-700'
                }`}
              >
                {crosshairVisible ? 'VISIBLE' : 'HIDDEN'}
              </button>
            </div>
          </div>
        </div>

        {/* PANEL C: HARDWARE & MODEL BACKEND SPECIFICATIONS (READ-ONLY TELEMETRY) */}
        <div className="card-transparent rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#103B5C]" />
              <h2 className="text-sm font-bold text-[#103B5C]">Hardware &amp; Model Engine Telemetry</h2>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-[#111111] ${
              serverStatus === 'ready' 
                ? 'bg-emerald-200 text-emerald-950' 
                : 'bg-amber-200 text-amber-950'
            }`}>
              {serverStatus === 'ready' ? 'Online' : 'Checking'}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-white/20 border border-[#111111]/30 flex justify-between items-center hover:bg-[rgba(226,247,242,0.45)] transition-colors">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#103B5C]" />
                <span className="text-slate-700">Backend Service:</span>
              </div>
              <span className="text-[#103B5C] font-bold">FastAPI (Port 8000)</span>
            </div>

            <div className="p-3 rounded-xl bg-white/20 border border-[#111111]/30 flex justify-between items-center hover:bg-[rgba(226,247,242,0.45)] transition-colors">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#103B5C]" />
                <span className="text-slate-700">PyTorch &amp; Accelerator:</span>
              </div>
              <span className="text-[#103B5C] font-bold">PyTorch 2.11 + CUDA (FP16)</span>
            </div>

            <div className="p-3 rounded-xl bg-white/20 border border-[#111111]/30 flex justify-between items-center hover:bg-[rgba(226,247,242,0.45)] transition-colors">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#103B5C]" />
                <span className="text-slate-700">DL Framework:</span>
              </div>
              <span className="text-[#103B5C] font-bold">Project MONAI 1.6</span>
            </div>

            <div className="p-3 rounded-xl bg-white/20 border border-[#111111]/30 flex justify-between items-center hover:bg-[rgba(226,247,242,0.45)] transition-colors">
              <div className="flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-[#103B5C]" />
                <span className="text-slate-700">Active Checkpoint:</span>
              </div>
              <span className="text-[#103B5C] font-bold truncate max-w-[170px]" title="checkpoints/adaptive/best.pth">
                checkpoints/adaptive/best.pth
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/20 border border-[#111111]/30 flex justify-between items-center hover:bg-[rgba(226,247,242,0.45)] transition-colors">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#103B5C]" />
                <span className="text-slate-700">Model Architecture:</span>
              </div>
              <span className="text-[#103B5C] font-bold">UNETR ViT-B/16</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. WORKSTATION KEYBOARD & GESTURE SHORTCUTS CHEAT SHEET */}
      <section className="card-transparent rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#111111]/20 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#103B5C]" />
            <h2 className="text-sm font-bold text-[#103B5C]">Radiology Workstation Shortcuts &amp; Interaction Guide</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-600">Rapid Access Keys</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-white/20 border border-[#111111]/30 hover:bg-[rgba(226,247,242,0.65)] transition-colors space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#103B5C]">Toggle Voice Input</span>
              <kbd className="px-2 py-0.5 rounded bg-white/40 border border-[#111111]/40 font-mono text-[11px] text-[#103B5C] font-bold shadow-xs">Ctrl + \</kbd>
            </div>
            <p className="text-[11px] text-slate-700">Activate or pause hands-free speech recognition engine.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/20 border border-[#111111]/30 hover:bg-[rgba(226,247,242,0.65)] transition-colors space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#103B5C]">Focus 3D Viewer</span>
              <kbd className="px-2 py-0.5 rounded bg-white/40 border border-[#111111]/40 font-mono text-[11px] text-[#103B5C] font-bold shadow-xs">Ctrl + V</kbd>
            </div>
            <p className="text-[11px] text-slate-700">Instantly route focus to the 3D surface mesh viewport.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/20 border border-[#111111]/30 hover:bg-[rgba(226,247,242,0.65)] transition-colors space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#103B5C]">Viewport Layouts</span>
              <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/40 border border-[#111111]/40 font-mono text-[10px] text-[#103B5C] font-bold shadow-xs">1</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/40 border border-[#111111]/40 font-mono text-[10px] text-[#103B5C] font-bold shadow-xs">2</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/40 border border-[#111111]/40 font-mono text-[10px] text-[#103B5C] font-bold shadow-xs">3</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/40 border border-[#111111]/40 font-mono text-[10px] text-[#103B5C] font-bold shadow-xs">4</kbd>
              </div>
            </div>
            <p className="text-[11px] text-slate-700">Quickly switch between Quad MPR, Axial 2D, 3D Mesh, and Sagittal.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/20 border border-[#111111]/30 hover:bg-[rgba(226,247,242,0.65)] transition-colors space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#103B5C]">Clear Active Tool</span>
              <kbd className="px-2 py-0.5 rounded bg-white/40 border border-[#111111]/40 font-mono text-[11px] text-slate-700 font-bold shadow-xs">Esc</kbd>
            </div>
            <p className="text-[11px] text-slate-700">Deselect active annotation brush and return to pan/crosshair mode.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
